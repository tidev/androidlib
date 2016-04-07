import 'babel-polyfill';
import 'source-map-support/register';
import * as jdklib from 'jdklib';

import ADB from './adb';
import Device from './device';
import * as Emulator from './emulator';
import * as SDK from './sdk';
import * as NDK from './ndk';
import AndroidManifest from './AndroidManifest';

export {
	ADB,
	AndroidManifest,
	Device,
	Emulator,
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
		getAndroidHome(opts),
		SDK.detect(opts),
		NDK.detect(opts),
		Device.detect(opts),
		Emulator.detect(opts)
	])
	.then(([home, sdk, ndk, devices, emulators]) => {
		const result = {
			home: home,
			sdk: sdk,
			ndk: ndk,
			devices: devices,
			emulators: emulators
		};

		return result;
	});
}

function getAndroidHome(opts = {}) {
	let home = opts.androidHomePath || process.env.ANDROID_HOME || '~/.android';
	return Promise.resolve(home);
}
