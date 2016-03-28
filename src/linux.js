import fs from 'fs';
import path from 'path';

import * as util from './util';

/**
 * Detect if we're using a 64-bit Linux OS that's missing 32-bit libraries.
 *
 * @param {Object} [opts] - An object with various params.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	if (process.platform !== 'linux' ||  process.arch !== 'x64') {
		return Promise.resolve();
	}

	const result = {
		libGL: util.existsSync('/usr/lib/libGL.so'),
		i386arch: null,
		'libc6:i386': null,
		'libncurses5:i386': null,
		'libstdc++6:i386': null,
		'zlib1g:i386': null,
		glibc: null,
		libstdcpp: null
	};

	return Promise
		.all([
			findDpkg(),
			findDpkgQuery(),
			findRpm()
		])
		.then(([dpkg, dpkgquery, rpm]) => {
			if (dpkg) {
				result.i386arch = dpkg && !!dpkg.i386;
			}

			if (dpkgquery) {
				Object.assign(result, dpkgquery);
			}

			if (rpm) {
				result.glibc = rpm.glibc;
				result.libstdcpp = rpm.libstdcpp;
			}
		})
		.then(() => result);
}

function findDpkg() {
	let result = {};
	return util
		.findExecutable('dpkg')
		.then(dpkg => {
			if (!dpkg) {
				return Promise.resolve();
			}

			const flags = ['--print-architecture', '--print-foreign-architectures'];
			return Promise.all(flags.map(f => {
				return util.run(dpkg, [f])
					.then((code, stdout, stderr) => {
						stdout.split('\n').forEach(line => {
							(line = line.trim()) && (result[line] = 1);
						});
					});
			}));
		})
		.then(() => result);
}

function findDpkgQuery() {
	let result = {};
	return util
		.findExecutable('dpkg-query')
		.then(dpkgquery => {
			if (!dpkgquery) {
				return Promise.resolve();
			}

			const libs = ['libc6:i386', 'libncurses5:i386', 'libstdc++6:i386', 'zlib1g:i386'];
			return Promise.all(libs.map(lib => {
				return util.run(dpkgquery, ['-l', lib])
					.then((code, out, err) => {
						result[lib] = false;
						if (!code) {
							const lines = out.split('\n');
							for (let i = 0, l = lines.length; i < l; i++) {
								if (lines[i].indexOf(lib) !== -1) {
									// we look for "ii" which means we want the "desired action"
									// to be "installed" and the "status" to be "installed"
									if (lines[i].indexOf('ii') === 0) {
										result[lib] = true;
									}
									break;
								}
							}
						}
					});
			}));
		})
		.then(() => result);
}

function findRpm() {
	return util
		.findExecutable('rpm')
		.then(rpm => {
			if (!rpm) {
				return Promise.resolve();
			}

			let result = {};
			return util
				.run(rpm, ['-qa'])
				.then((code, stdout, stderr) => {
					stdout.split('\n').forEach(line => {
						if (/^glibc\-/.test(line)) {
							if (/\.i[36]86$/.test(line)) {
								result.glibc = true;
							} else if (result.glibc !== true) {
								result.glibc = false;
							}
						}
						if (/^libstdc\+\+\-/.test(line)) {
							if (/\.i[36]86$/.test(line)) {
								result.libstdcpp = true;
							} else if (result.libstdcpp !== true) {
								result.libstdcpp = false;
							}
						}
					});
					return result;
				});
		});
}
