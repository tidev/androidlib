/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import AndroidEmulator, * as avd from './android-emulator';
import BaseEmulator from './base-emulator';
import Device, * as devices from './device';

import * as adb from './adb';
import * as emulators  from './emulator';
import * as ndk from './ndk';
import * as sdk from './sdk';

export {
	adb,
	AndroidEmulator,
	avd,
	BaseEmulator,
	Device,
	devices,
	emulators,
	ndk,
	sdk
};
