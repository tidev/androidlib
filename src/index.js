/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import Device, * as devices from './device';
import Emulator, * as emulators  from './emulator';

import * as adb from './adb';
import * as androidEmulator from './android-emulator';
import * as genymotion from './genymotion';
import * as ndk from './ndk';
import * as sdk from './sdk';
import * as virtualbox from './virtualbox';

export {
	adb,
	androidEmulator,
	Device,
	devices,
	Emulator,
	emulators,
	genymotion,
	ndk,
	sdk,
	virtualbox
};
