import appc from 'node-appc';
import fs from 'fs';
import path from 'path';

if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

// if (!global.dump) {
// 	var util = require('util');
//
// 	/**
// 	 * Prints an object, including deeply nested objects, to stderr.
// 	 * @param {*} ... - Thing to dump
// 	 */
// 	global.dump = function dump() {
// 		for (var i = 0; i < arguments.length; i++) {
// 			console.error(util.inspect(arguments[i], false, null, true));
// 		}
// 	};
// }

export const androidlib = {
	version: require('../package.json').version,
	detect,
	watch,
	getAVDHome,
	resetCache
};

const modules = {
	ADB:             './adb',
	AndroidManifest: './AndroidManifest',
	// device,
	// emulator,
	genymotion:      './genymotion',
	linux:           './linux',
	ndk:             './ndk',
	sdk:             './sdk'
};

for (const name of Object.keys(modules)) {
	Object.defineProperty(androidlib, name, {
		enumerable: true,
		configurable: true,
		get: () => {
			const module = require(modules[name]);
			Object.defineProperty(androidlib, name, { enumerable: true, value: module });
			return module;
		}
	});
}

export default androidlib;

/**
 * Detects current Android environment.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - Bypasses the Android environment detection cache and re-queries the system.
 * @param {String} [opts.androidAVDPath] - Path to Android home directory.
 * @param {String} [opts.sdkPath] - Path to a known Android SDK directory.
 * @param {String} [opts.ndkPath] - Path to a known Android NDK directory.
 * @returns {Promise}
 */
function detect(opts = {}) {
	return Promise
		.all([
			androidlib.getAVDHome(opts.androidAVDPath),
			androidlib.sdk.detect(opts),
			androidlib.ndk.detect(opts)
//			genymotion.detect(opts),
//			device.detect(opts),
//			emulator.detect(opts)
		])
		.then(([home, sdk, ndk /*, genyenv, devices, emulators*/]) => {
			const result = {
				home: home,
				sdk: sdk,
				ndk: ndk
//				genymotion: genyenv,
//				devices: devices,
//				emulators: emulators
			};

			return result;
		});
}

/**
 * Watches the system for Android environment updates.
 *
 * @param {Object} [opts] - Various options.
 * @returns {Watcher}
 */
export function watch(opts={}) {
	const handle = new appc.detect.Watcher;

	return handle;
}

/**
 * Resets each module's internal cache. This is intended for testing purposes
 * only.
 */
function resetCache() {
	androidlib.ndk.resetCache();
}

/**
 * Resolves the Android AVD home directory where the Android Virtual Devices are
 * stored.
 *
 * @param {String} androidAVDPath - A known path to the Android AVD directory.
 * @returns {Promise}
 */
function getAVDHome(androidAVDPath) {
	const paths = [
		androidAVDPath,
		process.env.ANDROID_AVD_HOME,
		process.env.ANDROID_SDK_HOME && path.join(process.env.ANDROID_SDK_HOME, '.android', 'avd'),
		'~/.android/avd'
	];

	return (function tryPath() {
		return new Promise((resolve, reject) => {
			let p = paths.shift();
			if (!p) {
				return paths.length ? tryPath().then(resolve).catch(reject) : resolve(null);
			}

			p = appc.path.expand(p);

			fs.stat(p, (err, stat) => {
				if (err || !stat.isDirectory()) {
					tryPath().then(resolve).catch(reject);
				} else {
					fs.realpath(p, (err, rp) => resolve(err ? p : rp));
				}
			});
		});
	}());
}
