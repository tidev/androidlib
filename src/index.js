import 'babel-polyfill';
import 'source-map-support/register';
import * as jdklib from 'jdklib';
import * as sdk from './sdk';
import * as ndk from './ndk';
import * as device from './device';
import { EmulatorManager } from './emulator';

let cache = null;

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
		sdk.detect(opts),
		ndk.detect(opts),
		device.detect(opts),
		new EmulatorManager().detect(opts)
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
