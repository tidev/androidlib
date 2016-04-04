import fs from 'fs';
import path from 'path';
import which from 'which';

import * as util from './util';

const cmd = util.cmd;
const ndkBuild = `ndk-build${cmd}`;
const ndkGdb = `ndk-gdb${cmd}`;
let cache = null;

/**
 * Detects installed Android NDK.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.bypassCache=false] - When true, forces scan for all Paths.
 * @param {String} [opts.ndkPath] - Path to a known Android NDK directory.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	if (cache && !opts.bypassCache) {
		return Promise.resolve(cache);
	}

	const results = cache = {
		ndk: {}
	};

	let ndkDir = opts.ndkPath || process.env.ANDROID_NDK;
	const ndkPaths = [];
	const searchDirs = util.getSearchPaths();

	if (ndkDir) {
		ndkDir = util.expandPath(ndkDir);
		if (util.existsSync(ndkDir)) {
			ndkPaths.push(ndkDir);
		}
	}

	searchDirs
		.map(dir => {
			dir = util.expandPath(dir);
			if (util.existsSync(dir)) {
				fs.readdirSync(dir).forEach(sub => {
					ndkPaths.push(path.join(dir, sub));
				});
			}
		});

	return Promise
		.all(ndkPaths.map(p => isNDK(p)))
		.then(values => results.ndk = values.filter(a => { return a; }).shift())
		.then(() => results);
}

/**
 * Determins if the specified directory contains ndk-build and if so, returns the
 * NDK info.
 *
 * @param {String} dir - The directory to check.
 * @returns {Promise}
 */
function isNDK(dir) {
	return new Promise((resolve, reject) => {
		if (!dir) {
			return resolve();
		}

		const things = [ndkBuild, ndkGdb, 'build', 'prebuilt', 'platforms'];
		if (!things.every(thing => util.existsSync(path.join(dir, thing)))) {
			return resolve();
		}

		let version;
		fs.readdirSync(dir).forEach(file => {
			if (file.toLowerCase() === 'release.txt') {
				const releasetxt = path.join(dir, file);
				version = fs.readFileSync(releasetxt).toString().split('\n').shift().trim();
			}
		});

		// android NDK r11, release.txt file is removed
		// ndk version is in source.properties
		if (!version) {
			const sourceProps = path.join(dir, 'source.properties');
			if (util.existsSync(sourceProps)) {
				const m = fs.readFileSync(sourceProps).toString().match(/Pkg\.Revision\s*=\s*(.+)/m);
				if (m && m[1]) {
					version = m[1].trim();
				}
			}
		}

		const nkdInfo = {
			path: dir,
			executables: {
				ndkbuild: path.join(dir, ndkBuild),
				ndkgdb: path.join(dir, ndkGdb)
			},
			version: version
		};
		return resolve(nkdInfo);
	});
}

//TODO
// toolchain, architecture stuff:
// https://github.com/appcelerator/androidlib/blob/master/lib/env.js
