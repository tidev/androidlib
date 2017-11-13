/**
 * Device information.
 */
export default class Device {
	/**
	 * A list of supported architectures such as "armeabi-v7a" and "armeabi".
	 * @type {Array.<String>}
	 */
	abi = null;

	/**
	 * The device brand such as "google".
	 * @type {String}.
	 */
	brand = null;

	/**
	 * The device id. This is essentially a 8 byte guid.
	 * @type {String}.
	 */
	id = null;

	/**
	 * The device manufacturer such as "asus".
	 * @type {String}.
	 */
	manufacturer = null;

	/**
	 * The device model such as "Nexus 7".
	 * @type {String}.
	 */
	model = null;

	/**
	 * The device name such as "Nexus 7".
	 * @type {String}.
	 */
	name = null;

	/**
	 * The Android SDK version associated with the Android version running on the device.
	 * @type {Number}.
	 */
	sdk = null;

	/**
	 * Sets the device information.
	 *
	 * @param {Object} [info] - The device info.
	 * @access public
	 */
	constructor(info = {}) {
		Object.assign(this, info);
	}

	/**
	 * Installs the specified app to the device.
	 *
	 * @param {String} apkFile - The path to the apk file to install.
	 * @returns {Promise}
	 */
	async install(apkFile) {
		if (!this.id) {
			throw new Error('No device id');
		}
		// return adb.installApp(this.id, apkFile);
		throw new Error('Not implemented');
	}
}
