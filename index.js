/**
 * Android Utility Library
 */

module.exports = exports = {
	adb: require('./lib/adb'),
	device: require('./lib/device'),
	simulator: require('./lib/simulator'),
	emulator: require('./lib/simulator'), // symlink
	env: require('./lib/env')
};
