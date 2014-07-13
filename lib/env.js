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

function getNDKToolchainDir() {
	var platform = (process.platform == 'win32' ? 'windows' : process.platform);
	var toolchain_dir = platform + '-x86';
	if (process.arch == 'x64') {
		toolchain_dir += '_64';
	}
	return toolchain_dir;
}

function getNDKToolchainArch(options) {
	var arch;
	if (options.arch == 'x86') {
		arch = 'x86';
	}  else if (options.arch == 'mips') {
		arch = 'mipsel-linux-android';
	} else {
		arch = 'arm-linux-androideabi';
	}
	return arch;
}

function getShortArchName(options) {
	if (options.arch.match(/^arm/))	{
		return 'arm';
	} else {
		return options.arch;
	}
}

function getLongArchName(options) {
	if (options.arch.match(/^arm/))	{
		if (options.arch=='arm') {
			return 'armeabi';
		} else {
			return 'armeabi-v7a';
		}
	} else {
		return options.arch;
	}
}

function getNDKToolchain(options, ndk_dir, toolchain_arch, toolchain_dir, version) {
	return path.join(ndk_dir, 'toolchains', toolchain_arch+'-'+version, 'prebuilt', toolchain_dir);
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
		android_ndk_toolchain_ver = options['android-ndk-toolchain-version'] || process.env.ANDROID_NDK_TOOLCHAIN_VERSION || '4.8',
		android_ndk_toolchain_dir = getNDKToolchainDir(),
		android_ndk_toolchain_arch = getNDKToolchainArch(options),
		android_ndk_toolchain = getNDKToolchain(options, android_ndk, android_ndk_toolchain_arch, android_ndk_toolchain_dir, android_ndk_toolchain_ver),
		android_ndk_toolchain_llvm = path.join(android_ndk, 'toolchains', 'llvm-3.3', 'prebuilt', android_ndk_toolchain_dir),
		android_ndk_ar = path.join(android_ndk_toolchain, 'bin', android_ndk_toolchain_arch+'-ar'),
		android_ndk_clang = path.join(android_ndk_toolchain_llvm, 'bin', 'clang++'),
		android_ndk_platform_sdk = path.join(android_ndk, 'platforms', 'android-'+options.sdk, 'arch-'+getShortArchName(options)),
		android_ndk_libstdcpp = path.join(android_ndk, 'sources','cxx-stl','gnu-libstdc++',android_ndk_toolchain_ver),
		android_ndk_libstdcpplib = path.join(android_ndk_libstdcpp, 'libs', getLongArchName(options)),
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
				arch:  getShortArchName(options),
				archlib:  getLongArchName(options),
				toolchain: android_ndk_toolchain,
				toolchain_version: android_ndk_toolchain_ver,
				toolchain_dir: android_ndk_toolchain_dir,
				toolchain_llvm: android_ndk_toolchain_llvm,
				toolchain_arch: android_ndk_toolchain_arch,
				toolchain_ar: android_ndk_ar,
				toolchain_clang: android_ndk_clang,
				toolchain_platform_sdk: android_ndk_platform_sdk,
				toolchain_libstdcpp: android_ndk_libstdcpp,
				toolchain_libstdcpplib: android_ndk_libstdcpplib,
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
