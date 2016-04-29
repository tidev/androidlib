import ADB from './adb';

/**
 * Provides methods to interact with the Android devices.
 *
 * @class
 * @constructor
 */
export class Device {
	/**
	 * Creates an Android Device object.
	 *
	 * @param {Object} options - the android device properties.
	 */
	constructor(options) {
		this.type 			= 'device';
		this.id 			= options.id;
		this.name 			= options.name;
		this.sdk 			= options.sdk;
		this.release 		= options.release;
		this.model 			= options.model;
		this.brand 			= options.brand;
		this.abi 			= options.abi;
		this.manufacturer 	= options.manufacturer;
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

/**
 * Detects connected devices.
 *
 * @param {Object} [opts] - Detection options.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return new ADB(opts)
		.devices()
		.then(result => result.filter(n => n instanceof Device));
}

/**
 * Installs the specified app to the specified device.
 *
 * @param {String} deviceId - The id of the device or emulator.
 * @param {String} apkFile - The application apk file to install.
 * @returns {Promise}
 */
export function installById(deviceId, apkFile) {
	return new ADB().installApp(deviceId, apkFile);
}
