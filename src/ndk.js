import 'babel-polyfill';
import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import which from 'which';

import * as util from './util';

const ndkBuild = util.ndkBuild;
let cache = null;

/**
 * Detects installed Android NDK.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.bypassCache=false] - When true, forces scan for all Paths.
 * @param {String} [opts.android.ndkPath] - Path to a known Android NDK directory.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	if (cache && !opts.bypassCache) {
		return Promise.resolve(cache);
	}

	const results = {
		ndk: {}
	};

	let ndkDir = opts.android && opts.android.ndkPath || process.env.ANDROID_NDK;
	let ndkPaths = [];
	const searchDirs = util.getSearchPaths();

	if (ndkDir) {
		ndkDir = util.resolveDir(ndkDir);
		if (fs.existsSync(ndkDir)) {
			ndkPaths.push(ndkDir);
		}
	}

	searchDirs
		.map(dir => util.resolveDir(dir))
		.map(dir => {
			fs.existsSync(dir) && fs.readdirSync(dir).forEach(sub => {
				ndkPaths.push(path.join(dir, sub));
			});
		});

	return Promise.resolve(ndkPaths)
		.then(paths => {
			return Promise.all(paths.map(p => {
				return isNDK(p);
			}));
		})
		.then(values => {
			results.ndk = values.filter(a => { return a; }).shift();
			cache = results;
		})
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

		const ndkbuild = path.join(dir, ndkBuild);
		if (!fs.existsSync(ndkbuild)) {
			return resolve();
		}

		return util.findExecutable(ndkbuild)
			.then(file => {
				const ndkdir = path.dirname(file);
				let releasetxt;
				let version;

				fs.readdirSync(ndkdir).forEach(file => {
					if (file.toLowerCase() === 'release.txt') {
						releasetxt = path.join(ndkdir, file);
						version = fs.readFileSync(releasetxt).toString().split('\n').shift().trim();
					}
				});

				const nkdInfo = {
					path: ndkdir,
					executables: {
						'ndkbuild': file
					},
					version: version
				};
				resolve(nkdInfo);
			})
			.catch(err => console.error);
	});
}

//TODO
// toolchain, architecture stuff:
// https://github.com/appcelerator/androidlib/blob/master/lib/env.js
