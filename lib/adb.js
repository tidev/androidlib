/**
 * adb utils
 */
var fs = require('fs'),
	path = require('path'),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	env = require('./env'),
	logcat = require('adbkit-logcat'),
	lastOptions;

exports.launch = launch;
exports.stop = stop;

/**
 * filter out certain log messages we can safely ignore/suppress
 */
function filterLog(msg) {
	switch (msg) {
		case 'Not late-enabling CheckJNI (already on)':
		case 'Emulator without GPU emulation detected.':
		{
			return;
		}
		default: {
			break;
		}
	}
	return msg;
}

function tailLog(options,pid,callback) {
	var android = env.find(options,callback),
		adb = android && path.join(android.sdkPath,'platform-tools','adb'),
		target = options.target === 'device' ? '-d' : '-e',
		child = android && spawn(adb,[target,'logcat', '-B']),
		moveAhead = String(pid).length + 3,
		logger = options.logger,
		auto_exit = options.auto_exit,
		_finished;

	if (!android) {
		return;
	}

	function finish() {
		if (!_finished) {
			_finished = true;
			stop(options);
			callback.apply(callback,arguments);
		}
	}

	reader = logcat.readStream(child.stdout);
	reader.on('entry', function(entry) {
		if(pid == entry.pid) {
			if (auto_exit && entry.message==='TI_EXIT') {
				return finish();
			}
			switch (entry.priority) {
				case logcat.Priority.INFO:
					logger('info',entry.message);
					break;
				case logcat.Priority.DEBUG:
					// filter out some android low-level stuff
					if (/^(pt_debug|ion)\s*\:/.test(entry.message) || /^, tls=0x/.test(entry.message)) {
						logger('trace',entry.message);
					}
					else {
						logger('debug',entry.message);
					}
					break;
				case logcat.Priority.WARN:
					logger('warn',entry.message);
					break;
				case logcat.Priority.ERROR:
				case logcat.Priority.FATAL:
					logger('error',entry.message);
					break;
			}
	  }

	});
	reader.on('error', function(err) {
		finish
	});
	reader.on('finish', function(err) {
		finish
	});
}

/**
 * get the pid of a running app
 */
function pid(options, next) {
	var android = env.find(options,next),
		adb = android && path.join(android.sdkPath,'platform-tools','adb'),
		target = options.target === 'device' ? '-d' : '-e',
		args = [target,'shell','ps | grep '+options.appid];

	exec(adb+' '+args.join(' '), function(err,stdout,stderr){
		// sometimes it fails waiting on start, allow it to re-run
		if (err && err.code === 1 && err.killed === false) {
			return pid(options, next);
		}
		if (err) { console.error(err); return next(err); }
		// return the 2nd column which is the pid
		next(null, stdout.trim().split(/\s+/)[1]);
	});
}

/**
 * launch
 */
function launch(options) {
	if (!options.callback) throw new Error("missing required callback");
	if (!options.logger) throw new Error("missing required logger");
	if (!options.appid) throw new Error("missing required appid");
	if (!options.name) throw new Error("missing required name");
	if (!options.apk) throw new Error("missing required apk");
	
	// cache
	lastOptions = options;

	install(options,function(err){
		if (err) { return options.callback(err); }
		var android = env.find(options,callback),
			adb = android && path.join(android.sdkPath,'platform-tools','adb'),
			target = options.target === 'device' ? '-d' : '-e',
			args = [target,'shell','am','start','-n',options.appid+'/'+options.appid+'.'+options.name+'Activity'],
			logger = options.logger,
			callback = options.callback,
			child = android && spawn(adb,args);
		if (android) {
			child.stdout.on('data',function(buf){
				logger('debug',String(buf));
			});
			child.stderr.on('data',function(buf){
				logger('error',String(buf));
			});
			child.on('error',callback);
			child.on('close',function(exitCode){
				if (exitCode!=0) {
					return callback("Couldn't start app");
				}
				// get the pid of the new process
				pid(options,function(err,_pid){
					if (err) { return callback(err); }

					// start telling the log
					tailLog(options,_pid,callback);
				});
			});
		}
	});
}

/**
 * install
 */
function install(options, callback) {
	var apk = options.apk,
		android = env.find(options,callback),
		adb = android && path.join(android.sdkPath,'platform-tools','adb'),
		target = options.target === 'device' ? '-d' : '-e',
		logger = options.logger,
		args = [target,'install','-r',apk],
		child = android && spawn(adb,args);
	if (android) {
		child.stdout.on('data',function(buf){
			logger('debug',String(buf));
		});
		child.stderr.on('data',function(buf){
			logger('error',String(buf));
		});
		child.on('error',callback);
		child.on('exit',function(exitCode){
			if (exitCode!=0) {
				return callback("Couldn't install app");
			}
			callback();
		});
	}
}

/**
 * stop a running application
 */
function stop (options, next) {
	if (typeof options==='function') {
		next = options;
		options = lastOptions;
	}
	if (options) {
		var apk = options.apk,
			android = env.find(options),
			adb = android && path.join(android.sdkPath,'platform-tools','adb'),
			target = options.target === 'device' ? '-d' : '-e',
			logger = options.logger,
			args = [target,'shell','am','force-stop',options.appid];

		if (android) {
			exec(adb+' '+args.join(' '), function(err,stdout,stderr){
				next && next();
			});
		}
	}
}
