import 'babel-polyfill';
import 'source-map-support/register';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import appc from 'node-appc';

import { ADB } from './adb';
import * as sdk from './sdk';
import * as util from './util';
import * as avd from './emulators/avd';
import * as genymotion from './emulators/genymotion';

let cache = null;

/**
 * Creates an Emulator instace.
 * @class
 * @extends EventEmitter
 * @classdesc Simple object that contains the avd settings and exposes event
 * methods.
 * @constructor
 */
export class Emulator extends EventEmitter {
	constructor() {
		super();
	}
}

/**
 * Creates an EmulatorManager instance.
 * @class
 * @classdesc Manages emulator implementations and responsible for launching and
 * killing emulators.
 * @constructor
 * @param {Object} config - The CLI config object
 */
export class EmulatorManager {
	constructor(config) {
		this.config = config;
	}

	/**
	 * Loads emulator implementation modules and detects all available emulators.
	 * @param {Object} [opts] - Detection options
	 * @param {String} [opts.type] - The type of emulator to load (avd, genymotion); defaults to all
	* @returns {Promise}
	 */
	detect(opts = {}) {
		//TODO normalized `android` command for Windows
		const results = cache = {
			targets: {},
			avds: [],
			genymotions: {}
		};

		return Promise.all([
			avd.detect(),
			genymotion.detect()
		])
		.then(([avds, genys]) => {
			if (avds) {
				results.targets = avds.targets;
				results.avds = avds.avds;
			}

			if (genys) {
				results.genymotions = genys;
			}

			return results;
		})
		.catch(err => {
			console.log('- emulator detect err: ', err);
		});
	}

	/**
	 * Detects if a specific Android emulator is running.
	 * @param {String} name - The name of the emulator
	 * @param {Object} [opts] - Detection options
	 * @param {String} [opts.type] - The type of emulator to load (avd, genymotion); defaults to all
	 * @returns {Promise}
	 */
	isRunning(name, opts = {}) {
		const adb = new ADB(this.config);
		let emu;

		// check if the emu exist
		// if exists, get the device list from adb.device()
		// check avd, genymotion
		return this.detect(opts)
			.then(emus => {
				emu = emus.filter(e => {
					return e && e.name === name;
				}).shift();

				if (!emu) {
					let err = 'Invalid emulator: ' + name;
					return Promise.reject(err);
				}
				return adb.devices();
			})
			.then(devices => {
				// if there are no devices, then it can't possibly be running
				if (!devices || !devices.length) return Promise.resolve();

				//TODO generalized this to handle genymotion
				if (emu.type === 'avd') {
					return avd.isRunning(this.config, emu, devices);
				}
			});
	}

	/**
	 * Determines if the specified "device name" is an emulator or a device.
	 * @param {String} device - The name of the device returned from 'adb devices'
	 * @param {Object} [opts] - Detection options
	 * @param {String} [opts.type] - The type of emulator to load (avd, genymotion); defaults to all
	 * @returns {Promise}
	 */
	isEmulator(device, opts = {}) {
		return Promise
			.all([
				avd.isEmulator(this.config, device)
				//TODO add genymotion.isEmulator
			])
			.then(results => {
				return results.filter(function (n) { return n; }).shift();
			});
	}

	/**
	 * Starts the specified emulator, if not already running.
	 * @param {String} name - The name of the emulator
	 * @param {Object} [opts] - Options for detection and launching the emulator
	 * @returns {Promise}
	 */
	start(name, opts = {}) {
		return this.isRunning(name, opts)
			.then(result => {
				console.log('--> [', result, ']');
				if (result) {
					let emulator = new Emulator;
					Object.assign(emulator, result);
					return emulator;
				}

				// the emu is not running, start it and monitor boot state
				return this.detect(opts)
					.then(emus => {
						const emu = emus.filter(function (e) {
							return e && e.name == name;
						}).shift();

						if (!emu) return Promise.reject('Invalid emulator');

						console.log('-->  emu.type: ', emu.type);
						return avd
							.start(this.config, opts, emu)
							.then(emu => {
								console.log('Emulator is starting, monitoring boot state...');
								console.log(emu);
								return checkBooted(emu, this.config, opts);
							});
					});
			})
			.catch(err => err);
	}

	/**
	 * Stops the specified emulator, if running.
	 * @param {String} name - The name of the emulator
	 * @param {Object} [opts] - Options for detection and killing the emulator
 	 * @returns {Promise}
	 */
	stop(name, opts = {}) {
		return avd
			.stop(this.config, name, {port: name}, opts)
			.then(() => {
				console.log('STOP!');
			});
	}
}

/**
 * Stops the specified emulator, if running.
 * @param {String} emulator - An emulator object
 * @param {Object} config - The CLI config object
 * @param {Object} [opts] - Options for detecting the emulator
 * @returns {Promise}
 */
function checkBooted(emulator, config = {}, opts = {}) {
	const retryTimeout = 5000;
	const bootTimeout = opts.bootTimeout || 240000;
	let timeTaken = 0;
	const args = [
		'-s',
		emulator.id, //'emulator-[port]'
		'shell',
		'getprop',
		'sys.boot_completed'
	];
	const wait = ms => new Promise(res => setTimeout(res, ms));
	let sdkinfo;

	console.log('checkBooted :', args);

	function isBooted(adbExe, args){
		return wait(retryTimeout)
			.then(() => {
				if (timeTaken > bootTimeout) {
					console.log('timeout: ', timeTaken);
					emulator.emit('timeout', { type: 'emulator', waited: bootTimeout });
					return Promise.reject();
				}
				timeTaken += retryTimeout;
				return util.run(adbExe, args);
			})
			.then(({ code, stdout, stderr }) => {
				console.log('checking ...');
				if (stdout.trim() === '1') {
					console.log('Booted!');
					emulator.emit('ready', emulator);
					return emulator;
				}
				return isBooted(adbExe, args);
			});
	}

	return sdk
		.detect(config)
		.then(result => {
			sdkinfo = result;
			return isBooted(sdkinfo.sdk.executables.adb, args);
		})
		.then(result => {
			console.log('result: ', result);
			return result;
		});
}
