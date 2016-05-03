import fs from 'fs';
import { detect as linuxDetect } from './linux';
import path from 'path';
import * as util from './util';

const exe = util.exe;
const bat = util.bat;

const pgkVersionRegex = /Pkg\.Revision\s*=\s*(.+)/;

// const requiredSdkTools = {
// 	'adb': exe,
// 	'android': bat,
// 	'emulator': exe,
// 	'mksdcard': exe,
// 	'zipalign': exe,
// 	'aapt': exe,
// 	'aidl': exe,
// 	'dx': bat
// };

export class SDK {
	/**
	 * The path to the Android SDK.
	 * @type {String}
	 */
	path = null;

	/**
	 * A map of common SDK executables.
	 * @type {Object}
	 */
	executables = null;

	/**
	 * An array of all detected build tools. It's possisble that the build tools
	 * haven't been installed.
	 * @type {Array}
	 */
	buildTools = [];

	/**
	 * Details about the platform tools. It's possible that the platform tools
	 * haven't been installed.
	 * @type {Object}
	 */
	platformTools = {
		path: null,
		version: null
	};

	/**
	 * Details about the Android tools.
	 * @type {Object}
	 */
	tools = {
		path: null,
		version: null
	};

	/**
	 * The path to the proguard jar.
	 * @type {Object}
	 */
	proguard = {
		path: null
	};

	/**
	 * Creates the Android NDK descriptor instance.
	 *
	 * @param {String} dir - The path to an Android NDK.
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected dir to be a string');
		}

		dir = util.expandPath(dir);
		if (!util.existsSync(dir)) {
			throw new Error('Directory does not exist');
		}

		let tmp;
		const androidExecutable   = path.join(dir, 'tools', `android${bat}`);
		const emulatorExecutable  = path.join(dir, 'tools', `android${exe}`);
		const toolsPropertiesFile = path.join(dir, 'tools', 'source.properties');

		for (const file of [ androidExecutable, emulatorExecutable, toolsPropertiesFile ]) {
			if (!util.existsSync(file)) {
				throw new Error('Directory does not contain an Android NDK');
			}
		}

		this.path = dir;

		this.executables = {
			android: androidExecutable,
			emulator: emulatorExecutable,
			mksdcard: util.existsSync(tmp = path.join(dir, 'tools', `mksdcard${exe}`)) ? tmp : null,
			zipalign: util.existsSync(tmp = path.join(dir, 'tools', `zipalign${exe}`)) ? tmp : null,

			// other tools that will be detected during load()
			adb: null
		};

		const m = fs.readFileSync(toolsPropertiesFile).toString().match(pgkVersionRegex);
		this.tools = {
			path:    path.join(dir, 'tools'),
			version: m && m[1] || null
		};

		this.proguard.path = util.existsSync(tmp = path.join(dir, 'tools', 'proguard', 'lib', 'proguard.jar')) ? tmp : null;
	}

	/**
	 * Loads the details of an Android SDK directory.
	 *
	 * @returns {Promise}
	 */
	load() {
		return Promise.resolve()
			.then(() => {
				// detect the platform tools
				const adbExecutable               = path.join(this.path, 'platform-tools', `adb${exe}`);
				const platformToolsPropertiesFile = path.join(this.path, 'platform-tools', 'source.properties');
				if (util.existsSync(adbExecutable) && util.existsSync(platformToolsPropertiesFile)) {
					this.executables.adb = adbExecutable;

					const m = fs.readFileSync(platformToolsPropertiesFile).toString().match(pgkVersionRegex);
					this.platformTools = {
						path:    path.join(this.path, 'platform-tools'),
						version: m && m[1] || null
					};
				}

				// detect build tools


/*


						// Android SDK Tools v21 and older puts aapt and aidl in the platform-tools dir.
						// For SDK Tools v22 and later, they live in the build-tools/<ver> directory.
						aapt:     path.join(platformToolsDir, 'aapt' + exe),
						aidl:     path.join(platformToolsDir, 'aidl' + exe),
						dx:       path.join(platformToolsDir, 'dx' + bat)
					},
					dx: util.existsSync(dxJarPath) ? dxJarPath : null,

					let buildToolsVer = opts.buildToolVersion || null;
					if (!buildToolsVer) {
						// No selected version set, so find the newest installed build tools version
						const files = fs.readdirSync(buildToolsDir).sort().reverse();
						if (files.length > 0) {
							buildToolsVer = files[0];
						} else {
							//No buildTools installed
							return resolve();
						}
					}

					if (buildToolsVer) {
						const versionedBuildToolDir = path.join(buildToolsDir, buildToolsVer);
						const file = path.join(versionedBuildToolDir, 'source.properties');
						if (util.existsSync(file) && fs.statSync(versionedBuildToolDir).isDirectory()) {
							const m = fs.readFileSync(file).toString().match(pgkVersionRegex);
							if (m) {
								result.buildTools = {
									path: versionedBuildToolDir,
									version: m[1]
								};
								let file;
								util.existsSync(file = path.join(versionedBuildToolDir, 'aapt' + exe)) && (result.executables.aapt = file);
								util.existsSync(file = path.join(versionedBuildToolDir, 'aidl' + exe)) && (result.executables.aidl = file);
								util.existsSync(file = path.join(versionedBuildToolDir, 'dx' + bat)) && (result.executables.dx = file);
								util.existsSync(file = path.join(versionedBuildToolDir, 'zipalign' + exe)) && (result.executables.zipalign = file);
								util.existsSync(file = path.join(versionedBuildToolDir, 'lib', 'dx.jar')) && (result.dx = file);
							}
						}
					}

					let searchTools = [];
					for (const tool of Object.keys(requiredSdkTools)) {
						searchTools.push(
							util.findExecutable(result.executables[tool])
						);
					}

					Promise
						.all(searchTools)
						.then(paths => getAndroidTargets(result))
						.then(targets => {
							result.targets = targets;
							return resolve(new SDK(result));
						})
						// something went wrong, one of the required sdk tools might be missing
						// so not a sdk folder
						.catch(resolve);


*/


				return this;
			});
	}
}

/**
 * Detects installed Android SDK.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {String} [opts.buildToolVersion] - Specify the version of build tools.
 * @param {Boolean} [opts.bypassCache=false] - When true, re-detects installed
 * Android SDKs.
 * @param {String} [opts.sdkPath] - Path to a known Android SDK directory.
 * @param {Array} [opts.searchPaths] - An array of paths to search for SDKs.
 * This overrides the built-in list of search paths. Set to `null` when you
 * don't want any paths searched.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return util.cache('sdk', opts.bypassCache, () => {
		// always check the ndkPath and environment paths
		const searchPaths = [
			opts.sdkPath,
			process.env.ANDROID_SDK_ROOT,
			process.env.ANDROID_SDK
		];



		// TODO: search path for android executable!



		if (opts.searchPaths === undefined) {
			searchPaths.push.apply(searchPaths, util.searchPaths);
		} else if (Array.isArray(opts.searchPaths)) {
			searchPaths.push.apply(searchPaths, opts.searchPaths);
		}

		for (const dir of process.env.PATH.split(path.delimiter)) {
			if (fs.statSync(path.join(dir, `android${bat}`))) {
				searchPaths.push(path.dirname(dir));
			}
		}

		const results = {
			linux64bit: null,
			sdks:       []
		};
		const visited = {};

		return Promise
			.all(searchPaths.map(dir => new Promise((resolve, reject) => {
				dir = util.expandPath(dir);
				if (visited[dir]) {
					return resolve();
				}
				visited[dir] = 1;

				isSDK(dir)
					.then(sdk => sdk && results.push(sdk))
					.then(resolve)
					.catch(() => {
						// not an ndk, but the directory exists, so scan all of its
						// subdirectories
						Promise
							.all(fs.readdirSync(dir).map(name => {
								const subdir = path.join(dir, name);
								if (visited[subdir]) {
									return Promise.resolve();
								}
								visited[subdir] = 1;

								return isSDK(subdir)
									.then(sdk => sdk && results.push(sdk))
									.catch(() => Promise.resolve());
							}))
							.then(resolve)
							.catch(resolve);
					});
			})))
			.then(linuxDetect)
			.then(linux64bit => {
				results.linux64bit = linux64bit || null;
				return results;
			});
	});
}

/**
 * Determines if the specified directory contains an Android NDK and if so,
 * returns and NDK object.
 *
 * @param {String} dir - The directory to check.
 * @param {Object} [opts] - An object with various params to pass through into
 * the SDK constructor.
 * @returns {Promise}
 */
function isSDK(dir, opts = {}) {
	return new Promise((resolve, reject) => {
		if (!dir || !util.existsSync(dir)) {
			return resolve();
		}

		try {
			new SDK(dir).load(opts).then(resolve);
		} catch (e) {
			reject();
		}
	});
}

/**
 * Determins installed Android targets.
 *
 * @param {Object} sdk - An object containing the Android SDK info.
 * @returns {Promise}
 */
function getAndroidTargets(sdk) {
	if (!sdk || typeof sdk !== 'object') {
		return Promise.reject(new TypeError('Expected sdk to be an object.'));
	}

	return util
		.run(sdk.executables.android, ['list', 'target'])
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
			util.existsSync(addonsDir) && fs.readdirSync(addonsDir).forEach(subDir => {
				const dir = path.join(addonsDir, subDir);
				if (fs.statSync(dir).isDirectory()) {
					let file = path.join(dir, 'manifest.ini');

					if (!util.existsSync(file)) {
						file = path.join(dir, 'source.properties');
					}

					if (util.existsSync(file)) {
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

			for (const t of stdout.split(/\-\-\-\-\-\-+\n/)) {
				for (let chunk of t.split('\n\w')) {
					chunk = chunk.trim();
					if (!chunk) continue;
					const lines = chunk.split('\n');
					let m = lines.shift().match(idRegex);
					if (!m) continue;

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
								const key = line.substring(0, p).toLowerCase().trim().replace(/\s/g, '-');
								const value = line.substring(p+1).trim();
								const num = Number(value);
								switch (key) {
									case 'abis':
									case 'skins':
										for (let v of value.split(',')) {
											v = v.replace('(default)', '').trim();
											if (info[key].indexOf(v) === -1) {
												info[key].push(v);
											}
										}
										break;
									case 'tag/abis':
										// note: introduced in android sdk tools 22.6
										for (let v of value.split(',')) {
											let p = v.indexOf('/');
											v = (p === -1 ? v : v.substring(p + 1)).trim();
											if (info.abis.indexOf(v) === -1) {
												info.abis.push(v);
											}
										}
										break;
									case 'type':
										info[key] = value.toLowerCase();
										break;
									default:
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
						let srcProps = util.existsSync(srcPropsFile) ? fs.readFileSync(srcPropsFile).toString() : '';

						info.path = path.join(sdkPlatformDir, info.id);
						info.sdk = (function (m) { return m ? ~~m[1] : null; })(srcProps.match(/^AndroidVersion.ApiLevel=(.*)$/m));
						info.version = (function (m) { if (m) return m[1]; m = info.name.match(/Android (((\d\.)?\d\.)?\d)/); return m ? m[1] : null; })(srcProps.match(/^Platform.Version=(.*)$/m));
						info.androidJar = path.join(info.path, 'android.jar');
						info.aidl = path.join(info.path, 'framework.aidl');
						util.existsSync(info.aidl) || (info.aidl = null);

						apiLevelMap[info['api-level'] || info.id.replace('android-', '')] = info;
					} else if (info.type === 'add-on' && info['based-on']) {
						info.path = addons[info.name + '|' + info.vendor + '|' + info['based-on']['api-level'] + '|' + info.revision] || null;
						info.version = info['based-on']['android-version'];
						info.androidJar = null;
					}
				}
			}

			// all targets are processed, now try to fill in aidl & androidJar paths for  add-ons
			for (const id of Object.keys(targets)) {
				let basedOn = targets[id]['based-on'];
				if (targets[id].type === 'add-on' && basedOn && apiLevelMap[basedOn['api-level']]) {
					targets[id].androidJar = apiLevelMap[basedOn['api-level']].androidJar;
					targets[id].aidl = apiLevelMap[basedOn['api-level']].aidl;
				}
			}

			return targets;
		});
}
