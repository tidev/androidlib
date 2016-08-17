// import appc from 'node-appc';
// import fs from 'fs';
// import { GawkObject } from 'gawk';
// import path from 'path';
//
// /**
//  * The Linux environment values.
//  * @type {GawkObject}
//  */
// const env = new GawkObject();
//
// /**
//  * Detect if we're using a 64-bit Linux OS and if it's missing 32-bit libraries.
//  *
//  * @param {Object} [opts] - An object with various params.
//  * @param {Boolean} [opts.force=false] - When true, re-detects the Linux
//  * environment.
//  * @returns {Promise} Resolves a GawkObject containing the Linux environment
//  * information.
//  */
// export function detect(opts = {}) {
// 	if (process.platform !== 'linux') {
// 		return Promise.resolve(null);
// 	}
//
// 	return Promise.resolve()
// 		.then(() => appc.util.cache('androidlib:linux', opts.force, () => {
// 			return Promise.resolve()
// 				.then(() => checkDpkg(opts.dpkgquery))
// 				.catch(err => checkDnf(opts.dnf))
// 				.catch(err => checkYum(opts.yum))
// 				.catch(err => Promise.resolve())
// 				.then(results => env.merge({ '32bit': results || null }));
// 		}))
// 		.then(results => opts.gawk ? results : results.toJS());
// }
//
// // lib32ncurses5 lib32stdc++6
// // 'libc6:i386', 'libncurses5:i386', 'libstdc++6:i386', 'zlib1g:i386'
//
// // dnf list installed glibc.i686 libstdc++.i686
//
// /**
//  * Determines if required 32-bit modules are installed in order for the Android
//  * emulator to be happy. This is Debian/Ubuntu specific.
//  *
//  * @param {String} [dpkg='dpkg-query'] - The path to the `dpkg-query` executable.
//  * @returns {Promise} Resolves an object of specific installed packages.
//  */
// function checkDpkg(dpkgquery = 'dpkg-query') {
// 	return appc.subprocess.which(dpkgquery)
// 		.catch(err => Promise.reject(err))
// 		.then(dpkgquery => {
// 			const required = {
// 				'libc6-i386': false,
// 				'lib32stdc++6': false
// //				'lib32ncurses5': false
// 			};
//
// 			// if emulator executable is 32-bit, need to make sure we have the 32-bit libs installed
//
// 			return appc.subprocess.run(dpkgquery, ['-l'].concat(Object.keys(required)))
// 				.then(({ stdout }) => {
// 					//
// 				});
// 		});
// 		//
// 		// 					for (const line of stdout.trim().split('\n')) {
// 		// 						if (line.indexOf(lib) !== -1) {
// 		// 							// we look for "ii" which means we want the "desired action"
// 		// 							// to be "installed" and the "status" to be "installed"
// 		// 							if (line.indexOf('ii') === 0) {
// 		// 								results[lib] = true;
// 		// 							}
// 		// 							break;
// 		// 						}
// 		// 					}
// 		// 				})
// 		// 				.catch(err => Promise.resolve());
// 		// 		}))
// 		// 		.then(() => results);
// 		// });
// }
//
// function checkDnf() {
// }
//
// function checkYum() {
// }
//
// function findRpm(rpm = 'rpm') {
// 	return appc.subprocess.which(rpm)
// 		.then(rpm => {
// 			return appc.subprocess.run(rpm, ['-qa', 'glibc', 'libstdc++'])
// 				.then(({ stdout }) => {
// 					const glibcRegExp = /^glibc\-/;
// 					const libstdcppRegExp = /^libstdc\+\+\-/;
// 					const i386RegExp = /\.i[36]86$/;
// 					const results = {
// 						'glibc:i386':     false,
// 						'libstdcpp:i386': false
// 					};
//
// 					for (const line of stdout.trim().split('\n')) {
// 						if (glibcRegExp.test(line) && i386RegExp.test(line)) {
// 							results['glibc:i386'] = true;
// 						} else if (libstdcppRegExp.test(line) && i386RegExp.test(line)) {
// 							results['libstdcpp:i386'] = true;
// 						}
// 					}
//
// 					return results;
// 				});
// 		})
// 		.catch(err => Promise.resolve());
// }
