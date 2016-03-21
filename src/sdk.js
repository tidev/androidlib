import 'babel-polyfill';
import 'source-map-support/register';
import fs from 'fs';
import path from 'path';

import * as util from './util';
import * as linux from './linux';

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
 * @param {String} [opts.sdkPath] - Path to a known Android SDK directory.
 * @param {String} [opts.buildToolVersion] - Specify the version of build tools.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	if (cache && !opts.bypassCache) {
		return Promise.resolve(cache);
	}

	const results = {
		sdk: {},
		targets: null,
		linux64bit: null
	};

	const searchDirs = util.getSearchPaths();
	let sdkDir = opts.sdkPath || process.env.ANDROID_SDK_ROOT || process.env.ANDROID_SDK;
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
		return results.sdk;
	})
	.then(sdk => getAndroidTargets(sdk))
	.then(targets => {
		results.targets = targets;
	})
	.then(linux.detect())
	.then(linux64bit => {
		results.linux64bit = linux64bit;
		cache = results;
		return results;
	});
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

		const buildToolsDir 				= path.join(dir, 'build-tools');
		const platformToolsDir 				= path.join(dir, 'platform-tools');
		const toolsDir 						= path.join(dir, 'tools');
		const toolsDirPropertiesFile 		= path.join(toolsDir, 'source.properties');
		const platformToolsPropertiesFile 	= path.join(platformToolsDir, 'source.properties');

		if (!fs.existsSync(buildToolsDir) ||
			!fs.existsSync(platformToolsDir) ||
			!fs.existsSync(toolsDir) ||
			!fs.existsSync(toolsDirPropertiesFile)) {
			return resolve();
		}

		const dxJarPath 	= path.join(platformToolsDir, 'lib', 'dx.jar');
		const proguardPath 	= path.join(toolsDir, 'proguard', 'lib', 'proguard.jar');
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
				version: null
			},
			platformTools: {
				path: null,
				version: null
			},
			buildTools: {
				path: null,
				version: null
			}
		};

		const pgkVersionRegex = /Pkg\.Revision\s*?\=\s*?([^\s]+)/;
		if (fs.existsSync(toolsDirPropertiesFile)) {
			let txt = fs.readFileSync(toolsDirPropertiesFile).toString().match(pgkVersionRegex);
			if (txt) {
				result.tools = {
					path: toolsDir,
					version: txt[1]
				};
			}
		}

		if (fs.existsSync(platformToolsPropertiesFile)) {
			let txt = fs.readFileSync(platformToolsPropertiesFile).toString().match(pgkVersionRegex);
			if (txt) {
				result.platformTools = {
					path: platformToolsDir,
					version: txt[1]
				};
			}
		}

		let buildToolsVer = opts.buildToolVersion || null;
		if (!buildToolsVer) {
			// No selected version set, so find the newest installed build tools version
			const files = fs.readdirSync(buildToolsDir).sort().reverse();
			if (files.length >= 1) {
				buildToolsVer = files[0];
			} else {
				//No buildTools installed
				return resolve();
			}
		}

		if (buildToolsVer) {
			const versionedBuildToolDir = path.join(buildToolsDir, buildToolsVer);
			const file = path.join(versionedBuildToolDir, 'source.properties');
			if (fs.existsSync(file) && fs.statSync(versionedBuildToolDir).isDirectory()) {
				const m = fs.readFileSync(file).toString().match(pgkVersionRegex);
				if (m) {
					result.buildTools = {
						path: versionedBuildToolDir,
						version: m[1]
					};
					let file;
					fs.existsSync(file = path.join(versionedBuildToolDir, 'aapt' + exe)) && (result.executables.aapt = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'aidl' + exe)) && (result.executables.aidl = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'dx' + bat)) && (result.executables.dx = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'zipalign' + exe)) && (result.executables.zipalign = file);
					fs.existsSync(file = path.join(versionedBuildToolDir, 'lib', 'dx.jar')) && (result.dx = file);
				}
			}
		}

		let searchTools = [];
		Object.keys(requiredSdkTools).forEach(tool => {
			searchTools.push(
				util.findExecutable(result.executables[tool])
			);
		});

		Promise
			.all(searchTools)
			.then(values => {
				resolve(result);
			})
			.catch(err => {
				// something went wrong, one of the required sdk tools might be missing
				resolve();
			});
	});
}

function getAndroidTargets(sdk) {
	return util.run(sdk.executables.android, ['list', 'target'])
		.then(({ code, stdout, stderr }) => {
			if (code) {
				return null;
			}

			const addonsDir = path.join(sdk.path, 'add-ons');
			const sdkPlatformDir = path.join(sdk.path, 'platforms');
			const manifestNameRegex = /^(?:name|Addon\.Name(?:Display)?)=(.*)$/m;
			const manifestVendorRegex = /^(?:vendor|Addon\.Vendor(?:Display)?)=(.*)$/m;
			const manifestApiRegex = /^(?:api|AndroidVersion\.ApiLevel)=(.*)$/m;
			const manifestRevisionRegex = /^(?:revision|Pkg.Revision)=(.*)$/m;

			let addons = {};
			fs.existsSync(addonsDir) && fs.readdirSync(addonsDir).forEach(subDir => {
				const dir = path.join(addonsDir, subDir);
				if (fs.statSync(dir).isDirectory()) {
					let file = path.join(dir, 'manifest.ini');

					if (!fs.existsSync(file)) {
						file = path.join(dir, 'source.properties');
					}

					if (fs.existsSync(file)) {
						const manifest = fs.readFileSync(file).toString();
						const name = manifest.match(manifestNameRegex);
						const vendor = manifest.match(manifestVendorRegex);
						const api = manifest.match(manifestApiRegex);
						const revision = manifest.match(manifestRevisionRegex);
						name && vendor && api && revision && (addons[name[1] + '|' + vendor[1] + '|' + api[1] + '|' + revision[1]] = dir);
					}
				}
			});

			const idRegex = /^id: ([^\s]+) or "(.+)"$/;
			const libEntryRegex = /^\*\s+?(.+) \((.*)\)$/;
			const basedOnRegex = /^Based on Android ([^\s]+) \(API level ([^)]+)\)$/;

			let apiLevelMap = {};
			let targets = {};
			stdout.split(/\-\-\-\-\-\-+\n/).forEach(t => {
				t.split('\n\w').forEach(chunk => {
					chunk = chunk.trim();
					if (!chunk) return;
					let lines = chunk.split('\n');
					let m = lines.shift().match(idRegex);
					if (!m) return;

					let info = targets[m[1]] = { id: m[2], abis: [], skins: [] };
					for (let i = 0, len = lines.length; i < len; i++) {
						const line = lines[i].trim();
						if (line === 'Libraries:') {
							info.libraries || (info.libraries = {});
							for (++i; i < len; i++) {
								if (m = lines[i].trim().match(libEntryRegex)) {
									if (++i < len) {
										info.libraries[m[1]] = {
											jar: m[2],
											description: lines[i].trim()
										};
									} else {
										i--;
									}
								} else {
									i--;
									break;
								}
							}
						} else if (m = line.match(basedOnRegex)) {
							info['based-on'] = {
								'android-version': m[1],
								'api-level': ~~m[2]
							};
						} else {
							// simple key-value
							let p = line.indexOf(':');
							if (p !== -1) {
								let key = line.substring(0, p).toLowerCase().trim().replace(/\s/g, '-');
								let value = line.substring(p+1).trim();
								switch (key) {
									case 'abis':
									case 'skins':
										value.split(',').forEach(v => {
											v = v.replace('(default)', '').trim();
											if (info[key].indexOf(v) === -1) {
												info[key].push(v);
											}
										});
										break;
									case 'tag/abis':
										// note: introduced in android sdk tools 22.6
										value.split(',').forEach(v => {
											let p = v.indexOf('/');
											v = (p === -1 ? v : v.substring(p + 1)).trim();
											if (info.abis.indexOf(v) === -1) {
												info.abis.push(v);
											}
										});
										break;
									case 'type':
										info[key] = value.toLowerCase();
										break;
									default:
										var num = Number(value);
										if (value.indexOf('.') === -1 && !isNaN(num) && typeof num === 'number') {
											info[key] = Number(value);
										} else {
											info[key] = value;
										}
								}
							}
						}
					}

					if (info.type === 'platform') {
						let srcPropsFile = path.join(sdkPlatformDir, info.id, 'source.properties');
						let srcProps = fs.existsSync(srcPropsFile) ? fs.readFileSync(srcPropsFile).toString() : '';

						info.path = path.join(sdkPlatformDir, info.id);
						info.sdk = (function (m) { return m ? ~~m[1] : null; })(srcProps.match(/^AndroidVersion.ApiLevel=(.*)$/m));
						info.version = (function (m) { if (m) return m[1]; m = info.name.match(/Android (((\d\.)?\d\.)?\d)/); return m ? m[1] : null; })(srcProps.match(/^Platform.Version=(.*)$/m));
						info.androidJar = path.join(info.path, 'android.jar');
						info.aidl = path.join(info.path, 'framework.aidl');
						fs.existsSync(info.aidl) || (info.aidl = null);

						apiLevelMap[info['api-level'] || info.id.replace('android-', '')] = info;
					} else if (info.type === 'add-on' && info['based-on']) {
						info.path = addons[info.name + '|' + info.vendor + '|' + info['based-on']['api-level'] + '|' + info.revision] || null;
						info.version = info['based-on']['android-version'];
						info.androidJar = null;
					}
				});
			});

			// all targets are processed, now try to fill in aidl & androidJar paths for  add-ons
			Object.keys(targets).forEach(id => {
				let basedOn = targets[id]['based-on'];
				if (targets[id].type === 'add-on' && basedOn && apiLevelMap[basedOn['api-level']]) {
					targets[id].androidJar = apiLevelMap[basedOn['api-level']].androidJar;
					targets[id].aidl = apiLevelMap[basedOn['api-level']].aidl;
				}
			});

			return targets;
		});
}
