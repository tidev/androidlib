import fs from 'fs';
import { GawkArray, GawkObject } from 'gawk';
import path from 'path';
import which from 'which';
import * as util from './util';

const archRegExp = /\w\-x86_64[\/\\]/m;
const releaseRegExp = /^(r(\d+)([A-Za-z])?)(?:\s+\(([^)]+)\))?$/;
const pgkVersionRegex = /Pkg\.Revision\s*=\s*(.+)/;
const versionRegExp = /^(\d+)(?:\.(\d+))?/;

/**
 * Android NDK descriptor.
 */
export class NDK extends GawkObject {
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

		const ndkbuild = path.join(dir, `ndk-build${util.cmd}`);
		const ndkgdb   = path.join(dir, `ndk-gdb${util.cmd}`);
		const ndkwhich = path.join(dir, 'ndk-which');
		for (const file of [ ndkbuild, ndkgdb, ndkwhich, path.join(dir, 'build'), path.join(dir, 'platforms') ]) {
			if (!util.existsSync(file)) {
				throw new Error('Directory does not contain an Android NDK');
			}
		}

		const values = {
			path: dir,
			name: null,
			version: null,
			arch: '32-bit',
			executables: {
				ndkbuild,
				ndkgdb,
				ndkwhich
			}
		};

		// first try to get the version from the RELEASE.TXT
		for (const name of fs.readdirSync(dir)) {
			if (name.toLowerCase() === 'release.txt') {
				const release = fs.readFileSync(path.join(dir, name)).toString().split('\n').shift().trim();
				// release comes back in the format "r10e (64-bit)", so we need
				// to extract a meaningful version number from that
				const m = release.match(releaseRegExp) || null;
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
			if (util.existsSync(sourceProps)) {
				const m = fs.readFileSync(sourceProps).toString().match(pgkVersionRegex);
				if (m && m[1]) {
					values.version = m[1].trim();
					const v = values.version.match(versionRegExp);
					if (v) {
						values.name = `r${v[1]}` + (v[2] ? String.fromCharCode('a'.charCodeAt() + ~~v[2]) : 'a');
					}
				}

				// try to determine the archtecture
				if (archRegExp.test(fs.readFileSync(values.executables.ndkwhich).toString())) {
					values.arch = '64-bit';
				}
			}
		}

		super(values);
	}
}

/**
 * Constructs an array of resolved paths to search.
 *
 * @param {Object} [opts] - Various options
 * @param {String} [opts.ndkPath] - A path to an Android NDK.
 * @param {Array} [opts.searchPaths] - An array of paths to search for NDKs.
 * This overrides the built-in list of search paths. Set to `null` when you
 * don't want any paths searched.
 * @returns {Array}
 */
function getSearchPaths(opts = {}) {
	const searchPaths = [ opts.ndkPath, process.env.ANDROID_NDK ];
	const finalPaths = [];

	if (opts.searchPaths === undefined) {
		searchPaths.push.apply(searchPaths, util.searchPaths);
	} else if (Array.isArray(opts.searchPaths)) {
		searchPaths.push.apply(searchPaths, opts.searchPaths);
	}

	for (let dir of searchPaths) {
		dir && finalPaths.push(util.expandPath(dir));
	}

	return finalPaths;
}

/**
 * Detects installed Android NDKs.
 *
 * @param {Object} [opts]
 * @param {Boolean} [opts.bypassCache=false] - When true, re-detects installed
 * Android NDKs.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	return util.cache('ndk', opts.bypassCache, () => {
		const results = new GawkArray;
		const visited = {};

		opts.searchPaths = getSearchPaths(opts);

		return Promise
			.all(opts.searchPaths.map(dir => new Promise((resolve, reject) => {
				if (visited[dir]) {
					return resolve();
				}
				visited[dir] = 1;

				isNDK(dir)
					.then(ndk => ndk && results.push(ndk))
					.then(resolve)
					// not an ndk, but the directory exists, so scan all of its
					// subdirectories
					.catch(() => Promise
						.all(fs.readdirSync(dir).map(name => {
							const subdir = path.join(dir, name);
							if (visited[subdir]) {
								return Promise.resolve();
							}
							visited[subdir] = 1;

							return isNDK(subdir)
								.then(ndk => ndk && results.push(ndk))
								.catch(() => Promise.resolve());
						}))
						.then(resolve)
						.catch(resolve)
					);
			})))
			.then(() => results);
	});
}

/**
 * Watches for changes and re-detects NDKs.
 *
 * @param {Object} [opts] - Various search path and chokidar options.
 * @returns {Promise}
 */
export function watch(opts = {}) {
	opts.bypassCache = true;
	opts.depth = 0;

	return detect(opts)
		.then(results => {
			return new util.Watcher(opts, (listener, info) => {
				detect(Object.assign({}, opts, { searchPaths: [ info.originalPath ] }))
					.then(listener);
			}).on('ready', listener => listener(results));
		});
}

/**
 * Determines if the specified directory contains an Android NDK and if so,
 * returns and NDK object.
 *
 * @param {String} dir - The directory to check.
 * @returns {Promise}
 */
function isNDK(dir) {
	return new Promise((resolve, reject) => {
		if (!dir || !util.existsSync(dir)) {
			return resolve();
		}

		try {
			resolve(new NDK(dir));
		} catch (e) {
			reject();
		}
	});
}
