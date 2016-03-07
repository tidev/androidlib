import 'babel-polyfill';
import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import wrench from 'wrench';
import { spawn } from 'child_process';

import { Connection } from './connection';
import { Emulator, EmulatorManager } from './emulator';
import * as util from './util';
import * as sdk from './sdk';

/**
 * Debug flag that is enabled via the android.debugadb setting.
 */
let DEBUG = false;

/**
 * Creates an ADB object.
 * @class
 * @classdesc Provides methods to interact with the Android Debug Bridge (ADB).
 * @constructor
 */
export class ADB {
	constructor(config) {
		this.config = config;
		if (config && config.get('android.debugadb', false)) {
			DEBUG = true;
		}
	}

	/**
	 * Returns the version of the ADB server.
	 * @returns {Promise}
	 */
	version() {
		return new Connection(this)
			.exec('host:version')
			.then(data => {
				return '1.0.' + parseInt(data, 16);
			})
			.catch(err => {
				console.log('adb version: ', err);
			});
	}

	/**
	 * Runs the specified command on the Android emulator/device. Note that ADB
	 * converts all \n to \r\n. So data will probably be larger than the original
	 * output on the device.
	 * @param {String} cmd - The command to run
	 * @returns {Promise}
	 */
	shell(deviceId, cmd) {
		const conn = new Connection(this);
		return conn
			.exec('host:transport:' + deviceId)
			.then(data => {
				return conn.exec('shell:' + cmd.replace(/^shell\:/, ''), { bufferUntilClose: true, noLength: true });
			})
			.then(result => result)
			.catch(err => {
				console.log('adb shell: ', err);
			});
	}

	/**
	 * Attempts to find the adb executable, then start the adb server.
	 * @returns {Promise}
	 */
	startServer() {
		return sdk
			.detect(this.config)
			.then(result => {
				return util.run(result.sdk.executables.adb, ['start-server']);
			}).catch(err => {
				console.log('start server', err);
			});
	}

	/**
	 * Attempts to find the adb executable, then stop the adb server.
	 * @returns {Promise}
	 */
	stopServer() {
		return sdk
			.detect(this.config)
			.then(result => {
				return util.run(result.sdk.executables.adb, ['kill-server']);
			})
			.catch(err => {
				console.log('stop server', err);
			});
	}

	/**
	 * Forwards the specified device/emulator's socket connections to the destination.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} src - The source port in the format "tcp:<port>"
	 * @param {String} dest - The destination port in the format "tcp:<port>" or "jdwp:<pid>"
	 * @returns {Promise}
	 */
	forward(deviceId, src, dest) {
		return sdk
			.detect(this.config)
			.then(result => {
				return util.run(result.sdk.executables.adb, ['-s', deviceId, 'forward', src, dest]);
			})
			.catch(err => {
				console.log('stop server', err);
			});
	}

	/**
	 * Pushes a single file to a device or emulator.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} src - The source file to copy to the device
	 * @param {String} dest - The destination to write the file
	 * @returns {Promise}
	 */
	push(deviceId, src, dest) {
		src = path.resolve(src);
		if (!fs.existsSync(src)) {
			return Promise.reject('Source file "%s" does not exist', src);
		}

		return sdk
			.detect(this.config)
			.then(result => {
				return util.run(result.sdk.executables.adb, ['-s', deviceId, 'push', src, dest]);
			})
			.catch(err => {
				console.log('stop server', err);
			});
	}

	/**
	 * Pulls a single file from a device or emulator.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} src - The source file to copy from the device
	 * @param {String} dest - The destination to write the file
	 * @returns {Promise}
	 */
	pull(deviceId, src, dest) {
		dest = path.resolve(dest);
		const destDir = path.dirname(dest);

		fs.existsSync(destDir) || wrench.mkdirSyncRecursive(destDir);

		return sdk
			.detect(this.config)
			.then(result => {
				return util.run(result.sdk.executables.adb, ['-s', deviceId, 'pull', src, dest]);
			})
			.catch(err => {
				console.log('stop server', err);
			});
	}

	/**
	 * Returns the pid of the specified app and device/emulator, if running.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} appid - The application's id
	 * @returns {Promise}
	 */
	getPid(deviceId, appid) {
		return this.shell(deviceId, 'ps')
			.then(data => {
				if (data) {
					const lines = data.toString().split('\n');
					for (let i = 0, j = lines.length; i < j; i++ ) {
						let columns = lines[i].trim().split(/\s+/);
						if (columns.pop() === appid) {
							return parseInt(columns[1]);
						}
					}
				}
				return 0;
			})
			.catch(err => {
				console.log('adb getPid: ', err);
			});
	}

	/**
	 * Installs an app to the specified device/emulator.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} apkFile - The application apk file to install
	 * @param {Object} [opts] - Install options
	 * @param {Object} [opts.logger] - A logger instance
	 * @returns {Promise}
	 */
	installApp(deviceId, apkFile, opts = {}) {
		apkFile = path.resolve(apkFile);
		if (!fs.existsSync(apkFile)) {
			return Promise.reject('APK file does not exist', apkFile);
		}

		return this.devices()
			.then(devices => {
				if (devices.filter(d => { return d.id == deviceId; }).length != 1) {
					return Promise.reject('device not found');
				}

				return sdk.detect();
			})
			.then(result => {
				console.log(result);
				return util.run(result.sdk.executables.adb, ['-s', deviceId, 'install', '-r', apkFile]);
			});
			// .then(({ code, stdout, stderr }) => {})
	}

	/**
	 * Starts an application on the specified device/emulator.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} appid - The application's id
	 * @param {String} activity - The name of the activity to run
	 * @returns {Promise}
	 */
	startApp(deviceId, appid, activity) {
		return this.shell(deviceId, 'am start -n ' + appid + '/.' + activity.replace(/^\./, ''));
	}

	/**
	 * Stops an application on the specified device/emulator.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {String} appid - The application's id
	 * @returns {Promise}
	 */
	stopApp(deviceId, appid) {
		return this.getPid(deviceId, appid)
			.then(pid => {
				console.log(pid);
				return this.shell(deviceId, 'am force-stop ' + appid);
			});
	}

	/**
	 * Retrieves a list of connected devices and emulators.
	 * @returns {Promise}
	 */
	devices() {
		return new Connection(this)
			.exec('host:devices')
			.then(data => {
				return parseDevices(this, data);
			});
	}

	/**
	 * Streams output from logcat into the specified handler until the adb logcat
	 * process ends.
	 * @param {String} deviceId - The id of the device or emulator
	 * @param {Function} handler - A function to call whenever data becomes available
	 * @returns {Promise}
	 */
	logcat(deviceId, handler) {
		return sdk
			.detect(this.config)
			.then(result => {
				return new Promise((resolve, reject) => {
					const args = [
						'-s',
						deviceId,
						'logcat'
						//'-v', 'brief', '-b', 'main'
					];
					const child = spawn(result.sdk.executables.adb, args);

					child.stdout.on('data', data => {
						handler(data.toString());
					});

					child.on('close', () => resolve());
				});
			});
	}
}

/**
 * Parses the device list, then fetches additional device info.
 * @param {ADB} adb - The ADB instance
 * @param {Buffer|String} data - The buffer containing the list of devices
 */
function parseDevices(adb, data) {
	let devices = [];
	const emuMgr = new EmulatorManager(adb.config);

	(data || '').toString().split('\n').forEach(item => {
		let p = item.split(/\s+/);
		if (p.length > 1) {
			devices.push({
				id: p.shift(),
				state: p.shift()
			});
		}
	});

	return Promise
		.all(devices.map((device, index) => {
			const deviceId = device.id;
			return adb
				.shell(deviceId, 'cat /system/build.prop')
				.then(data => {
					let info = {};
					data.toString().split('\n').forEach(line => {
						const p = line.indexOf('=');
						if (p !== -1) {
							const key = line.substring(0, p).trim();
							const value = line.substring(p + 1).trim();
							switch (key) {
								case 'ro.product.model.internal':
									info.modelnumber = value;
									break;
								case 'ro.build.version.release':
								case 'ro.build.version.sdk':
								case 'ro.product.brand':
								case 'ro.product.device':
								case 'ro.product.manufacturer':
								case 'ro.product.model':
								case 'ro.product.name':
									info[key.split('.').pop()] = value;
									break;
								case 'ro.genymotion.version':
									info.genymotion = value;
									break;
								default:
									if (key.indexOf('ro.product.cpu.abi') == 0) {
										Array.isArray(info.abi) || (info.abi = []);
										value.split(',').forEach(abi => {
											abi = abi.trim();
											if (info.abi.indexOf(abi) === -1) {
												info.abi.push(abi);
											}
										});
									}
									break;
							}
						}
					});
					return info;
				})
				.then(info => {
					Object.assign(devices[index], info);
					return emuMgr.isEmulator(deviceId)
						.then(emu => {
							devices[index].emulator = emu || false;
						});
				});
		}))
		.then(() => devices);
}
