import { cache } from 'appcd-util';

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
 * @param {SDK} [opts.sdk] - When passed in, it will attempt to resolve the AVD's target, SDK
 * version, and API level.
 * @param {Object} [opts.vbox] - Object containing information about the VirtualBox install.
 * @returns {Promise<Array>}
 */
export function getEmulators({ force, sdks, vbox } = {}) {
	return cache(`androidlib:emulators:${sdks && (sdks.path || sdks[0].path) || ''}`, force, async () => {
		return await Promise.all([
			getAndroidEmulators({ sdks, force }),
			getGenymotionEmulators({ vbox, force })
		])
			.then(results => {
				return results[0].concat(results[1]);
			});
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
