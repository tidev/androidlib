import ADB from './adb';

/**
 * Detects connected devices.
 *
 * @param {Object} [opts] - Detection options.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return new ADB(opts)
		.devices()
		.then(result => result.filter(n => { return !n.emulator; }));
}


/**
 * Installs the specified app to the specified device.
 *
 * @param {String} deviceId - The id of the device or emulator.
 * @param {String} apkFile - The application apk file to install.
 * @returns {Promise}
 */
export function install(deviceId, apkFile) {
	if (typeof deviceId !== 'string' || !deviceId) {
		return Promise.reject(new TypeError('Expected device ID to be a string.'));
	}

	if (typeof apkFile !== 'string' || !apkFile) {
		return Promise.reject(new TypeError('Expected apk file path to be a string.'));
	}
	
	return new ADB().installApp(deviceId, apkFile);
}
