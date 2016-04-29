import fs from 'fs';
import path from 'path';
import which from 'which';
import * as util from './util';

const ndkBuild = `ndk-build${util.cmd}`;
const ndkGdb = `ndk-gdb${util.cmd}`;
const requiredFiles = [ ndkBuild, ndkGdb, 'ndk-which', 'build', 'platforms' ];
const archRegExp = /\w\-x86_64[\/\\]/m;
const releaseRegExp = /^(r(\d+)([A-Za-z])?)(?:\s+\(([^)]+)\))?$/;
const sourcePropsRegExp = /Pkg\.Revision\s*=\s*(.+)/m;
const versionRegExp = /^(\d+)(?:\.(\d+))?/;

let detectCache = null;
let detectPending = false;
let detectRequests = [];

/**
 * Android NDK descriptor.
 */
export class NDK {
	/**
	 * The path to the Android NDK.
	 * @type {String}
	 */
	path = null;

	/**
	 * The name of the Android NDK such as "r9d" or "r11c".
	 * @type {String}
	 */
	name = null;

	/**
	 * The version of the Android NDK.
	 * @type {String}
	 */
	version = null;

	/**
	 * The archtecture of the Android NDK. Value is "32-bit" or "64-bit".
	 * @type {String}
	 */
	arch = '32-bit';

	/**
	 * A map of common NDK executables.
	 * @type {Object}
	 */
	executables = {};

	/**
	 * Creates the Android NDK descriptor instance.
	 *
	 * @param {String} dir - The path to an Android NDK. This path MUST be valid.
	 */
	constructor(dir) {
		this.path = dir;

		this.executables = {
			ndkbuild: path.join(dir, ndkBuild),
			ndkgdb:   path.join(dir, ndkGdb),
			ndkwhich: path.join(dir, 'ndk-which')
		};

		// first try to get the version from the RELEASE.TXT
		for (const name of fs.readdirSync(dir)) {
			if (name.toLowerCase() === 'release.txt') {
				const release = fs.readFileSync(path.join(dir, name)).toString().split('\n').shift().trim();
				// release comes back in the format "r10e (64-bit)", so we need
				// to extract a meaningful version number from that
				const m = release.match(releaseRegExp) || null;
				if (m) {
					this.name = m[1];
					const minor = (m[3] ? m[3].toLowerCase() : 'a').charCodeAt() - 'a'.charCodeAt();
					this.version = `${m[2]}.${minor}`;
					if (m[4] && m[4].toLowerCase() === '64-bit') {
						this.arch = '64-bit';
					}
				}
				break;
			}
		}

		// android NDK r11, release.txt file is removed
		// ndk version is in source.properties
		if (!this.version) {
			const sourceProps = path.join(dir, 'source.properties');
			if (util.existsSync(sourceProps)) {
				const m = fs.readFileSync(sourceProps).toString().match(sourcePropsRegExp);
				if (m && m[1]) {
					this.version = m[1].trim();
					const v = this.version.match(versionRegExp);
					if (v) {
						this.name = `r${v[1]}` + (v[2] ? String.fromCharCode('a'.charCodeAt() + ~~v[2]) : 'a');
					}
				}

				// try to determine the archtecture
				if (archRegExp.test(fs.readFileSync(this.executables.ndkwhich).toString())) {
					this.arch = '64-bit';
				}
			}
		}
	}
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
	if (detectCache && !opts.bypassCache) {
		return Promise.resolve(detectCache);
	}

	if (detectPending) {
		return new Promise(resolve => {
			detectRequests.push(resolve);
		});
	}

	detectPending = true;

	// always check the ndkPath and environment paths
	const searchPaths = [
		opts.ndkPath,
		process.env.ANDROID_NDK
	];

	if (opts.searchPaths === undefined) {
		searchPaths.push.apply(searchPaths, util.searchPaths);
	} else if (Array.isArray(opts.searchPaths)) {
		searchPaths.push.apply(searchPaths, opts.searchPaths);
	}

	const results = [];

	return Promise
		.all(searchPaths.map(dir => new Promise((resolve, reject) => {
			isNDK(dir)
				.then(ndk => ndk && results.push(ndk))
				.then(resolve)
				.catch(() => {
					// scan all subdirectories
					Promise
						.all(fs.readdirSync(dir)
							.map(name => path.join(dir, name))
							.map(subdir => {
								return isNDK(subdir)
									.then(ndk => ndk && results.push(ndk))
									.catch(() => Promise.resolve());
							})
						)
						.then(resolve)
						.catch(resolve);
				});
		})))
		.then(() => {
			detectCache = results;
			detectPending = false;
			for (const resolve of detectRequests) {
				resolve(results);
			}
			detectRequests = [];
		})
		.then(() => results);
}

/**
 * Determines if the specified directory contains ndk-build and if so, returns
 * the Android NDK info.
 *
 * @param {String} dir - The directory to check.
 * @returns {Promise}
 */
function isNDK(dir) {
	return new Promise((resolve, reject) => {
		if (!dir) {
			return resolve();
		}

		dir = util.expandPath(dir);
		if (!util.existsSync(dir)) {
			return resolve();
		}

		for (const name of requiredFiles) {
			if (!util.existsSync(path.join(dir, name))) {
				return reject();
			}
		}

		resolve(new NDK(dir));
	});
}
