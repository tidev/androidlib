/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import Device, * as devices from './device';
import Emulator, * as emulators from './emulator';

import * as adb from './adb';
import * as ndk from './ndk';
import * as sdk from './sdk';

export {
	adb,
	Device,
	devices,
	Emulator,
	emulators,
	ndk,
	sdk
};
