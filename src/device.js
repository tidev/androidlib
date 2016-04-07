import ADB from './adb';

/**
 * Provides methods to interact with the Android devices.
 *
 * @class
 * @constructor
 */
export default class Device {
	/**
	 * Creates an Android Device object.
	 *
	 * @param {Object} options - the android device properties.
	 */
	constructor(options) {
		Object.assign(this, options);
	}

	/**
	 * Detects connected devices.
	 *
	 * @param {Object} [opts] - Detection options.
	 * @returns {Promise}
	 */
	static detect(opts = {}) {
		return new ADB(opts)
			.devices()
			.then(result => {
				result = result.filter(n => n instanceof Device);
				const devices = [];
				for (const d of result) {
					devices.push(new Device(d));
				}
				return devices;
			});
	}

	/**
	 * Installs the specified app to the specified device.
	 *
	 * @param {String} deviceId - The id of the device or emulator.
	 * @param {String} apkFile - The application apk file to install.
	 * @returns {Promise}
	 */
	static installById(deviceId, apkFile) {
		return new ADB().installApp(deviceId, apkFile);
	}

	/**
	 * Installs the specified app to the device instance.
	 *
	 * @param {String} apkFile - The application apk file to install.
	 * @returns {Promise}
	 */
	install(apkFile) {
		return new ADB().installApp(this.deviceId, apkFile);
	}
}
