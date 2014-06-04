/**
 * adb utils
 */
var fs = require('fs'),
	path = require('path'),
	spawn = require('child_process').spawn,
	env = require('./env');

function tailLog(options,callback) {
	var android = env.find(options,callback),
		adb = android && path.join(android.sdkPath,'platform-tools','adb'),
		target = options.target === 'device' ? '-d' : '-e',
		child = android && spawn(adb,[target,'logcat']),
		// look for the start activity initial logging (we do in AppActivity) to get the PID for the app process.
		searchRegex = new RegExp('^D\\/AppActivity\\((\\d+)\\): Starting '+options.appid.replace(/\./g,'\\.')+'\.'+options.name+'Activity'),
		pid,
		moveAhead,
		logger = options.logger;

	if (!android) {
		return;
	}

	child.stdout.on('data',function(buf){
		buf = String(buf);
		buf.split('\n').forEach(function(line){
			if (!pid) {
				var m = searchRegex.exec(line);
				if (m) {
					pid = m[1];
					moveAhead = pid.length + 3;
				}
				return;
			}
			var idx = line.indexOf(pid+'): ');
			if (idx<0) return;
			var submsg = line.substring(idx+moveAhead).trim(),
				msg = ('[ADB] '.blue)+ submsg,
				label = line.substring(0,2);
			switch (label) {
				case 'I/':
					logger('info',msg);
					break;
				case 'D/':
					// filter out some android low-level stuff
					if (/^(pt_debug|ion)\s*\:/.test(submsg) || /^, tls=0x/.test(submsg)) {
						logger('trace',msg);
					}
					else {
						logger('debug',msg);
					}
					break;
				case 'W/':
					logger('warn',msg);
					break;
				case 'E/':
				case 'F/':
					logger('error',msg);
					break;
			}
		});
	});
	child.on('error',callback);
	child.on('exit',callback);
}

/**
 * launch
 */
function launch(options) {
	if (!options.callback) throw new Error("missing required callback");
	if (!options.logger) throw new Error("missing required logger");
	if (!options.appid) throw new Error("missing required appid");
	if (!options.name) throw new Error("missing required name");
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
		child.on('exit',function(exitCode){
			if (exitCode!=0) {
				return callback("Couldn't start app");
			}
			tailLog(options,callback);
		});
	}
}
