import 'babel-polyfill';
import 'source-map-support/register';
import * as jdklib from 'jdklib';

import ADB from './adb';
import * as device from './device';
import * as emulator from './emulator';
import * as genymotion from './genymotion';
import * as sdk from './sdk';
import * as ndk from './ndk';
import AndroidManifest from './AndroidManifest';
import * as util from './util';

export {
	ADB,
	AndroidManifest,
	device,
	emulator,
	genymotion,
	sdk,
	ndk
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
	return Promise.all([
		sdk.detect(opts),
		ndk.detect(opts),
		genymotion.detect(opts),
		device.detect(opts),
		emulator.detect(opts)
	])
	.then(([sdk, ndk, genyenv, devices, emulators]) => {
		const result = {
			home: util.expandPath(opts.androidHomePath || process.env.ANDROID_HOME || '~/.android'),
			sdk: sdk,
			ndk: ndk,
			genymotion: genyenv,
			devices: devices,
			emulators: emulators
		};

		return result;
	});
}
