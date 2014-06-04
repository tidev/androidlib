/**
 * environment related utils
 */
var fs = require('fs'),
	path = require('path'),
	cached,
	cachedVersion;

exports.find = find;

// borrowed from node-appc since he doesn't export
function findSDK() {
	var i,
		dirs = process.platform == 'win32'
			? ['C:\\android-sdk', 'C:\\android', 'C:\\Program Files\\android-sdk', 'C:\\Program Files\\android', 'C:\\Program Files\\Android\\android-sdk', 
				'C:\\Program Files (x86)\\android-sdk', 'C:\\Program Files (x86)\\android', 'C:\\Program Files (x86)\\Android\\android-sdk']
			: ['/opt/android', '/opt/android-sdk', '/usr/android', '/usr/android-sdk', '/usr/local/android-sdk'],
		exe = process.platform == 'win32' ? 'android.exe' : 'android';
	
	for (i = 0; i < dirs.length; i++) {
		if (fs.existsSync(dirs[i])) {
			return dirs[i];
		}
	}
	
	dirs = (process.env.PATH || '').split(process.platform == 'win32' ? ';' : ':');
	for (i = 0; i < dirs.length; i++) {
		if (fs.existsSync(dirs[i].trim(), exe)) {
			return dirs[i];
		}
	}
}

function findNDK() {
	var i,
		dirs = process.platform == 'win32'
			? ['C:\\android-ndk', 'C:\\Program Files\\android-ndk', 'C:\\Program Files\\Android\\android-ndk', 
				'C:\\Program Files (x86)\\android-ndk', 'C:\\Program Files (x86)\\Android\\android-ndk']
			: ['/opt/android-ndk', '/usr/android-ndk', '/usr/local/android-ndk'],
		exe = process.platform == 'win32' ? 'ndk-build.cmd' : 'ndk-build';
	
	for (i = 0; i < dirs.length; i++) {
		if (fs.existsSync(dirs[i])) {
			return dirs[i];
		}
	}
	
	dirs = (process.env.PATH || '').split(process.platform == 'win32' ? ';' : ':');
	for (i = 0; i < dirs.length; i++) {
		if (fs.existsSync(dirs[i].trim(), exe)) {
			return dirs[i];
		}
	}
}


function find(options, failIfNotFound) {
	if (cached) {
		options.sdk = options.sdk || cachedVersion;
		return cached;
	}
	var callback;
	if (typeof failIfNotFound === 'function') {
		callback = failIfNotFound;
		failIfNotFound = false;
	}
	options = options || {};
	var p = process.env.PATH.split(path.delimiter),
		android_sdk = options['android-sdk'] || process.env.ANDROID_SDK_ROOT || process.env.ANDROID_SDK || findSDK(),
		android_ndk = options['android-ndk'] || process.env.ANDROID_NDK_ROOT || process.env.ANDROID_NDK || findNDK(),
		sdkversion = options.sdk,
		versions = sdkversion ? [sdkversion] : [ '19', '18', '17', '16', '15', '14' ],
		found;

	if (!android_ndk && failIfNotFound) {
		log.fatal("couldn't find Android NDK path. Please set environment to ANDROID_NDK");
	}
	
	if (android_sdk) {
		// try and find android
		for (var c = 0; c < p.length; c++) {
			var f = p[c];
			for (var d = 0, dL = versions.length; d < dL; d++) {
				var ad = path.join(android_sdk,'platforms','android-' + versions[d],'android.jar');
				if (fs.existsSync(ad)) {
					found = ad;
					if (!sdkversion) {
						// if not specified explicitly, set it
						options.sdk = cachedVersion = versions[d];
					}
					break;
				}
			}
			if (found) break;
		}
		if (found) {
			return (cached = {
				ndkPath: android_ndk,
				sdkPath: android_sdk,
				jar: found
			});
		}
	}
	var msg = "Android SDK not found. Please define environment ANDROID_SDK";
	if (failIfNotFound) {
		console.error(msg);
		process.exit(1);
	}
	if (callback) {
		return callback(msg)
	}
}
