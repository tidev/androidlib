import appc from 'node-appc';
import Connection from './connection';
//import Device from './device';
import { EventEmitter } from 'events';
import fs from 'fs';
//import { isEmulator } from './emulator';
import mkdirp from 'mkdirp';
import path from 'path';
//import { sdk as sdkDetect } from './sdk';
//import { spawn } from 'child_process';


/*

This code was in connection.js, but was ripped out since a connection should not
start adb, but rather let whatever is creating the connection (the ADB class)
handle the error and retry. We should probably add this code back in below.

				if (!err.errno || err.errno !== 'ECONNREFUSED') {
					// this.emit('debug', `[${this.connNum}] SOCKET error, (${err})`);
					return reject(err);
				}

				// this.emit('debug', `[${this.connNum}] Restart ADB`);
				this.adb.startServer()
					.then(({ code, stdout, stderr }) => {
						if (!code) {
							return this
								.exec(cmd, opts)
								.then(data => resolve(data));
						}
						reject(new Error(`Unable to start Android Debug Bridge server (exit code ${code})`));
					});
*/

/**
 * Provides methods to interact with the Android Debug Bridge (ADB).
 */
export default class ADB {
	/**
	 * Creates an ADB object.
	 *
	 * @param {Object} opts - Android SDK detection and emulator manager options.
	 */
	constructor(opts = {}) {
		this.opts = opts;
		if (!this.opts.port) {
			this.opts.port = 5037;
		}
	}

	/**
	 * Executes a command. If it fails to connect, it starts the
	 * @access private
	 */
	tryExec(cmd, conn) {
		if (!conn) {
			conn = new Connection(this.opts.port);
		}

		return conn
			.exec(cmd)
			.catch(err => {
				if (err.errno !== 'ECONNREFUSED') {
					return Promise.reject(err);
				}

				// try to start adb
				return this.startServer()
					.catch(({ code, stdout, stderr }) => {
						return Promise.reject(new Error(`Unable to start Android Debug Bridge server (exit code ${code})`));
					})
					.then(() => conn.exec(cmd));
			});
	}

	/**
	 * Returns the version of the ADB server.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	version() {
		return this.tryExec('host:version')
			.then(data => {
				if (data) {
					return `1.0.${parseInt(data, 16)}`;
				}

				throw new Error('ADB version is not available');
			});
	}

	/**
	 * Runs the specified command on the Android emulator/device.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} cmd - The command to run.
	 * @returns {Promise}
	 * @access public
	 * /
	shell(deviceId, cmd) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof cmd !== 'string' || !cmd) {
			return Promise.reject(new TypeError('Expected command to be a string'));
		}

		const conn = new Connection(this.opts.port);
		return conn
			.exec('host:transport:' + deviceId)
			.then(data => conn.exec(`shell:${cmd.replace(/^shell\:/, '')}`, { bufferUntilClose: true, noLength: true }));
	}

	/**
	 * Attempts to find the adb executable, then start the adb server.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	startServer() {
		const args = [];
		if (this.opts.port) {
			args.push('-P', this.opts.port);
		}
		args.push('start-server');

		// return sdkDetect(this.opts)
		// 	.then(results => results.sdks[0])
		// 	.then(sdk => appc.subprocess.run(sdk.executables.adb, args));
	}

	/**
	 * Attempts to find the adb executable, then stop the adb server.
	 *
	 * @returns {Promise}
	 * @access public
	 * /
	stopServer() {
		return sdkDetect(this.opts)
			.then(results => results.sdks.shift())
			.then(sdk => appc.subprocess.run(sdk.executables.adb, ['kill-server']));
	}

	/**
	 * Forwards the specified device/emulator's socket connections to the destination.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} src - The source port in the format "tcp:<port>".
	 * @param {String} dest - The destination port in the format "tcp:<port>" or "jdwp:<pid>".
	 * @returns {Promise}
	 * @access public
	 * /
	forward(deviceId, src, dest) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof src !== 'string' || !src) {
			return Promise.reject(new TypeError('Expected source to be a string'));
		}

		if (typeof dest !== 'string' || !dest) {
			return Promise.reject(new TypeError('Expected dest to be a string'));
		}

		src = appc.path.expand(src);
		if (!appc.fs.existsSync(src)) {
			return Promise.reject(new TypeError(`Source file "${src}" does not exist`));
		}

		return sdkDetect(this.opts)
			.then(results => results.sdks.shift())
			.then(sdk => appc.subprocess.run(sdk.executables.adb, ['-s', deviceId, 'forward', src, dest]));
	}

	/**
	 * Pushes a single file to a device or emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} src - The source file to copy to the device.
	 * @param {String} dest - The destination to write the file.
	 * @returns {Promise}
	 * @access public
	 * /
	push(deviceId, src, dest) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof src !== 'string' || !src) {
			return Promise.reject(new TypeError('Expected source to be a string'));
		}

		src = appc.path.expand(src);
		if (!appc.fs.existsSync(src)) {
			return Promise.reject(new TypeError(`Source file "${src}" does not exist`));
		}

		if (typeof dest !== 'string' || !dest) {
			return Promise.reject(new TypeError('Expected dest to be a string'));
		}

		return sdkDetect(this.opts)
			.then(results => results.sdks.shift())
			.then(sdk => appc.subprocess.run(sdk.executables.adb, ['-s', deviceId, 'push', src, dest]));
	}

	/**
	 * Pulls a single file from a device or emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} src - The source file to copy from the device.
	 * @param {String} dest - The destination to write the file.
	 * @returns {Promise}
	 * @access public
	 * /
	pull(deviceId, src, dest) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof src !== 'string' || !src) {
			return Promise.reject(new TypeError('Expected source to be a string'));
		}

		if (typeof dest !== 'string' || !dest) {
			return Promise.reject(new TypeError('Expected destination to be a string'));
		}

		src = appc.path.expand(src);
		if (!appc.fs.existsSync(src)) {
			return Promise.reject(new TypeError(`Source file "${src}" does not exist`));
		}

		dest = appc.path.expand(dest);
		mkdirp.sync(path.dirname(dest));

		return sdkDetect(this.opts)
			.then(results => results.sdks.shift())
			.then(sdk => appc.subprocess.run(sdk.executables.adb, ['-s', deviceId, 'pull', src, dest]));
	}

	/**
	 * Returns the pid of the specified app for the specified device/emulator, if running.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} appId - The application's id.
	 * @returns {Promise}
	 * @access public
	 * /
	getPid(deviceId, appId) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof appId !== 'string' || !appId) {
			return Promise.reject(new TypeError('Expected app ID to be a string'));
		}

		return this
			.shell(deviceId, 'ps')
			.then(data => {
				if (data) {
					for (const line of data.toString().split('\n')) {
						let columns = line.trim().split(/\s+/);
						if (columns.pop() === appId) {
							return parseInt(columns[1]);
						}
					}
				}

				throw new Error(`The pid for "${appId}" on "${deviceId}" is not available`);
			});
	}

	/**
	 * Installs an app to the specified device/emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} apkFile - The application apk file to install.
	 * @returns {Promise}
	 * @access public
	 * /
	installApp(deviceId, apkFile) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof apkFile !== 'string' || !apkFile) {
			return Promise.reject(new TypeError('Expected apk file path to be a string'));
		}

		apkFile = appc.path.expand(apkFile);
		if (!appc.fs.existsSync(apkFile)) {
			return Promise.reject(new Error(`APK file "${apkFile}" does not exist`));
		}

		return this
			.devices()
			.then(devices => {
				if (!devices.some(d => d.id === deviceId)) {
					return Promise.reject(new Error('Device not found'));
				}
			})
			.then(() => sdkDetect(this.opts))
			.then(results => results.sdks.shift())
			.then(sdk => appc.subprocess.run(sdk.executables.adb, ['-s', deviceId, 'install', '-r', '-d', apkFile]));
	}

	/**
	 * Starts an application on the specified device/emulator.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} appId - The application's id.
	 * @param {String} activity - The name of the activity to run.
	 * @returns {Promise}
	 * @access public
	 * /
	startApp(deviceId, appId, activity) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof appId !== 'string' || !appId) {
			return Promise.reject(new TypeError('Expected app ID to be a string'));
		}

		if (typeof activity !== 'string' || !activity) {
			return Promise.reject(new TypeError('Expected activity name to be a string'));
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
	 * /
	stopApp(deviceId, appId) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected device ID to be a string'));
		}

		if (typeof appId !== 'string' || !appId) {
			return Promise.reject(new TypeError('Expected app ID to be a string'));
		}

		let pid;
		return this
			.getPid(deviceId, appId)
			.then(result => {
				pid = result;
				return this.shell(deviceId, `am force-stop ${appId}`);
			})
			.then(data => {
				if (data && data.toString().indexOf('unknown command') !== -1) {
					return this
						.shell(deviceId, `kill ${pid}`)
						.then(data => {
							if (data.toString().indexOf('Operation not permitted') !== -1) {
								return Promise.reject(new Error('Unable to stop the application'));
							}
							return Promise.resolve();
						});
				} else {
					return Promise.resolve();
				}
			});
	}

	/**
	 * Retrieves a list of connected devices and emulators.
	 *
	 * @returns {Promise}
	 * @access public
	 * /
	devices() {
		return new Connection(this.opts.port)
			.exec('host:devices')
			.then(data => this.parseDevices(data));
	}

	/**
	 * Retrieves a list of all devices and emulators, then listens for changes to device list.
	 * Connection will emit an `update` event when the device list is changed.
	 *
	 * @returns {Connection} The connection so you can end() it.
	 * @access public
	 * /
	trackDevices() {
		const conn = new Connection(this.opts.port);

		conn.on('data', data => {
			this.parseDevices(data)
				.then(devices => conn.emit('update', devices));
		});

		conn.exec('host:track-devices', { keepConnection: true });
		return conn;
	}

	/**
	 * Streams output from logcat into the specified handler until the adb logcat
	 * process ends.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @returns {EventEmitter} Emits events `message`, `error` and `close`.
	 * @access public
	 * /
	logcat(deviceId) {
		const emitter = new EventEmitter;
		Promise.resolve()
			.then(() => sdkDetect(this.opts))
			.then(results => results.sdks.shift())
			.then(sdk => {
				new Promise((resolve, reject) => {
					const args = [
						'-s',
						deviceId,
						'logcat',
						'-v',
						'brief',
						'-b',
						'main'
					];
					const child = spawn(sdk.executables.adb, args);

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
	 * /
	parseDevices(data = '') {
		const devices = [];
		const final = [];
		for (const item of data.toString().split('\n')) {
			let p = item.split(/\s+/);
			if (p.length > 1) {
				devices.push({
					id: p.shift(),
					state: p.shift()
				});
			}
		}

		return Promise
			.all(devices.map(device => {
				return this
					.shell(device.id, 'cat /system/build.prop')
					.then(data => {
						const lines = data.toString().split('\n');
						for (const line of lines) {
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
										if (key.indexOf('ro.product.cpu.abi') === 0) {
											Array.isArray(device.abi) || (device.abi = []);
											for (let abi of value.split(',')) {
												abi = abi.trim();
												if (device.abi.indexOf(abi) === -1) {
													device.abi.push(abi);
												}
											}
										}
										break;
								}
							}
						}

						return isEmulator(device.id)
							.then(emu => {
								if (emu) {
									delete device.name;
									Object.assign(emu, device);
									final.push(emu);
								} else {
									final.push(new Device(device));
								}
							});
					});
			}))
			.then(() => final);
	}
	*/
}
