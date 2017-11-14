import { cache } from 'appcd-util';
import { getEmulators as getAndroidEmulators, isEmulator as isAndroidEmulator } from './androidEmulator';
import { getEmulators as getGenymotionEmulators, isEmulator as isGenymotionEmulator } from './genymotion';

/**
 * Emulator information.
 */
export class Emulator {
	/**
	 * Sets the emulator information.
	 *
	 * @param {Object} [info] - The emulator info.
	 * @access public
	 */
	constructor(info = {}) {
		Object.assign(this, info);
	}
}

export default Emulator;
/**
 * Android emulator information
 * @type {[type]}
 */
export class AndroidEmulator extends Emulator {}

/**
 * Genymotion emulator information
 * @type {[type]}
 */
export class GenymotionEmulator extends Emulator {}

/**
 * Detects Android Emulators.
 *
 * @param {SDK} [sdk] - When passed in, it will attempt to resolve the AVD's target, SDK version,
 * and API level.
 * @param {Boolean} [force] - When `true`, bypasses the cache and forces redetection.
 * @returns {Promise<Array>}
 */
export function getEmulators(sdk, force) {
	return cache(`androidlib:emulators:${sdk && sdk.path || ''}`, force, async () => {
		return await Promise.all([
			getAndroidEmulators(sdk, force),
			getGenymotionEmulators()
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
