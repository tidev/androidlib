import ADB from './adb';
import AndroidManifest from './AndroidManifest';
import * as device from './device';
import * as emulator from './emulator';
import * as genymotion from './genymotion';
import * as sdk from './sdk';
import * as ndk from './ndk';
import 'source-map-support/register';
import { expandPath, searchPaths } from './util';

const version = require('../package.json').version;

export {
	ADB,
	AndroidManifest,
	device,
	emulator,
	genymotion,
	sdk,
	ndk,
	searchPaths,
	version
};

/**
 * Detects current Android environment.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Android environment detection cache and re-queries the system.
 * @param {String} [opts.androidHomePath] - Path to Android home directory.
 * @param {String} [opts.sdkPath] - Path to a known Android SDK directory.
 * @param {String} [opts.ndkPath] - Path to a known Android NDK directory.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return Promise
		.all([
			sdk.detect(opts),
			ndk.detect(opts),
			genymotion.detect(opts),
			device.detect(opts),
			emulator.detect(opts)
		])
		.then(([sdk, ndk, genyenv, devices, emulators]) => {
			const result = {
				home: expandPath(opts.androidHomePath || process.env.ANDROID_HOME || '~/.android'),
				sdk: sdk,
				ndk: ndk,
				genymotion: genyenv,
				devices: devices,
				emulators: emulators
			};

			return result;
		});
}

let watchers = {};
let listeners = [];
let data = null;

export function watch(opts, fn) {
	if (typeof opts === 'function') {
		fn = opts;
		opts = {};
	}

	return Promise.resolve()
		.then(() => {
			if (!data) {
				return detect(opts).then(results => data = results);
			}
		})
		.then(() => {
			listeners.push(fn);

			if (!watchers.ndk) {
				watchers.ndk = ndk.watch(results => {
					data.ndk = results;
					for (const listener of listeners) {
						listener(data);
					}
				});
			}

			// send the current results
			setImmediate(() => {
				fn(data);
			});

			return () => {
				for (let i = 0; i < listeners.length; i++) {
					if (listeners[i] === fn) {
						listeners.splice(i--, 1);
					}
				}

				if (listeners.length === 0) {
					for (const unwatch of Object.entries(watchers)) {
						unwatch();
					}
					watchers = {};
					data = null;
				}
			};
		});
}
