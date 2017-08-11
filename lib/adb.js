/**
 * adb utils
 */
'use strict';
const path = require('path'),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	env = require('./env'),
	logcat = require('adbkit-logcat');
let lastOptions;

exports.launch = launch;
exports.stop = stop;

function tailLog(options, pid, callback) {
	const android = env.find(options, callback),
		adb = android && path.join(android.sdkPath, 'platform-tools', 'adb'),
		target = options.target === 'device' ? '-d' : '-e',
		child = android && spawn(adb, [ target, 'logcat', '-B' ]),
		logger = options.logger,
		auto_exit = options.auto_exit;

	if (!android) {
		return;
	}

	let _finished;
	function finish() {
		if (!_finished) {
			_finished = true;
			stop(options);
			callback.apply(callback, arguments);
		}
	}

	const reader = logcat.readStream(child.stdout);
	reader.on('entry', function (entry) {
		if (pid == entry.pid) { // eslint-disable-line eqeqeq
			if (auto_exit && entry.message === 'TI_EXIT') {
				return finish();
			}
			switch (entry.priority) {
				case logcat.Priority.INFO:
					logger('info', entry.message);
					break;
				case logcat.Priority.DEBUG:
					// filter out some android low-level stuff
					if (/^(pt_debug|ion)\s*:/.test(entry.message) || /^, tls=0x/.test(entry.message)) {
						logger('trace', entry.message);
					} else {
						logger('debug', entry.message);
					}
					break;
				case logcat.Priority.WARN:
					logger('warn', entry.message);
					break;
				case logcat.Priority.ERROR:
				case logcat.Priority.FATAL:
					logger('error', entry.message);
					break;
			}
		}
	});
	reader.on('error', function () {
		finish();
	});
	reader.on('finish', function () {
		finish();
	});
}

/**
 * get the pid of a running app
 * @param {object} options options object
 * @param {string} options.target 'device' || 'emulator'
 * @param {string} options.appid application id
 * @param {Function} next callback function
 */
function pid(options, next) {
	const android = env.find(options, next),
		adb = android && path.join(android.sdkPath, 'platform-tools', 'adb'),
		target = options.target === 'device' ? '-d' : '-e',
		args = [ target, 'shell', 'ps | grep ' + options.appid ];

	exec(adb + ' ' + args.join(' '), function (err, stdout) {
		// sometimes it fails waiting on start, allow it to re-run
		if (err && err.code === 1 && err.killed === false) {
			return pid(options, next);
		}
		if (err) {
			console.error(err);
			return next(err);
		}
		// return the 2nd column which is the pid
		next(null, stdout.trim().split(/\s+/)[1]);
	});
}

/**
 * Launch an apk/app on the target
 * @param  {object} options options object
 * @param  {Function} options.callback callback function
 * @param  {object} options.logger logger object
 * @param  {string} options.appid application id
 * @param  {string} options.name app name
 * @param  {string} options.apk path to apk
 */
function launch(options) {
	if (!options.callback) {
		throw new Error('missing required callback');
	}
	if (!options.logger) {
		throw new Error('missing required logger');
	}
	if (!options.appid) {
		throw new Error('missing required appid');
	}
	if (!options.name) {
		throw new Error('missing required name');
	}
	if (!options.apk) {
		throw new Error('missing required apk');
	}

	// cache
	lastOptions = options;

	install(options, function (err) {
		if (err) {
			return options.callback(err);
		}
		const android = env.find(options, callback),
			adb = android && path.join(android.sdkPath, 'platform-tools', 'adb'),
			target = options.target === 'device' ? '-d' : '-e',
			args = [ target, 'shell', 'am', 'start', '-n', options.appid + '/' + options.appid + '.' + options.name + 'Activity' ],
			logger = options.logger,
			callback = options.callback,
			child = android && spawn(adb, args);
		if (android) {
			child.stdout.on('data', function (buf) {
				logger('debug', String(buf));
			});
			child.stderr.on('data', function (buf) {
				logger('error', String(buf));
			});
			child.on('error', callback);
			child.on('close', function (exitCode) {
				if (exitCode !== 0) {
					return callback('Couldn\'t start app');
				}
				// get the pid of the new process
				pid(options, function (err, _pid) {
					if (err) {
						return callback(err);
					}

					// start telling the log
					tailLog(options, _pid, callback);
				});
			});
		}
	});
}

/**
 * Install an apk on the target
 * @param {object}  options options object
 * @param {object} options.logger logger object
 * @param {string} options.target 'device' || 'emulator'
 * @param {string} options.apk path to apk
 * @param {Function} callback callback function
 */
function install(options, callback) {
	const apk = options.apk,
		android = env.find(options, callback),
		adb = android && path.join(android.sdkPath, 'platform-tools', 'adb'),
		target = options.target === 'device' ? '-d' : '-e',
		logger = options.logger,
		args = [ target, 'install', '-r', apk ],
		child = android && spawn(adb, args);
	if (android) {
		child.stdout.on('data', function (buf) {
			logger('debug', String(buf));
		});
		child.stderr.on('data', function (buf) {
			logger('error', String(buf));
		});
		child.on('error', callback);
		child.on('exit', function (exitCode) {
			if (exitCode !== 0) {
				return callback('Couldn\'t install app');
			}
			callback();
		});
	}
}

/**
 * stop a running application
 * @param {object} options options object
 * @param {string} options.target 'device' || 'emulator'
 * @param {string} options.appid application id
 * @param {Function} next callback function
 */
function stop (options, next) {
	if (typeof options === 'function') {
		next = options;
		options = lastOptions;
	}
	if (options) {
		const android = env.find(options),
			adb = android && path.join(android.sdkPath, 'platform-tools', 'adb'),
			target = options.target === 'device' ? '-d' : '-e',
			args = [ target, 'shell', 'am', 'force-stop', options.appid ];

		if (android) {
			exec(adb + ' ' + args.join(' '), function (err) {
				next && next(err);
			});
		}
	}
}
