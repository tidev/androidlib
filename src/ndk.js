import appc from 'node-appc';
import debug from 'debug';
import fs from 'fs';
import path from 'path';
import systemPaths from './system-paths';

const log = debug('androidlib:ndk');

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
	depth:          1,
	env:            'ANDROID_NDK',
	exe:            `ndk-build${appc.subprocess.cmd}`,
	multiple:       true,
	checkDir:       checkDir,
	processResults: processResults,
	paths:          platformPaths[process.platform]
});

/**
 * Various regexes for parsing NDK info.
 */
const archRegExp = /\w\-x86_64[\/\\]/m;
const releaseRegExp = /^(r(\d+)([A-Za-z])?)(?:\s+\(([^)]+)\))?$/;
const pgkVersionRegex = /Pkg\.Revision\s*=\s*(.+)/;
const versionRegExp = /^(\d+)(?:\.(\d+))?/;

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
 * Android NDK information object.
 */
export class NDK extends appc.gawk.GawkObject {
	/**
	 * Creates the Android NDK descriptor instance.
	 *
	 * @param {String} dir - The path to an Android NDK.
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = appc.path.expand(dir);
		if (!appc.fs.existsSync(dir)) {
			throw new Error('Directory does not exist');
		}

		const ndkbuild = path.join(dir, 'ndk-build' + appc.subprocess.cmd);
		const ndkgdb   = path.join(dir, 'ndk-gdb' + appc.subprocess.cmd);
		const ndkwhich = path.join(dir, 'ndk-which');
		for (const file of [ ndkbuild, ndkgdb, ndkwhich, path.join(dir, 'build'), path.join(dir, 'platforms') ]) {
			if (!appc.fs.existsSync(file)) {
				throw new Error('Directory does not contain an Android NDK');
			}
		}

		const values = {
			path: dir,
			name: path.basename(dir),
			version: null,
			arch: '32-bit',
			executables: {
				'ndk-build': ndkbuild,
				'ndk-gdb':   ndkgdb,
				'ndk-which': ndkwhich
			}
		};

		// first try to get the version from the RELEASE.TXT
		for (const name of fs.readdirSync(dir)) {
			if (name.toLowerCase() === 'release.txt') {
				const release = fs.readFileSync(path.join(dir, name)).toString().split('\n').shift().trim();
				// release comes back in the format "r10e (64-bit)", so we need
				// to extract a meaningful version number from that
				const m = release.match(releaseRegExp);
				if (m) {
					values.name = m[1];
					const minor = (m[3] ? m[3].toLowerCase() : 'a').charCodeAt() - 'a'.charCodeAt();
					values.version = `${m[2]}.${minor}`;
					if (m[4] && m[4].toLowerCase() === '64-bit') {
						values.arch = '64-bit';
					}
				}
				break;
			}
		}

		// android NDK r11, release.txt file is removed
		// ndk version is in source.properties
		if (!values.version) {
			const sourceProps = path.join(dir, 'source.properties');
			if (appc.fs.existsSync(sourceProps)) {
				const m = fs.readFileSync(sourceProps).toString().match(pgkVersionRegex);
				if (m && m[1]) {
					values.version = m[1].trim();
					const v = values.version.match(versionRegExp);
					if (v) {
						if (!v[2]) {
							values.version = v[1] + '.0';
						}
						values.name = `r${v[1]}` + (v[2] ? String.fromCharCode('a'.charCodeAt() + ~~v[2]) : '');
					}
				}

				// try to determine the archtecture
				if (archRegExp.test(fs.readFileSync(values.executables['ndk-which']).toString())) {
					values.arch = '64-bit';
				}
			}
		}

		super(values);
	}
}

/**
 * Detects installed Android NDKs.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - When true, bypasses cache and
 * re-detects the Android NDKs.
 * @param {Boolean} [opts.ignorePlatformPaths=false] - When true, doesn't search
 * well known platform specific paths.
 * @param {Array} [opts.paths] - One or more paths to known Android NDKs.
 * @param {Boolan} [opts.gawk] - If true, returns the raw internal GawkArray,
 * otherwise returns a JavaScript array.
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
 * Detects installed Android NDKs and watches for changes.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - When true, bypasses cache and
 * re-detects the Android NDKs.
 * @param {Boolean} [opts.ignorePlatformPaths=false] - When true, doesn't search
 * well known platform specific paths.
 * @param {Array} [opts.paths] - One or more paths to known Android NDKs.
 * @param {Boolan} [opts.gawk] - If true, returns the raw internal GawkArray,
 * otherwise returns a JavaScript array.
 * @returns {WatchHandle}
 */
export function watch(opts = {}) {
	opts.watch = true;
	return engine
		.detect(opts);
}

/**
 * Determines if the specified directory contains a Android NDK and if so,
 * returns the NDK info.
 *
 * @param {String} dir - The directory to check.
 * @returns {Promise}
 */
function checkDir(dir) {
	return Promise.resolve()
		.then(() => new NDK(dir))
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
