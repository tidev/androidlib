import appc from 'node-appc';
import debug from 'debug';
import fs from 'fs';
import path from 'path';
import systemPaths from './system-paths';

const log = debug('androidlib:sdk');

const platformPaths = {
	darwin: [
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local',
		'~'
	],
	linux: [
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local',
		'~'
	],
	win32: [
		'%SystemDrive%',
		'%ProgramFiles%',
		'%ProgramFiles(x86)%',
		'%CommonProgramFiles%',
		'~'
	]
};

const engine = new appc.detect.Engine({
	depth:                1,
	env:                  [ 'ANDROID_SDK_ROOT', 'ANDROID_SDK' ],
	exe:                  `android${appc.subprocess.bat}`,
	multiple:             true,
	checkDir:             checkDir,
	processResults:       processResults,
	registryKeys: {
		root: 'HKLM',
		key: 'Software\\Wow6432Node\\Android SDK Tools',
		name: 'Path'
	},
	registryPollInterval: 15000,
	paths:                platformPaths[process.platform]
});

const exe = appc.subprocess.exe;
const bat = appc.subprocess.bat;
const pkgPropRegExp = /^([^=]*)=\s*(.+)$/;

/**
 * A map of all required commands and their extension.
 * @type {Object}
 */
const executables = {
	buildTools: {
		aapt: exe,
		aidl: exe,
		zipalign: exe
	},
	platformTools: {
		adb: exe
	},
	tools: {
		android: bat,
		emulator: exe,
		mksdcard: exe
	}
};

/**
 * Resets the internal detection result cache. This is intended for testing
 * purposes.
 *
 * @param {Boolean} [reinit=false] - When true, the detect will re-initialize
 * during the next detect call.
 */
export function resetCache(reinit) {
	engine.cache = {};
	if (reinit) {
		engine.initialized = false;
	}
}

/**
 * Android SDK information object.
 */
export class SDK extends appc.gawk.GawkObject {
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = appc.path.expand(dir);
		if (!appc.fs.isDir(dir)) {
			throw new Error('Directory does not exist or is actually a file');
		}

		const toolsDir     = path.join(dir, 'tools');
		const proguardFile = path.join(toolsDir, 'proguard', 'lib', 'proguard.jar');

		const toolsProps = readProps(path.join(toolsDir, 'source.properties'));
		if (!toolsProps) {
			throw new Error('Directory does not contain a valid Android SDK');
		}

		if (!toolsProps['Pkg.Revision']) {
			throw new Error('Directory does not contain a valid Android SDK; bad source.properties');
		}

		const values = {
			path:            dir,
			buildTools:      [],
			platformTools: {
				executables: {},
				path:        null,
				version:     null
			},
			proguard:        appc.fs.isFile(proguardFile) ? proguardFile : null,
			targets:         [],
			tools: {
				executables:         detectExecutables(toolsDir, 'tools', true),
				minPlatformToolsRev: +toolsProps['Platform.MinPlatformToolsRev'] || null,
				path:                toolsDir,
				version:             toolsProps['Pkg.Revision']
			}
		};

		/**
		 * Detect build tools
		 */
		const buildToolsDir = path.join(dir, 'build-tools');
		if (appc.fs.isDir(buildToolsDir)) {
			for (const name of fs.readdirSync(buildToolsDir)) {
				const dir = path.join(buildToolsDir, name);
				if (appc.fs.isDir(dir)) {
					const dxFile = path.join(dir, 'lib', 'dx.jar');
					const buildToolsProps = readProps(path.join(dir, 'source.properties'));
					values.buildTools.push({
						dx:          appc.fs.isFile(dxFile) ? dxFile : null,
						executables: detectExecutables(dir, 'buildTools'),
						path:        dir,
						version:     buildToolsProps && buildToolsProps['Pkg.Revision'] || null
					});
				}
			}
		}

		/**
		 * Detect platform tools
		 */
		const platformToolsDir = path.join(dir, 'platform-tools');
		if (appc.fs.isDir(platformToolsDir)) {
			const platformToolsProps = readProps(path.join(platformToolsDir, 'source.properties'));
			values.platformTools.executables = detectExecutables(platformToolsDir, 'platformTools');
			values.platformTools.path        = platformToolsDir;
			values.platformTools.version     = platformToolsProps && platformToolsProps['Pkg.Revision'] || null;
		}

		/**
		 * Detect system images
		 */
		const systemImages = {};
		const systemImagesDir = path.join(dir, 'system-images');
		if (appc.fs.isDir(systemImagesDir)) {
			for (const platform of fs.readdirSync(systemImagesDir)) {
				const platformDir = path.join(systemImagesDir, platform);
				if (appc.fs.isDir(platformDir)) {
					for (const tag of fs.readdirSync(platformDir)) {
						const tagDir = path.join(platformDir, tag);
						if (appc.fs.isDir(tagDir)) {
							for (const abi of fs.readdirSync(tagDir)) {
								const abiDir = path.join(tagDir, abi);
								const props = readProps(path.join(abiDir, 'source.properties'));
								if (props && props['AndroidVersion.ApiLevel'] && props['SystemImage.TagId'] && props['SystemImage.Abi']) {
									const id = 'android-' + (props['AndroidVersion.CodeName'] || props['AndroidVersion.ApiLevel']);
									const tag = props['SystemImage.TagId'];
									const skinsDir = path.join(abiDir, 'skins');

									systemImages[id] || (systemImages[id] = {});
									systemImages[id][tag] || (systemImages[id][tag] = []);
									systemImages[id][tag].push({
										abi: props['SystemImage.Abi'],
										skins: appc.fs.isDir(skinsDir) ? fs.readdirSync(skinsDir).map(name => {
											return appc.fs.isFile(path.join(skinsDir, name, 'hardware.ini')) ? name : null;
										}).filter(x => x) : []
									});
								}
							}
						}
					}
				}
			}
		}

		/**
		 * Detect targets
		 */
		const platformsDir = path.join(dir, 'platforms');
		const platforms = [];
		if (appc.fs.isDir(platformsDir)) {
			for (const name of fs.readdirSync(platformsDir)) {
				const info = loadPlatform(path.join(platformsDir, name), systemImages);
				info && platforms.push(info);
			}
		}

		const addonsDir = path.join(dir, 'add-ons');
		const addons = [];
		if (appc.fs.isDir(addonsDir)) {
			for (const name of fs.readdirSync(addonsDir)) {
				const info = loadAddon(path.join(addonsDir, name), platforms, systemImages);
				info && addons.push(info);
			}
		}

		function sortFn(a, b) {
			if (a.codename === null) {
				if (b.codename !== null && a.apiLevel === b.apiLevel) {
					// sort GA releases before preview releases
					return -1;
				}
			} else if (a.apiLevel === b.apiLevel) {
				return b.codename === null ? 1 : a.codename.localeCompare(b.codename);
			}

			return a.apiLevel - b.apiLevel;
		}

		values.targets = platforms.sort(sortFn).concat(addons.sort(sortFn));

		super(values);
	}
}

/**
 * Reads and parses the specified properties file into an key/value object.
 *
 * @param {String} file - The properties file to parse.
 * @returns {Object|null}
 */
function readProps(file) {
	if (!appc.fs.isFile(file)) {
		return null;
	}

	const props = {};
	for (const line of fs.readFileSync(file).toString().split('\n')) {
		const m = line.match(pkgPropRegExp);
		if (m) {
			props[m[1].trim()] = m[2].trim();
		}
	}
	return props;
}

/**
 * Detects if the specified directory contains an Android platform target.
 *
 * @param {String} dir - The directory containing a source.properties file
 * to load the version from.
 * @param {Object} systemImages - An object of system images used to determine
 * the target's available ABIs.
 * @returns {Object|null}
 */
function loadPlatform(dir, systemImages) {
	// read in the properties
	const sourceProps = readProps(path.join(dir, 'source.properties'));
	const apiLevel = sourceProps ? ~~sourceProps['AndroidVersion.ApiLevel'] : null;
	if (!sourceProps || !apiLevel || !appc.fs.isFile(path.join(dir, 'build.prop'))) {
		return null;
	}

	// read in the sdk properties, if exists
	const sdkProps = readProps(path.join(dir, 'sdk.properties'));

	// detect the available skins
	const skinsDir = path.join(dir, 'skins');
	const skins = appc.fs.isDir(skinsDir) ? fs.readdirSync(skinsDir).map(name => {
		return appc.fs.isFile(path.join(skinsDir, name, 'hardware.ini')) ? name : null;
	}).filter(x => x) : [];
	let defaultSkin = sdkProps && sdkProps['sdk.skin.default'];
	if (skins.indexOf(defaultSkin) === -1 && skins.indexOf(defaultSkin = 'WVGA800') === -1) {
		defaultSkin = skins[skins.length - 1] || null;
	}

	const apiName = sourceProps['AndroidVersion.CodeName'] || apiLevel;
	const id = `android-${apiName}`;
	let tmp;

	const abis = {};
	if (systemImages[id]) {
		for (const type of Object.keys(systemImages[id])) {
			for (const info of systemImages[id][type]) {
				abis[type] || (abis[type] = []);
				abis[type].push(info.abi);

				for (const skin of info.skins) {
					if (skins.indexOf(skin) === -1) {
						skins.push(skin);
					}
				}
			}
		}
	}

	return {
		id:          id,
		name:        'Android ' + sourceProps['Platform.Version'] + (sourceProps['AndroidVersion.CodeName'] ? ' (Preview)' : ''),
		type:        'platform',
		apiLevel:    apiLevel,
		codename:    sourceProps['AndroidVersion.CodeName'] || null,
		revision:    +sourceProps['Layoutlib.Revision'] || null,
		path:        dir,
		version:     sourceProps['Platform.Version'],
		abis:        abis,
		skins:       skins,
		defaultSkin: defaultSkin,
		minToolsRev: +sourceProps['Platform.MinToolsRev'] || null,
		androidJar:  appc.fs.isFile(tmp = path.join(dir, 'android.jar')) ? tmp : null,
		aidl:        appc.fs.isFile(tmp = path.join(dir, 'framework.aidl')) ? tmp : null
	};
}

/**
 * Detects if the specified directory contains an Android add-on target.
 *
 * @param {String} dir - The directory containing a source.properties file
 * to load the version from.
 * @param {Array} A list of all installed Android platform targets.
 * @param {Object} systemImages - An object of system images used to determine
 * the target's available ABIs.
 * @returns {Object|null}
 */
function loadAddon(dir, platforms, systemImages) {
	// read in the properties
	const sourceProps = readProps(path.join(dir, 'source.properties'));
	const apiLevel = sourceProps ? ~~sourceProps['AndroidVersion.ApiLevel'] : null;
	if (!sourceProps || !apiLevel || !sourceProps['Addon.VendorDisplay'] || !sourceProps['Addon.NameDisplay']) {
		return null;
	}

	let basedOn = null;
	for (const platform of platforms) {
		if (platform.codename === null && platform.apiLevel === apiLevel) {
			basedOn = platform;
			break;
		}
	}

	return {
		id:          sourceProps['Addon.VendorDisplay'] + ':' + sourceProps['Addon.NameDisplay'] + ':' + apiLevel,
		name:        sourceProps['Addon.NameDisplay'],
		type:        'add-on',
		apiLevel:    apiLevel,
		revision:    +sourceProps['Pkg.Revision'] || null,
		codename:    sourceProps['AndroidVersion.CodeName'] || null,
		path:        dir,
		basedOn:     basedOn && basedOn.id || null,
		abis:        basedOn && basedOn.abis || null,
		skins:       basedOn && basedOn.skins || null,
		defaultSkin: basedOn && basedOn.defaultSkin || null,
		minToolsRev: basedOn && basedOn.minToolsRev || null,
		androidJar:  basedOn && basedOn.androidJar || null,
		aidl:        basedOn && basedOn.aidl || null
	};
}

/**
 * Detects the existence of executables for a given type.
 *
 * @param {String} dir - The directory to search for the executables.
 * @param {String} type - The type of executables to find.
 * @param {Boolean} [throwOnMissing=false] - When true, throws an error if an
 * executable cannot be found.
 * @returns {Object}
 */
function detectExecutables(dir, type, throwOnMissing) {
	const results = {};

	for (const executable of Object.keys(executables[type])) {
		try {
			const file = path.join(dir, executable + executables[type][executable]);
			results[executable] = null;
			if (fs.statSync(file).isFile()) {
				results[executable] = file;
			}
		} catch (e) {
			if (throwOnMissing) {
				throw new Error(`Directory does not contain a valid Android SDK; missing executable "${executable}"`);
			}
		}
	}

	return results;
}



// * @param {String} [opts.buildToolVersion] - Specify the version of build tools.



/**
 * Detects installed Android SDKs.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - When true, bypasses cache and
 * re-detects the Android NDKs.
 * @param {Boolan} [opts.gawk] - If true, returns the raw internal GawkArray,
 * otherwise returns a JavaScript array.
 * @param {Array} [opts.paths] - One or more paths to known Android NDKs.
 * @returns {Promise} Resolves an array or GawkArray containing the values.
 */
export function detect(opts = {}) {
	return new Promise((resolve, reject) => {
		engine
			.detect(opts)
			.on('results', resolve)
			.on('error', reject);
	});
}

/**
 * Detects installed Android SDKs and watches for changes.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - When true, bypasses cache and
 * re-detects the Android NDKs.
 * @param {Boolan} [opts.gawk] - If true, returns the raw internal GawkArray,
 * otherwise returns a JavaScript array.
 * @param {Array} [opts.paths] - One or more paths to known Android NDKs.
 * @returns {Handle}
 */
export function watch(opts = {}) {
	opts.watch = true;
	opts.redetect = true;
	return engine
		.detect(opts);
}

/**
 * Determines if the specified directory contains a Android SDK and if so,
 * returns the SDK info.
 *
 * @param {String} dir - The directory to check.
 * @returns {Promise}
 */
function checkDir(dir) {
	return Promise.resolve()
		.then(() => new SDK(dir))
		.catch(err => {
			log('checkDir()', err, dir);
			return Promise.resolve();
		});
}

/**
 * Sorts the results and assigns a default.
 *
 * @param {Array} results - An array of results.
 * @param {*} previousValue - The previous value or `undefined` if there is no
 * previous value.
 * @param {Engine} engine - The detect engine instance.
 */
function processResults(results, previousValue, engine) {
	let foundDefault = false;

	if (results.length > 1) {
		results.sort((a, b) => appc.version.compare(a.get('version').toJS(), b.get('version').toJS()));
	}

	// loop over all of the new results and set default version and copy the gawk
	// watchers
	for (const result of results) {
		if (engine.defaultPath && result.get('path').toJS() === engine.defaultPath) {
			result.set('default', true);
			foundDefault = true;
		} else {
			result.set('default', false);
		}

		// since we're going to overwrite the cached GawkArray with a new one,
		// we need to copy over the watchers for existing watched GawkObjects
		if (previousValue instanceof appc.gawk.GawkObject) {
			for (const cachedResult of previousValue._value) {
				if (cachedResult.get('version') === result.get('version')) {
					result._watchers = cachedResult._watchers;
					break;
				}
			}
		}
	}

	// no default found the system path, so just select the last one as the default
	if (!foundDefault && results.length) {
		// pick the newest
		results[results.length-1].set('default', true);
	}
}
