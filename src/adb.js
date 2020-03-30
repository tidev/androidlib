import appcdLogger from 'appcd-logger';
import Connection from './connection';
import Device from './device';
import options from './options';

import { EventEmitter } from 'events';
import { get, tailgate, sleep } from 'appcd-util';
import { getSDKs } from './sdk';
import { isEmulatorDevice } from './emulator';
import { run, which } from 'appcd-subprocess';

const { log } = appcdLogger('androidlib:adb');
const { highlight } = appcdLogger.styles;

const getpropRegExp = /^\[([^\]]*)\]: \[(.*)\]\s*$/;

/**
 * Exposes an event emitter for device changes and a method to stop tracking.
 */
export class TrackDeviceHandle extends EventEmitter {
	stop() {
		// this method is meant to be overridden
	}
}

/**
 * Locates adb by scanning the system path, then a list of search paths from the options.
 *
 * @returns {Promise<String>|null}
 */
export async function findAdb() {
	try {
		return await which('adb', {
			path: get(options, 'env.path')
		});
	} catch (e) {
		log('Didn\'t find adb in the system path, scanning for android sdks');
	}

	// find an sdk that has a valid adb
	const sdks = await getSDKs(true);
	for (const sdk of sdks) {
		const { adb } = sdk.platformTools.executables;
		if (adb) {
			return adb;
		}
	}

	log('Didn\'t find adb in search paths');
	return null;
}

/**
 * Connects to the adb server.
 *
 * @returns {Promise<Connection>}
 */
export async function connect() {
	const port = get(options, 'adb.port') || 5037;
	const conn = new Connection(port);

	try {
		log(`Attempting to connect to adb on port ${port}`);
		return await conn.connect();
	} catch (err) {
		if (err.code !== 'ECONNREFUSED') {
			throw err;
		}
	}

	log('adb not running');
	await startServer();
	return await conn.connect();
}

/**
 * Attempts to find the adb executable, then start the adb server.
 *
 * @returns {Promise}
 */
export async function startServer() {
	return tailgate('adb:startServer', async () => {
		const adb = await findAdb();
		if (!adb) {
			throw new Error('Unable to find and start adb');
		}

		const args = [ 'start-server' ];
		const port = get(options, 'adb.port') || 5037;
		if (port) {
			args.unshift('-P', port);
		}

		try {
			log(`Running: ${highlight(`${adb} ${args.join(' ')}`)}`);
			await run(adb, args);
		} catch ({ code, stderr }) {
			if (stderr) {
				const p = stderr.indexOf('Android Debug Bridge');
				if (p !== -1) {
					throw new Error(`Failed to start adb (code ${code}): ${stderr.substring(0, p - 1).trim()}`);
				}
			}
			throw new Error(`Failed to start adb (code ${code})`);
		}

		await sleep(250);
	});
}

/**
 * Attempts to find the adb executable, then stop the adb server.
 *
 * @returns {Promise}
 */
export async function stopServer() {
	const adb = await findAdb();
	if (!adb) {
		throw new Error('Unable to find and start adb');
	}

	const args = [ 'kill-server' ];
	const port = get(options, 'adb.port') || 5037;
	if (port) {
		args.unshift('-P', port);
	}

	try {
		log(`Running: ${highlight(`${adb} ${args.join(' ')}`)}`);
		await run(adb, args);
	} catch ({ code, stderr }) {
		if (stderr) {
			const p = stderr.indexOf('Android Debug Bridge');
			if (p !== -1) {
				throw new Error(`Failed to start adb (code ${code}): ${stderr.substring(0, p - 1).trim()}`);
			}
		}
		throw new Error(`Failed to start adb (code ${code})`);
	}
}

/**
 * Retrieves the adb version.
 *
 * @returns {Promise<String>}
 */
export async function version() {
	const conn = await connect();
	const result = await conn.exec('host:version');
	if (!result) {
		throw new Error('adb version is not available');
	}
	return `1.0.${parseInt(result, 16)}`;
}

/**
 * Runs the specified command on the Android emulator/device.
 *
 * @param {String} id - The id of the device or emulator.
 * @param {String} cmd - The command to run.
 * @returns {Promise<Buffer>}
 */
export async function shell(id, cmd) {
	if (typeof id !== 'string' || !id) {
		throw new TypeError('Expected device ID to be a string');
	}

	if (typeof cmd !== 'string' || !cmd) {
		throw new TypeError('Expected command to be a string');
	}

	const conn = await connect();
	await conn.exec(`host:transport:${id}`);
	return await conn.exec(`shell:${cmd.replace(/^shell:/, '')}`, {
		// for some reason, we no longer need to set bufferUntilClose to true for adb 1.0.40
		bufferUntilClose: true,
		noLength: true
	});
}

/**
 * Retrieves a list of connected devices and emulators.
 *
 * @returns {Promise<Array.<Object>>}
 */
export async function devices() {
	const conn = await connect();
	const results = await conn.exec('host:devices', { waitForData: true });
	return parseDevices(results);
}

/**
 * Retrieves a list of all devices and emulators, then listens for changes to device list.
 * Connection will emit an `update` event when the device list is changed.
 *
 * @returns {TrackDeviceHandle}
 */
export function trackDevices() {
	const handle = new TrackDeviceHandle();

	setImmediate(async () => {
		try {
			const conn = await connect();

			handle.stop = function () {
				if (!this.stopped) {
					this.stopped = true;
					conn.end();
				}
			}.bind(handle);

			conn
				.on('data', async (data) => {
					try {
						const devices = await parseDevices(data);
						if (!handle.stopped) {
							handle.emit('change', devices);
						}
					} catch (err) {
						handle.emit('error', err);
					}
				})
				.on('close', () => handle.emit('close'))
				.on('error', err => handle.emit('error', err))
				.exec('host:track-devices', { keepConnection: true, waitForData: true })
				.catch(err => handle.emit('error', err));
		} catch (err) {
			handle.emit('error', err);
		}
	});

	return handle;
}

/**
 * Parses the device list, and fetches additional device info.
 *
 * @param {Buffer|String} data - The buffer containing the list of devices.
 * @returns {Promise<Array<Device|Emulator>>}
 */
async function parseDevices(data = '') {
	const devices = [];

	for (const item of data.toString().split(/\r?\n/)) {
		const p = item.split(/\s+/);
		if (p.length > 1) {
			const info = {
				id:    p.shift(),
				state: p.shift()
			};

			try {
				const data = await shell(info.id, 'getprop');

				for (const line of data.toString().split(/\r?\n/)) {
					const m = line.match(getpropRegExp);
					if (m && !Object.prototype.hasOwnProperty.call(info, m[1])) {
						info[m[1]] = m[2];
					}
				}
			} catch (e) {
				// squelch
			}

			devices.push(await isEmulatorDevice(info) || new Device(info));
		}
	}

	return devices;
}
