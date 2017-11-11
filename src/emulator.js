/**
 * Emulator information.
 */
export default class Emulator {
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
