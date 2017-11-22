import { cacheSync } from 'appcd-util';

import {
	getEmulators as getAndroidEmulators,
	isEmulator as isAndroidEmulator
} from './android-emulator';

import {
	getEmulators as getGenymotionEmulators,
	isEmulator as isGenymotionEmulator
} from './genymotion';

/**
 * Detects Android Emulators.
 *
 * @param {Object} [opts] - Various options.
 * @param {Boolean} [opts.force] - When `true`, bypasses the cache and forces redetection.
 * @param {Array<SDK>} [opts.sdks] - When passed in, it will attempt to resolve the AVD's target, SDK
 * version, and API level.
 * @param {Object} [opts.vbox] - Object containing information about the VirtualBox install.
 * @returns {Array}
 */
export function getEmulators({ force, sdks, vbox } = {}) {
	return cacheSync(`androidlib:emulators:${sdks && sdks.map(s => s.path).sort().join(':') || ''}`, force, () => {
		const avds = getAndroidEmulators({ force, sdks });
		const vms = getGenymotionEmulators({ force, vbox });
		return avds.concat(vms);
	});
}

/**
 * Determines if the info object represents an Android or Genymotion Emulator.
 *
 * @param {Object} info - The device information.
 * @returns {Promise<Boolean>}
 */
export async function isEmulator(info) {
	return await Promise.all([
		isAndroidEmulator(info),
		isGenymotionEmulator(info)
	])
		.then(results => {
			return results[0] || results[1];
		});
}
