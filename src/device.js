import { ADB } from './adb';

/**
 * Detects connected devices.
 *
 * @param {Object} [opts] - Detection options.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return new ADB()
		.devices(opts)
		.then(result => result.filter(n => { return !n.emulator; }));
}
