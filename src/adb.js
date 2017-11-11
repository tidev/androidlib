import appcdLogger from 'appcd-logger';
import Connection from './connection';
import Device from './devices';
import options from './options';

import { get, sleep } from 'appcd-util';
import { EventEmitter } from 'events';
import { getSDKs } from './sdk';
import { run, which } from 'appcd-subprocess';

const { log } = appcdLogger('androidlib:adb');
const { highlight } = appcdLogger.styles;

/**
 * Exposes an event emitter for device changes and a method to stop tracking.
 */
export class TrackDeviceHandle extends EventEmitter {
	stop() {
		// noop
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
async function connect() {
	const port = get(options, 'adb.port') || 5037;
	const conn = new Connection(port);

	try {
		log(`Attempting to connect to adb on port ${port}`);
		await conn.connect();
	} catch (err) {
		if (err.errno !== 'ECONNREFUSED') {
			throw err;
		}
		log('adb not running');
		await startServer();
		await conn.connect();
	}

	return conn;
}

/**
 * Attempts to find the adb executable, then start the adb server.
 *
 * @returns {Promise}
 */
export async function startServer() {
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
 * Retrieves a list of connected devices and emulators.
 *
 * @returns {Promise<Array.<Object>>}
 */
export async function devices() {
	const conn = await connect();
	const results = await conn.exec('host:devices');
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
			let conn = await connect();
			const results = await conn.exec('host:devices');
			handle.emit('devices', await parseDevices(results));

			conn = await connect();

			handle.stop = function () {
				if (!this.stopped) {
					this.stopped = true;
					conn.end();
				}
			}.bind(handle);

			conn
				.on('data', async (data) => {
					try {
						handle.emit('devices', await parseDevices(data));
					} catch (err) {
						handle.emit('error', err);
					}
				})
				.on('error', err => handle.emit('error', err))
				.exec('host:track-devices', { keepConnection: true })
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
 * @returns {Promise}
 */
async function parseDevices(data = '') {
	const devices = [];
	// const final = [];

	for (const item of data.toString().split(/\r?\n/)) {
		const p = item.split(/\s+/);
		if (p.length > 1) {
			devices.push(new Device({
				id: p.shift(),
				state: p.shift()
			}));
		}
	}

	return devices;

	// return Promise
	// 	.all(devices.map(device => {
	// 		return this
	//          .shell(device.id, 'getprop')
	// 			.then(data => {
	// 				const re = /^\[([^\]]*)\]: \[(.*)\]\s*$/;
	// 				const lines = data.toString().split(/\r?\n/);
	// 				for (const line of lines) {
	// 					var m = line.match(re);
	// 					if (m) {
	// 						const key = m[1];
	// 						const value = m[2];
	// 						switch (key) {
	// 							case 'ro.product.model.internal':
	// 								device.modelnumber = value;
	// 								break;
	// 							case 'ro.build.version.release':
	// 							case 'ro.build.version.sdk':
	// 							case 'ro.product.brand':
	// 							case 'ro.product.device':
	// 							case 'ro.product.manufacturer':
	// 							case 'ro.product.model':
	// 							case 'ro.product.name':
	// 								device[key.split('.').pop()] = value;
	// 								break;
	// 							case 'ro.genymotion.version':
	// 								device.genymotion = value;
	// 								break;
	// 							default:
	// 								if (key.indexOf('ro.product.cpu.abi') === 0) {
	// 									Array.isArray(device.abi) || (device.abi = []);
	// 									for (let abi of value.split(',')) {
	// 										abi = abi.trim();
	// 										if (device.abi.indexOf(abi) === -1) {
	// 											device.abi.push(abi);
	// 										}
	// 									}
	// 								}
	// 								break;
	// 						}
	// 					}
	// 				}
	//
	// 				return isEmulator(device.id)
	// 					.then(emu => {
	// 						if (emu) {
	// 							delete device.name;
	// 							Object.assign(emu, device);
	// 							final.push(emu);
	// 						} else {
	// 							final.push(new Device(device));
	// 						}
	// 					});
	// 			});
	// 	}))
	// 	.then(() => final);
}
