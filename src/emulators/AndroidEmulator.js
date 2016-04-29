import { spawn } from 'child_process';
import path from 'path';
import * as net from 'net';

import ADB from '../adb';
import EmulatorBase from './EmulatorBase';
import * as sdk from '../sdk';
import * as util from '../util';

// All emulators have their console ports opened on even ports between ports 5554 and 5584
const DEFAULTPORT = 5554;
const PORTLIMIT = 5584;
const emuRegExp = /^emulator\-(\d+)$/;

/**
 * Provides methods to detect and interact with Android Emulator.
 *
 * @class
 * @constructor
 */
export default class AndroidEmulator extends EmulatorBase {
	/**
	 * Creates an Android Emulator object.
	 *
	 * @param {Object} options - the android emulator properties.
	 */
	constructor(options) {
		super();
		this.type 		= 'avd';
		this.id 		= options.id;
		this.name 		= options.name;
		this.device 	= options.device;
		this.path 		= options.path;
		this.target 	= options.target;
		this.abi 		= options.abi;
		this.skin 		= options.skin;
		this.googleApis = options.googleApis;
		this.sdkVersion = options['sdk-version'];
		this.apiLevel 	= options['api-level'];
	}

	/**
	 * Detects all existing Android Virtual Devices.
	 *
	 * @param {Object} [opts] - An object with various params.
	 * @returns {Promise}
	 * @access public
	 */
	static detect(opts = {}) {
		let results = [];

		return sdk
			.detect(opts)
			.then(results => results.sdks.shift())
			.then(sdk => util.run(sdk.executables.android, ['list', 'avd']))
			.then(({ code, stdout, stderr }) => {
				if (code) {
					return null;
				}

				const basedOnAPIRegex = /^(?:Based on )?Android ([^\s]+) \(API level ([^)]+)\)$/;
				const keyValRegex = /^\s*(.+)\: (.+)$/;

				// parse the avds
				for (let avd of stdout.split(/\-\-\-\-\-\-+\n/)) {
					avd = avd.trim();
					if (avd) {
						const info = { };
						let m;
						let key;

						for (let line of avd.split('\n')) {
							line = line.trim();
							if (m = line.match(keyValRegex)) {
								key = m[1].toLowerCase().trim().replace(/\s/g, '-');
								if (key === 'tag/abi') {
									info['abi'] = m[2].replace(/^\w+\//, '');
								} else {
									info[key] = m[2];
								}
							} else if (m = line.match(basedOnAPIRegex)) {
								info['based-on'] = {
									'android-version': m[1],
									'api-level': ~~m[2]
								};
							}
						}

						if (info.path && info.sdcard && !util.existsSync(info.sdcard)) {
							const sdcardFile = path.join(info.path, 'sdcard.img');
							info.sdcard = util.existsSync(sdcardFile) ? sdcardFile : null;
						}

						info.googleApis = /google/i.test(info.target);

						if (info['based-on'] && info['based-on']['android-version']) {
							info['sdk-version'] = info['based-on']['android-version'];
						} else if (info.target) {
							if (m = info.target.match(basedOnAPIRegex)) {
								info['sdk-version'] = m[1];
								info['api-level'] = m[2];
							}
						}

						results.push(new AndroidEmulator(info));
					}
				}
			})
			.then(() => results);
	}

	/**
	 * Detects if a specific device name is an Android emulator.
	 *
	 * @param {String} deviceId - The id of the emulator.
	 * @param {Object} opts - Various options.
	 * @returns {Promise}
	 * @access public
	 */
	static isEmulator(deviceId, opts = {}) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		const port = deviceId.match(emuRegExp);
		if (!port) {
			return Promise.resolve(false);
		}

		return Promise.all([
			AndroidEmulator.getAvdName(+port[1]),
			AndroidEmulator.detect(opts)
		])
		.then(([avdName, avds]) => avds && avds.filter(a => a.name === avdName).shift());
	}

	/**
	 * Detects if a specific Android Virtual Device is running and if so, returns
	 * the emulator AVD definition object.
	 *
	 * @param {Object} opts - Various options.
	 * @returns {Promise}
	 */
	isRunning(opts = {}) {
		return new ADB(opts)
			.devices()
			.then(devices => {
				// if there are no devices, then it can't possibly be running
				if (!devices || !devices.length) return Promise.resolve(false);
				return devices.filter(e => e && e.name === this.name).shift() || false;
			});
	}

	/**
	 * Launches the specified Android emulator.
	 *
	 * @param {Object} [opts] - Emulator start options.
	 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Android environment detection cache and re-queries the system.
	 * @param {Number} [opts.port=5560] - The TCP port the emulator will use for the console.
	 * @param {String} [opts.sdcard] - A path to the virtual SD card to use with the emulator.
	 * @param {Number} [opts.partitionSize=128] - The emulator's system/data partition size in MBs.
	 * @param {Array|String} [opts.stdio] - The stdio configuration to pass into spawn().
	 * @param {Boolean} [opts.detached] - The detached flag to pass into spawn().
	 * @param {Array|String} [opts.extraArgs] - Additional arguments to be passed to emulator.
	 * @returns {Promise}
	 * @access public
	 */
	launch(opts = {}) {
		if (this && !this.name) {
			return Promise.reject(new Error('Expected the emulator object to have a "name" property.'));
		}

		let port = opts.port || DEFAULTPORT;
		let emulatorExe;

		return sdk
			.detect(opts)
			.then(results => results.sdks.shift())
			.then(sdk => {
				emulatorExe = sdk.executables.emulator;
				const findPort = (p) => {
					return AndroidEmulator.checkPort(p)
						.then(result => {
							if (result) {
								return result;
							} else {
								this.emit('message', `Port "${p}" is not available, keep scanning.`);
								return findPort(p + 2);
							}
						});
				};

				return findPort(port)
					.then(result => {
						this.emit('message', `Found port "${result}" for "${this.name}"`);
						return result;
					});
			})
			.then(port => {
				this.emit('message', `Using port "${port}"`);

				// default args
				let args = [
					'-avd', this.name,                                // use a specific android virtual device
					'-port', port,                                   // TCP port that will be used for the console
					'-no-boot-anim',                                 // disable animation for faster boot
					'-partition-size', opts.partitionSize || 128     // system/data partition size in MBs
				];

				let sdcard = opts.sdcard || this.sdcard;
				sdcard && args.push('-sdcard', sdcard);              // SD card image (default <system>/sdcard.img

				if (Array.isArray(opts.extraArgs)) {
					args.push.apply(args, opts.extraArgs);
				}

				// set system property on boot
				if (opts.props && typeof opts.props === 'object') {
					for (let prop of Object.keys(opts.props)) {
						args.push('-prop', `${prop} = ${opts.props[prop]}`);
					}
				}

				// pass arguments to qemu
				if (Array.isArray(opts.qemu)) {
					args.push('-qemu');
					args = args.concat(opts.qemu);
				}

				let emuopts = {
					detached: opts.hasOwnProperty('detached') ? !!opts.detached : true,
					stdio: opts.stdio || 'ignore'
				};
				opts.cwd && (emuopts.cwd = opts.cwd);
				opts.env && (emuopts.env = opts.env);
				opts.uid && (emuopts.uid = opts.uid);
				opts.gid && (emuopts.gid = opts.gid);

				this.emit('message', `Starting emulator "${this.name}" on port "${port}"`);

				let child = this.child = spawn(emulatorExe, args, emuopts);

				this.id = `emulator-${port}`;
				this.pid = child.pid;
				this.port = port;

				child.stdout && child.stdout.on('data', data => this.emit('stdout', data));
				child.stderr && child.stderr.on('data', data => this.emit('stderr', data));
				child.on('error', err => this.emit('error', err));
				child.on('close', (code, signal) => this.emit('exit', code, signal));

				child.unref();
			})
			.then(() => {
				this.emit('message', 'Android emulator is starting, monitoring boot state...');
				return this.checkBooted(opts);
			})
			.catch(console.log);
	}

	/**
	 * Stops the specified Android emulator.
	 *
	 * @param {Object} opts - Various options.
	 * @returns {Promise}
	 * @access public
	 */
	stop(opts = {}) {
		if (!emuRegExp.test(this.id)) {
			return Promise.reject(new Error(`Invalid emulator ID: "${this.id}"`));
		}

		const args = [
			'-s',
			this.id,
			'emu',
			'kill'
		];

		return sdk
			.detect(opts)
			.then(results => results.sdks.shift())
			.then(sdk => util.run(sdk.executables.adb, args));
	}

	/**
	 * Get the name of the emulator connected of a specific port.
	 *
	 * @param {Number} port - The TCP port the emulator used.
	 * @returns {Promise}
	 * @access private
	 */
	static getAvdName(port) {
		if (isNaN(port)) {
			return Promise.reject(new TypeError('Expected port to be a number.'));
		}

		return new Promise((resolve, reject) => {
			let state = 'connecting';
			let avdName = null;
			let buffer = '';
			const responseRegExp = /(.*)\r\nOK\r\n/;
			let socket = net.connect({ port: port });

			socket.on('data', data => {
				buffer += data.toString();
				const m = buffer.match(responseRegExp);
				if (!m || state === 'done') {
					// do nothing
				} else if (state === 'connecting') {
					state = 'sending command';
					buffer = '';
					socket.write('avd name\n');
				} else if (state === 'sending command') {
					state = 'done';
					avdName = m[1].trim();
					socket.end('quit\n');
				}
			});

			socket.on('end', () => resolve(avdName));
			socket.on('error', () => resolve());
		});
	}

	/**
	 * Find a free port for the android emulator.
	 *
	 * @param {Number} port - The TCP port the emulator wants to listen on.
	 * @returns {Promise}
	 * @access private
	 */
	static checkPort(port) {
		if (isNaN(port)) {
			return Promise.reject(new TypeError('Expected port to be a number.'));
		}

		if (port > PORTLIMIT) {
			return Promise.reject(new Error('Unable to find a free port between 5554 and 5584'));
		}

		return new Promise((resolve, reject) => {
			let socket = net.connect({ port: port }, () => {
				socket.end();
				resolve();
			});

			socket.on('end', err => {
				if (socket) {
					socket.end();
					socket = null;
				}
			});

			socket.on('error', err => {
				// port available!
				if ('ECONNREFUSED' === err.errno) {
					if (socket) {
						socket.end();
						socket = null;
					}
					resolve(port);
				}
			});
		});
	}
}
