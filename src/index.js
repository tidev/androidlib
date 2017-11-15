/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import AndroidEmulator, * as avd from './android-emulator';
import BaseEmulator from './base-emulator';
import Device, * as devices from './device';
import GenymotionEmulator, * as genymotion from './genymotion';

import * as adb from './adb';
import * as emulators  from './emulator';
import * as ndk from './ndk';
import * as sdk from './sdk';
import * as virtualbox from './virtualbox';

export {
	adb,
	AndroidEmulator,
	avd,
	BaseEmulator,
	Device,
	devices,
	emulators,
	genymotion,
	GenymotionEmulator,
	ndk,
	sdk,
	virtualbox
};
