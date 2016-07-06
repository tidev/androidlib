// import ADB from './adb';
// import AndroidEmulator from './emulators/AndroidEmulator';
// import GenymotionEmulator from './emulators/GenymotionEmulator';
//
// /**
//  * Detects all available emulators.
//  *
//  * @param {Object} opts - Detection options.
//  * @returns {Promise}
//  */
// export function detect(opts = {}) {
// 	return Promise
// 		.all([
// 			AndroidEmulator.detect(opts),
// 			GenymotionEmulator.detect(opts)
// 		])
// 		.then(([avds, genys]) => avds.concat(genys));
// }
//
// /**
//  * Determines if the specified "device ID" is an emulator.
//  *
//  * @param {String} deviceId - The id of the emulator returned from 'adb devices'.
//  * @param {Object} [opts] - Detection options.
//  * @returns {Promise}
//  */
// export function isEmulator(deviceId, opts = {}) {
// 	if (typeof deviceId !== 'string' || !deviceId) {
// 		return Promise.reject(new TypeError('Expected emulator ID to be a string.'));
// 	}
//
// 	return Promise
// 		.all([
// 			AndroidEmulator.isEmulator(deviceId, opts),
// 			GenymotionEmulator.isEmulator(deviceId, opts)
// 		])
// 		.then(results => results.filter(n => n).shift());
// }
//
// /**
//  * Detects if the specified emulator is running.
//  *
//  * @param {String} name - The name of the emulator.
//  * @param {Object} [opts] - Detection options.
//  * @returns {Promise}
//  */
// export function isRunning(name, opts = {}) {
// 	if (typeof name !== 'string' || !name) {
// 		return Promise.reject(new TypeError('Expected emulator name to be a string.'));
// 	}
//
// 	// check if the emu exist
// 	// if exists, get the device list from adb.device()
// 	// check avd, genymotion
// 	return detect(opts)
// 		.then(results => {
// 			const emu = results.filter(e => e && e.name === name).shift();
// 			if (!emu) {
// 				return Promise.reject(new Error(`Invalid emulator: "${name}"`));
// 			}
// 			return new ADB(opts).devices();
// 		})
// 		.then(devices => {
// 			// if there are no devices, then it can't possibly be running
// 			if (!devices || !devices.length) return Promise.resolve();
// 			return devices.filter(e => e && e.name === name).shift();
// 		});
// }
//
// /**
//  * Launches the specified emulator, if not already running.
//  *
//  * @param {String} name - The name of the emulator.
//  * @param {Object} [opts] - Options for detection and launching the emulator.
//  * @returns {Promise}
//  */
// export function launch(name, opts = {}) {
// 	return Promise.resolve()
// 		.then(() => isRunning(name, opts))
// 		.then(result => {
// 			// emu is already running
// 			if (result) {
// 				return result;
// 			}
//
// 			// emu is not running
// 			return detect(opts)
// 				.then(results => {
// 					const emu = results.filter(e => e && e.name === name).shift();
// 					if (!emu) {
// 						throw new Error(`Invalid emulator: "${name}"`);
// 					}
// 					emu.launch(opts);
// 					return emu;
// 				});
// 		});
// }
//
// /**
//  * Stops the specified emulator, if running.
//  *
//  * @param {String} name - The name of the emulator.
//  * @param {Object} [opts] - Options for detection and killing the emulator.
//  * @returns {Promise}
//  */
// export function stop(name, opts = {}) {
// 	return isRunning(name, opts)
// 		.then(result => {
// 			if (!result) {
// 				return Promise.resolve(`"${name}" is not running.`);
// 			}
// 			return result.stop(opts);
// 		});
// }
