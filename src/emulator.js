import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

import { ADB } from './adb';
import * as sdk from './sdk';
import * as util from './util';
import * as avd from './emulators/avd';
import * as genymotion from './emulators/genymotion';

/**
 * Creates an Emulator instance.
 *
 * @class
 * @extends EventEmitter
 * @classdesc Simple object that contains the avd settings and exposes event methods.
 * @constructor
 */
export class Emulator extends EventEmitter { }

/**
 * Creates an EmulatorManager instance.
 *
 * @class
 * @classdesc Manages emulator implementations and responsible for launching and killing emulators.
 * @constructor
 * @param {Object} [opts] - Various options.
 */
export class EmulatorManager {
	constructor(opts = {}) {
		this.opts = opts;
	}

	/**
	 * Loads emulator implementation modules and detects all available emulators.
	 *
	 * @param {Object} [opts] - Detection options.
	 * @returns {Promise}
	 * @access public
	 */
	detect(opts = {}) {
		const results = {
			avds: [],
			genymotions: {}
		};

		return Promise
			.all([
				avd.detect(opts),
				genymotion.detect(opts)
			])
			.then(([avds, genys]) => {
				results.avds = avds;
				results.genymotions = genys;
			})
			.then(() => results);
	}

	/**
	 * Determines if the specified "device ID" is an emulator or a device.
	 *
	 * @param {String} deviceId - The id of the emulator returned from 'adb devices'.
	 * @param {Object} [opts] - Detection options.
	 * @returns {Promise}
	 * @access public
	 */
	isEmulator(deviceId, opts = {}) {
		if (typeof deviceId !== 'string' || !deviceId) {
			return Promise.reject(new TypeError('Expected emulator ID to be a string.'));
		}

		return Promise
			.all([
				avd.isEmulator(deviceId, opts),
				genymotion.isEmulator(deviceId, opts)
			])
			.then(results => results.filter(n => { return n; }).shift());
	}

	/**
	 * Detects if a specific Android emulator is running.
	 *
	 * @param {String} name - The name of the emulator.
	 * @param {Object} [opts] - Detection options.
	 * @returns {Promise}
	 * @access public
	 */
	isRunning(name, opts = {}) {
		if (typeof name !== 'string' || !name) {
			return Promise.reject(new TypeError('Expected emulator name to be a string.'));
		}

		let emu;

		// check if the emu exist
		// if exists, get the device list from adb.device()
		// check avd, genymotion
		return this
			.detect(opts)
			.then(results => {
				const emus = results.avds.avds.concat(results.genymotions.avds);
				emu = emus.filter(e => { return e && e.name === name; }).shift();
				if (!emu) {
					return Promise.reject(new Error(`Invalid emulator: "${name}"`));
				}

				return new ADB(opts).devices();
			})
			.then(devices => {
				// if there are no devices, then it can't possibly be running
				if (!devices || !devices.length) return Promise.resolve();

				const emulib = emu.type === 'avd' ? avd : genymotion;
				return emulib.isRunning(emu, devices, opts);
			});
	}

	/**
	 * Starts the specified emulator, if not already running.
	 *
	 * @param {String} name - The name of the emulator.
	 * @param {Object} [opts] - Options for detection and launching the emulator.
	 * @returns {EventEmitter} Emits events `message`, `error`, `timeout`,  `exit`, and `started`.
	 * @access public
	 */
	start(name, opts = {}) {
		const emulator = new Emulator;

		this.isRunning(name, opts)
			.then(result => {
				// emu is already running
				if (result) {
					Object.assign(emulator, result);
					emulator.emit('started', result);
					return;
				}

				// emu is not running, start it
				this
					.detect(opts)
					.then(results => {
						const emus = results.avds.avds.concat(results.genymotions.avds);
						const emu = emus.filter(e => { return e && e.name === name; }).shift();
						if (!emu) {
							emulator.emit('error', `Invalid emulator: "${name}"`);
						}

						Object.assign(emulator, emu);
						const emulib = emu.type === 'avd' ? avd : genymotion;
						emulib
							.start(emulator, opts)
							.then(() => {
								emulator.emit('message', 'Emulator is starting, monitoring boot state...');
								return this.checkBooted(emulator, opts);
							});

					});
			})
			.catch(err => emulator.emit('error', err));

		return emulator;
	}

	/**
	 * Stops the specified emulator, if running.
	 *
	 * @param {String} name - The name of the emulator.
	 * @param {Object} [opts] - Options for detection and killing the emulator.
	 * @returns {Promise}
	 * @access public
	 */
	stop(name, opts = {}) {
		return this
			.isRunning(name, opts)
			.then(result => {
				if (!result) return Promise.resolve(`"${name}" is not running.`);

				if (result.type === 'genymotion') {
					return genymotion.stop(result, opts);
				}

				if (result.emulator && result.emulator.type === 'avd') {
					return avd.stop(result.id, opts);
				}
			});
	}

	/**
	 * Stops the specified emulator, if running.
	 *
	 * @param {Object} emulator - An emulator object.
	 * @param {Object} [opts] - Options for detecting the emulator.
	 * @returns {Promise}
	 * @access private
	 */
	checkBooted(emulator, opts = {}) {
		const retryTimeout = 5000;
		const bootTimeout = opts.bootTimeout || 240000;
		let timeTaken = 0;
		const wait = ms => new Promise(res => setTimeout(res, ms));
		const adb = new ADB(opts);

		function isBooted(adbExe){
			return wait(retryTimeout)
				.then(() => {
					if (timeTaken > bootTimeout) {
						emulator.emit('timeout', { type: 'emulator', waited: bootTimeout });
						return Promise.reject();
					}
					timeTaken += retryTimeout;
					emulator.emit('message', `Waiting for "${emulator.name}" to boot ...`);

					if (emulator.id) {
						return util.run(adbExe, ['-s', emulator.id, 'shell', 'getprop', 'sys.boot_completed']);
					} else {
						return adb
							.devices()
							.then(result => {
								result = result.shift();
								if (result) {
									emulator.id = result.id;
									return util.run(adbExe, ['-s', result.id, 'shell', 'getprop', 'sys.boot_completed']);
								}
								return isBooted(adbExe);
							});
					}
				})
				.then(({ code, stdout, stderr }) => {
					if (stdout.trim() === '1') {
						emulator.emit('started', emulator);
						return;
					}
					return isBooted(adbExe);
				});
		}

		return sdk
			.detect(opts)
			.then(result => isBooted(result.sdk.executables.adb));
	}
}
