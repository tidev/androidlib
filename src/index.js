/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default as options } from './options';

import * as devices from './devices';
import * as emulator from './emulator';
import * as ndk from './ndk';
import * as sdk from './sdk';

export {
	devices,
	emulator,
	ndk,
	sdk
};
