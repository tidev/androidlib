import { EventEmitter } from 'events';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { spawn } from 'child_process';

import { Connection } from './connection';
import { EmulatorManager } from './emulator';
import * as sdk from './sdk';
import * as util from './util';

/**
 * Creates an ADB object.
 *
 * @class
 * @extends EventEmitter
 * @classdesc Provides methods to interact with the Android Debug Bridge (ADB).
 * @constructor
 */
export class ADB extends EventEmitter {
	constructor(opts = {}) {
		super();
		this.opts = opts;
	}

	/**
	 * Returns the version of the ADB server.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	version() {
		return new Connection(this)
			.exec('host:version')
			.then(data => '1.0.' + parseInt(data, 16));
	}

	/**
	 * Runs the specified command on the Android emulator/device.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} cmd - The command to run.
	 * @returns {Promise}
	 * @access public
	 */
	shell(deviceId, cmd) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		if (typeof cmd !== 'string' || !cmd) {
			return Promise.reject(new TypeError('Expected command to be a string.'));
		}

		const conn = new Connection(this);
		return conn
			.exec('host:transport:' + deviceId)
			.then(data => conn.exec(`shell: ${cmd.replace(/^shell\:/, '')}`, { bufferUntilClose: true, noLength: true }));
	}

	/**
	 * Attempts to find the adb executable, then start the adb server.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	startServer() {
		return sdk
			.detect(this.opts)
			.then(result => util.run(result.sdk.executables.adb, ['start-server']));
	}

	/**
	 * Attempts to find the adb executable, then stop the adb server.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	stopServer() {
		return sdk
			.detect(this.opts)
			.then(result => util.run(result.sdk.executables.adb, ['kill-server']));
	}

	/**
	 * Forwards the specified device/emulator's socket connections to the destination.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} src - The source port in the format "tcp:<port>".
	 * @param {String} dest - The destination port in the format "tcp:<port>" or "jdwp:<pid>".
	 * @returns {Promise}
	 * @access public
	 */
	forward(deviceId, src, dest) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		src = util.expandPath(src);
		if (!util.existsSync(src)) {
			return Promise.reject(new TypeError(`Source file "${src}" does not exist.`));
		}

		return sdk
			.detect(this.opts)
			.then(result => util.run(result.sdk.executables.adb, ['-s', deviceId, 'forward', src, dest]));
	}

	/**
	 * Pushes a single file to a device or emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} src - The source file to copy to the device.
	 * @param {String} dest - The destination to write the file.
	 * @returns {Promise}
	 * @access public
	 */
	push(deviceId, src, dest) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		src = util.expandPath(src);
		if (!util.existsSync(src)) {
			return Promise.reject(new TypeError(`Source file "${src}" does not exist.`));
		}

		return sdk
			.detect(this.opts)
			.then(result => util.run(result.sdk.executables.adb, ['-s', deviceId, 'push', src, dest]));
	}

	/**
	 * Pulls a single file from a device or emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} src - The source file to copy from the device.
	 * @param {String} dest - The destination to write the file.
	 * @returns {Promise}
	 * @access public
	 */
	pull(deviceId, src, dest) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		if (typeof dest !== 'string' || !dest) {
			return Promise.reject(new TypeError('Expected destination to be a string.'));
		}

		src = util.expandPath(src);
		if (!util.existsSync(src)) {
			return Promise.reject(new TypeError(`Source file "${src}" does not exist.`));
		}

		dest = util.expandPath(dest);
		const destDir = path.dirname(dest);

		mkdirp.sync(destDir);

		return sdk
			.detect(this.opts)
			.then(result => util.run(result.sdk.executables.adb, ['-s', deviceId, 'pull', src, dest]));
	}

	/**
	 * Returns the pid of the specified app for the specified device/emulator, if running.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} appId - The application's id.
	 * @returns {Promise}
	 * @access public
	 */
	getPid(deviceId, appId) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		if (typeof appId !== 'string' || !appId) {
			return Promise.reject(new TypeError('Expected app ID to be a string.'));
		}

		return this
			.shell(deviceId, 'ps')
			.then(data => {
				if (data) {
					const lines = data.toString().split('\n');
					for (let i = 0, j = lines.length; i < j; i++ ) {
						let columns = lines[i].trim().split(/\s+/);
						if (columns.pop() === appId) {
							return parseInt(columns[1]);
						}
					}
				}
				return 0;
			});
	}

	/**
	 * Installs an app to the specified device/emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} apkFile - The application apk file to install.
	 * @param {Object} [opts] - Install options.
	 * @returns {Promise}
	 * @access public
	 */
	installApp(deviceId, apkFile, opts = {}) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		apkFile = util.expandPath(apkFile);
		if (!util.existsSync(apkFile)) {
			return Promise.reject(new TypeError(`APK file "${apkFile}" does not exist.`));
		}

		return this
			.devices()
			.then(devices => {
				if (!devices.some(d => d.id === deviceId)) {
					return Promise.reject(new Error('Device not found.'));
				}
			})
			.then(sdk.detect)
			.then(result => util.run(result.sdk.executables.adb, ['-s', deviceId, 'install', '-r', apkFile]));
	}

	/**
	 * Starts an application on the specified device/emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} appId - The application's id.
	 * @param {String} activity - The name of the activity to run.
	 * @returns {Promise}
	 * @access public
	 */
	startApp(deviceId, appId, activity) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		if (typeof appId !== 'string' || !appId) {
			return Promise.reject(new TypeError('Expected app ID to be a string.'));
		}

		if (typeof activity !== 'string' || !activity) {
			return Promise.reject(new TypeError('Expected activity name to be a string.'));
		}

		return this.shell(deviceId, `am start -n ${appId} /. ${activity.replace(/^\./, '')}`);
	}

	/**
	 * Stops an application on the specified device/emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} appId - The application's id.
	 * @returns {Promise}
	 * @access public
	 */
	stopApp(deviceId, appId) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string.'));
		}

		if (typeof appId !== 'string' || !appId) {
			return Promise.reject(new TypeError('Expected app ID to be a string.'));
		}

		return this
			.getPid(deviceId, appId)
			.then(pid => this.shell(deviceId, `am force-stop ${appId}`));
	}

	/**
	 * Retrieves a list of connected devices and emulators.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	devices() {
		return new Connection(this)
			.exec('host:devices')
			.then(data => this.parseDevices(data));
	}

	/**
	 * Streams output from logcat into the specified handler until the adb logcat
	 * process ends.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @returns {EventEmitter} Emits events `message`, `error` and `close`.
	 * @access public
	 */
	logcat(deviceId) {
		const emitter = new EventEmitter;
		sdk
			.detect(this.opts)
			.then(result => {
				return new Promise((resolve, reject) => {
					const args = [
						'-s',
						deviceId,
						'logcat',
						'-v',
						'brief',
						'-b',
						'main'
					];
					const child = spawn(result.sdk.executables.adb, args);

					child.stdout.on('data', data => emitter.emit('message', data.toString()));
					child.stderr.on('data', data => emitter.emit('error', data.toString()));
					child.on('close', code => emitter.emit('close', code));
				});
			});

		return emitter;
	}


	/**
	 * Parses the device list, and fetches additional device info.
	 *
	 * @param {Buffer|String} data - The buffer containing the list of devices.
	 * @returns {Promise}
	 * @access private
	 */
	parseDevices(data = '') {
		const devices = [];
		const emuMgr = new EmulatorManager(this.opts);

		data.toString().split('\n').forEach(item => {
			let p = item.split(/\s+/);
			if (p.length > 1) {
				devices.push({
					id: p.shift(),
					state: p.shift()
				});
			}
		});

		return Promise
			.all(devices.map(device => {
				const deviceId = device.id;
				return this
					.shell(deviceId, 'cat /system/build.prop')
					.then(data => {
						data.toString().split('\n').forEach(line => {
							const parts = line.split('=');
							if (parts.length > 1) {
								const key = parts[0].trim();
								const value = parts[1].trim();
								switch (key) {
									case 'ro.product.model.internal':
										device.modelnumber = value;
										break;
									case 'ro.build.version.release':
									case 'ro.build.version.sdk':
									case 'ro.product.brand':
									case 'ro.product.device':
									case 'ro.product.manufacturer':
									case 'ro.product.model':
									case 'ro.product.name':
										device[key.split('.').pop()] = value;
										break;
									case 'ro.genymotion.version':
										device.genymotion = value;
										break;
									default:
										if (key.indexOf('ro.product.cpu.abi') == 0) {
											Array.isArray(device.abi) || (device.abi = []);
											value.split(',').forEach(abi => {
												abi = abi.trim();
												if (device.abi.indexOf(abi) === -1) {
													device.abi.push(abi);
												}
											});
										}
										break;
								}
							}
						});

						return emuMgr
							.isEmulator(deviceId)
							.then(emu => device.emulator = emu || null);
					});
			}))
			.then(() => devices);
	}
}
