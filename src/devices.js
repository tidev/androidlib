import * as adb from './adb';

/**
 * Device information.
 */
export class Device {
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
	 * The Android version running on the device.
	 * @type {String}.
	 */
	version = null;

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

export default Device;

/**
 * Detects all attached devices.
 *
 * @returns {Promise<Array.<Object>>}
 */
export async function getDevices() {
	const devices = await adb.devices();
	return devices.map(d => new Device(d));
}

/**
 * Starts listening for devices being connected or disconnected.
 *
 * @returns {Promise<TrackDeviceHandle>}
 */
export function trackDevices() {
	return adb.trackDevices();
}
