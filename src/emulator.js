import { cacheSync } from 'appcd-util';

import {
	getEmulators as getAndroidEmulators,
	isEmulatorDevice as isAndroidEmulatorDevice
} from './android-emulator';

/**
 * Detects Android Emulators.
 *
 * @param {Object} [opts] - Various options.
 * @param {Boolean} [opts.force] - When `true`, bypasses the cache and forces redetection.
 * @param {Array<SDK>} [opts.sdks] - When passed in, it will attempt to resolve the AVD's target, SDK
 * version, and API level.
 * @returns {Array}
 */
export function getEmulators({ force, sdks } = {}) {
	return cacheSync(`androidlib:emulators:${sdks && sdks.map(s => s.path).sort().join(':') || ''}`, force, () => {
		return getAndroidEmulators({ force, sdks });
	});
}

/**
 * Determines if the info object represents an Android Emulator.
 *
 * @param {Object} info - The device information.
 * @returns {Promise<Boolean>}
 */
export async function isEmulatorDevice(info) {
	return await isAndroidEmulatorDevice(info);
}
