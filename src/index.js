/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import AndroidEmulator from './android-emulator';
import Device from './device';
import Emulator from './emulator';

import * as adb from './adb';
import * as devices from './devices';
import * as emulators from './emulators';
import * as ndk from './ndk';
import * as sdk from './sdk';

export {
	adb,
	AndroidEmulator,
	Device,
	devices,
	Emulator,
	emulators,
	ndk,
	sdk
};
