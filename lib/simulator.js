/**
 * emulator
 */
var adb = require('./adb');

exports.launch = launch;
exports.stop = stop;

function stop (next) {
	next && next();
}

function launch (options) {
	options.target = 'simulator';
	adb.launch(options);
}
