import 'babel-polyfill';
import 'source-map-support/register';
import * as jdklib from 'jdklib';

import ADB from './adb';
import Device from './device';
import * as Emulator from './emulator';
import * as Genymotion from './genymotion';
import * as SDK from './sdk';
import * as NDK from './ndk';
import AndroidManifest from './AndroidManifest';
import * as util from './util';

export {
	ADB,
	AndroidManifest,
	Device,
	Emulator,
	Genymotion,
	SDK as androidSDK,
	NDK as androidNDK
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
		SDK.detect(opts),
		NDK.detect(opts),
		Genymotion.detect(opts),
		Device.detect(opts),
		Emulator.detect(opts)
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
