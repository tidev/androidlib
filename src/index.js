// https://github.com/appcelerator/titanium_mobile/blob/master/node_modules/titanium-sdk/lib/android.js
import 'babel-polyfill';
import 'source-map-support/register';
import * as jdklib from 'jdklib';
import * as sdk from './sdk';
import * as ndk from './ndk';
import { Emulator, EmulatorManager } from './emulator';
// import { Connection } from './connection';
// import { ADB } from './adb';
// import * as avd from './emulators/avd';
// import * as geny from './emulators/genymotion';

let cache = null;

/**
 * Detects current Android environment.
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Android environment detection cache and re-queries the system
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return Promise.all([
		jdklib.detect(),
		sdk.detect(),
		ndk.detect(),
		new EmulatorManager().detect()
	])
	.then(results => results)
	.catch(err => console.error);
}

// detect()
// 	.then(([jdk, sdk, ndk, emus]) => {
// 		console.log('---------------------');
// 		console.log(jdk);
// 		console.log('*********');
// 		console.log(sdk);
// 		console.log('*********');
// 		console.log(ndk);
// 		console.log('*********');
// 		console.log(emus);
// 		console.log('---------------------');
// 	})
// 	.catch(err => console.error);
