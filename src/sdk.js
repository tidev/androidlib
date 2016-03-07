import 'babel-polyfill';
import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import appc from 'node-appc';

import * as util from './util';

const exe = util.exe;
const bat = util.bat;
const requiredSdkTools = {
	'adb': exe,
	'android': bat,
	'emulator': exe,
	'mksdcard': exe,
	'zipalign': exe,
	'aapt': exe,
	'aidl': exe,
	'dx': bat
};

let cache = null;

/**
 * Detects installed Android SDK.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.bypassCache=false] - When true, forces scan for all Paths.
 * @param {String} [opts.android.sdkPath] - Path to a known Android SDK directory.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	if (cache && !opts.bypassCache) {
		return Promise.resolve(cache);
	}

	//TODO linux64bit
	const results = {
		sdk: {}
	};

	const searchDirs = util.getSearchPaths();
	let sdkDir = opts.android && opts.android.sdkPath || process.env.ANDROID_SDK;
	let sdkPaths = [];

	if (sdkDir) {
		sdkDir = util.resolveDir(sdkDir);
		if (fs.existsSync(sdkDir)) {
			sdkPaths.push(sdkDir);
		}
	}

	searchDirs
		.map(dir => util.resolveDir(dir))
		.map(dir => {
			fs.existsSync(dir) && fs.readdirSync(dir).forEach(sub => {
				sdkPaths.push(path.join(dir, sub));
			});
		});

	return Promise.all(sdkPaths.map(p => {
		return isSDK(p, opts);
	}))
	.then(values => {
		results.sdk = values.filter(a => { return a; }).shift();
		cache = results;
	})
	.then(() => results);
}

/**
 * Determins if the specified directory contains android sdk and if so, returns the
 * Android SDK info.
 *
 * @param {String} dir - The directory to check.
 * @param {Object} [opts] - An object with various params.
 * @returns {Promise}
 */
function isSDK(dir, opts) {
	return new Promise((resolve, reject) => {
		if (!dir) {
			return resolve();
		}

		const buildToolsDir = path.join(dir, 'build-tools');
		const platformToolsDir = path.join(dir, 'platform-tools');
		const toolsDir = path.join(dir, 'tools');
		const toolsDirPropertiesFile = path.join(toolsDir, 'source.properties');
		const platformToolsPropertiesFile = path.join(platformToolsDir, 'source.properties');

		if (!fs.existsSync(buildToolsDir) ||
			!fs.existsSync(platformToolsDir) ||
			!fs.existsSync(toolsDir) ||
			!fs.existsSync(toolsDirPropertiesFile)) {
			return resolve();
		}

		const dxJarPath = path.join(platformToolsDir, 'lib', 'dx.jar');
		const proguardPath = path.join(toolsDir, 'proguard', 'lib', 'proguard.jar');
		let result = {
			path: dir,
			executables: {
				android:  path.join(toolsDir, 'android' + bat),
				emulator: path.join(toolsDir, 'emulator' + exe),
				mksdcard: path.join(toolsDir, 'mksdcard' + exe),
				zipalign: path.join(toolsDir, 'zipalign' + exe),
				adb:      path.join(platformToolsDir, 'adb' + exe),
				// Android SDK Tools v21 and older puts aapt and aidl in the platform-tools dir.
				// For SDK Tools v22 and later, they live in the build-tools/<ver> directory.
				aapt:     path.join(platformToolsDir, 'aapt' + exe),
				aidl:     path.join(platformToolsDir, 'aidl' + exe),
				dx:       path.join(platformToolsDir, 'dx' + bat)
			},
			dx: fs.existsSync(dxJarPath) ? dxJarPath : null,
			proguard: fs.existsSync(proguardPath) ? proguardPath : null,
			tools: {
				path: null,
				supported: null,
				version: null
			},
			platformTools: {
				path: null,
				supported: null,
				version: null
			},
			buildTools: {
				path: null,
				supported: null,
				version: null,
				tooNew: null,
				maxSupported: null
			}
		};

		//TODO
		/*
		Determine build tools version to use based on either config setting
		(android.buildTools.selectedVersion) or latest version
		*/
		let buildToolsSupported;
		let buildToolsVer = opts.android && opts.android.buildTools && opts.android.buildTools.selectedVersion;
		const vendorDependencies = opts.android && opts.android.vendorDependencies || null;
		const vendorDepBuildToolsVer = vendorDependencies && opts.android.vendorDependencies['android build tools'] || '>=17 <23.x';
		const vendorDepToolsVer = vendorDependencies && opts.android.vendorDependencies['android tools'] || '<=24.3.x';
		const vendorDepPlatformToolsVer = vendorDependencies && opts.android.vendorDependencies['android platform tools'] || '>=17 <=23.x';


		if (!buildToolsVer) {
			// No selected version set, so find the newest, supported build tools version
			const files = fs.readdirSync(buildToolsDir).sort().reverse();
			const len = files.length;

			for (let i = 0; i < len; i++) {
				if (buildToolsSupported = appc.version.satisfies(files[i], vendorDepBuildToolsVer, true)) {
					buildToolsVer = files[i];
					break;
				}
			}
		}

		if (buildToolsVer) {
			// A selectedVersion specified or supported version has been found
			const versionedBuildToolDir = path.join(buildToolsDir, buildToolsVer);
			const file = path.join(versionedBuildToolDir, 'source.properties');
			if (fs.existsSync(file) && fs.statSync(versionedBuildToolDir).isDirectory()) {
				const m = fs.readFileSync(file).toString().match(/Pkg\.Revision\s*?\=\s*?([^\s]+)/);
				if (m) {
					result.buildTools = {
						path: versionedBuildToolDir,
						supported: appc.version.satisfies(m[1], vendorDepBuildToolsVer, true),
						version: m[1],
						tooNew: buildToolsSupported,
						maxSupported: appc.version.parseMax(vendorDepBuildToolsVer, true)
					};
					let file;
					fs.existsSync(file = path.join(versionedBuildToolDir, 'aapt' + exe)) && (result.executables.aapt = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'aidl' + exe)) && (result.executables.aidl = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'dx' + bat)) && (result.executables.dx = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'zipalign' + exe)) && (result.executables.zipalign = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'lib', 'dx.jar')) && (result.dx = file);
				}
			} else {
				// build tools don't exist at the given location
				result.buildTools = {
					path: path.join(buildToolsDir, buildToolsVer),
					supported: false,
					version: buildToolsVer
				};
			}
		}

		let searchTools = [];
		Object.keys(requiredSdkTools).forEach(tool => {
			searchTools.push(util.findExecutable(result.executables[tool]));
		});

		Promise
			.all(searchTools)
			.then(values => {
				let m = fs.readFileSync(toolsDirPropertiesFile).toString().match(/Pkg\.Revision\s*?\=\s*?([^\s]+)/);
				if (m) {
					result.tools = {
						path: toolsDir,
						supported: appc.version.satisfies(m[1], vendorDepToolsVer, true),
						version: m[1]
					};
				}

				if (fs.existsSync(platformToolsPropertiesFile)) {
					m = fs.readFileSync(platformToolsPropertiesFile).toString().match(/Pkg\.Revision\s*?\=\s*?([^\s]+)/);
					if (m) {
						result.platformTools = {
							path: platformToolsDir,
							supported: appc.version.satisfies(m[1], vendorDepPlatformToolsVer, true),
							version: m[1]
						};
					}
				}

				resolve(result);
			})
			.catch(err => {
				console.log('---> err:', err);
				// something when wrong, probably missing require sdk tools
				resolve();
			});
	});
}
