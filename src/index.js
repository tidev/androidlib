/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import * as adb from './adb';
import * as devices from './devices';
import * as emulator from './emulator';
import * as ndk from './ndk';
import * as sdk from './sdk';

export {
	adb,
	devices,
	emulator,
	ndk,
	sdk
};
