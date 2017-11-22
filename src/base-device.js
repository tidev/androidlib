// import * as adb from './adb';

/**
 * Device information.
 */
export default class BaseDevice {
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
	 * The device product name. This appears to be an internal development or code name.
	 * @type {String}.
	 */
	device = null;

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
	 * The version of the Android operating system running on the device.
	 * @type {String}.
	 */
	release = null;

	/**
	 * The Android SDK version associated with the Android version running on the device.
	 * @type {Number}.
	 */
	sdk = null;

	/**
	 * The connected device's state.
	 * @type {String}.
	 */
	state = null;

	/**
	 * Sets the device information.
	 *
	 * @param {Object} [info] - The device info.
	 * @access public
	 */
	constructor(info = {}) {
		for (const [ key, value ] of Object.entries(info)) {
			switch (key) {
				case 'id':
				case 'state':
					this[key] = value || null;
					break;

				case 'ro.build.version.release':
				case 'ro.build.version.sdk':
				case 'ro.product.brand':
				case 'ro.product.device':
				case 'ro.product.manufacturer':
				case 'ro.product.model':
				case 'ro.product.name':
					this[key.split('.').pop()] = value || null;
					break;

				default:
					if (key.indexOf('ro.product.cpu.abi') === 0) {
						if (!Array.isArray(this.abi)) {
							this.abi = [];
						}

						for (let abi of value.split(',')) {
							abi = abi.trim();
							if (abi && this.abi.indexOf(abi) === -1) {
								this.abi.push(abi);
							}
						}
					}
			}
		}
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
