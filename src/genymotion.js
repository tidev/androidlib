import appc from 'node-appc';
import fs from 'fs';
import path from 'path';

// const platformPaths = {
// 	darwin: [
// 		'/Applications/Genymotion.app/Contents/MacOS',
// 		'~/Applications/Genymotion.app/Contents/MacOS'
// 	],
// 	linux: [
// 		'/opt',
// 		'/usr',
// 		'~'
// 	],
// 	win32: [
// 		'%ProgramFiles%\\Genymobile\\Genymotion',
// 		'%ProgramFiles%\\Genymotion',
// 		'%ProgramFiles(x86)%\\Genymobile\\Genymotion',
// 		'%ProgramFiles(x86)%\\Genymotion'
// 	]
// };
//
// const engine = new appc.detect.Engine({
// 	depth:        1,
// 	exe:          `genymotion${appc.subprocess.exe}`,
// 	onCheckDir:   checkDir,
// 	onResults:    processResults,
// 	searchPaths:  platformPaths[process.platform]
// });
//
// const exe = appc.subprocess.exe;
//
// /**
//  * Resets the internal result cache. This is intended for testing purposes.
//  */
// export function resetCache() {
// 	appc.util.clearCache('androidlib:genymotion');
// }
//
// /**
//  * Genymotion information object.
//  */
// export class Genymotion extends GawkObject {
// 	constructor(dir) {
// 		if (typeof dir !== 'string' || !dir) {
// 			throw new TypeError('Expected directory to be a valid string');
// 		}
//
// 		dir = appc.path.expand(dir);
// 		if (!appc.fs.existsSync(dir)) {
// 			throw new Error('Directory does not exist');
// 		}
//
// 		const values = {
// 			path: dir,
// 			home: null,
// 			executables: {
// 				genymotion: path.join(dir, `genymotion${exe}`),
// 				player: process.platform === 'darwin'
// 					? path.join(dir, 'player.app', 'Contents', 'MacOS', 'player')
// 					: path.join(dir, `player${exe}`)
// 			},
// 			virtualbox: null
// 		};
//
// 		if (!appc.fs.existsSync(values.executables.genymotion) || !appc.fs.existsSync(values.executables.player)) {
// 			throw new Error('Directory does not contain a Genymotion installation');
// 		}
//
// 		const homeDirs = process.platform === 'win32'
// 			? [ '~/AppData/Local/Genymobile/Genymotion' ]
// 			: [ '~/.Genymobile/Genymotion', '~/.Genymotion' ];
// 		for (let homeDir of homeDirs) {
// 			if (appc.fs.existsSync(homeDir = appc.path.expand(homeDir))) {
// 				values.home = homeDir;
// 				break;
// 			}
// 		}
//
// 		super(values);
// 	}
//
// 	/**
// 	 * Detects VirtualBox.
// 	 *
// 	 * @returns {Promise} Resolves instance to this Genymotion object.
// 	 */
// 	init() {
// 		return Promise.resolve()
// 			.then(() => {
// 				if (process.platform === 'win32') {
// 					return appc.windows.registry.get('HKLM', '\\Software\\Oracle\\VirtualBox', 'InstallDir')
// 						.then(installDir => path.join(installDir, 'vboxmanage.exe'));
// 				}
// 				return appc.subprocess.which('vboxmanage');
// 			})
// 			.then(vboxmanage => {
// 				return appc.subprocess.run(vboxmanage, ['-version'])
// 					.then(({ stdout }) => {
// 						const version = stdout.split('\n')[0].trim();
// 						this.set('virtualbox', {
// 							vboxmanage,
// 							version
// 						});
// 					});
// 			})
// 			.catch(err => Promise.resolve())
// 			.then(() => this);
// 	}
// }
//
// /**
//  * Detects Genymotion environment.
//  *
//  * @param {Object} [opts] - An object with various params.
//  * @param {Boolean} [opts.force=false] - When true, bypasses cache and
//  * re-detects Genymotion.
//  * @param {Boolan} [opts.gawk=false] - If true, returns the raw internal
//  * `GawkObject`, otherwise returns a JavaScript object.
//  * @param {Boolean} [opts.ignorePlatformPaths=false] - When true, doesn't search
//  * well known platform specific paths.
//  * @param {Array} [opts.paths] - One or more paths to known JDKs.
//  * @returns {Promise} Resolves an object or GawkObject containing the values.
//  */
// export function detect(opts = {}) {
// 	return appc.util
// 		.cache('androidlib:genymotion', opts.force, () => {
// 			return Promise.resolve()
// 				.then(() => getPaths(opts))
// 				.then(paths => {
// 					return (function tryPath() {
// 						return new Promise((resolve, reject) => {
// 							const p = paths.shift();
//
// 							try {
// 								if (p) {
// 									return new Genymotion(p).init().then(resolve).catch(reject);
// 								}
//
// 								if (paths.length) {
// 									return tryPath().then(resolve).catch(reject);
// 								}
// 							} catch (e) {
// 								// squeltch
// 							}
//
// 							resolve(null);
// 						});
// 					}());
// 				})
// 				.then(genymotion => genymotion || new GawkNull);
// 		})
// 		.then(results => opts.gawk ? results : results.toJS());
// }
//
// /**
//  * Detects Genymotion and watches for changes.
//  *
//  * @param {Object} [opts] - An object with various params.
//  * @param {Boolean} [opts.force=false] - When true, bypasses cache and
//  * re-detects the JDKs.
//  * @param {Boolan} [opts.gawk=false] - If true, returns the raw internal
//  * `GawkArray`, otherwise returns a JavaScript array.
//  * @param {Boolean} [opts.ignorePlatformPaths=false] - When true, doesn't search
//  * well known platform specific paths.
//  * @param {Number} [opts.pathRescanInterval=30000] - The number of milliseconds
//  * to check if the search paths have changed. This is used on only Windows.
//  * @param {Array} [opts.paths] - One or more paths to known JDKs.
//  * @returns {WatchHandle}
//  */
// export function watch(opts = {}) {
// 	const handle = new appc.detect.WatchHandle;
// 	let timer = null;
//
// 	handle.unwatchers.set('__clearPathRescanTimer__', () => {
// 		clearTimeout(timer);
// 		timer = null;
// 	});
//
// 	function rescan(paths) {
// 		// const lookup = {};
// 		//
// 		// for (const dir of paths) {
// 		// 	lookup[dir] = 1;
// 		// 	if (!handle.unwatchers.has(dir)) {
// 		// 		handle.unwatchers.set(dir, appc.fs.watch(dir, _.debounce(evt => {
// 		//
// 		//
// 		// 			scanner.scan({ paths: pathInfo.paths, onlyPaths: [dir], force: true, detectFn: isJDK, depth: 1 })
// 		// 				.then(results => processJDKs(results, uuid, pathInfo.defaultPath))
// 		// 				.catch(err => {
// 		// 					handle.stop();
// 		// 					handle.emit('error', err);
// 		// 				});
// 		// 		})));
// 		// 	}
// 		// }
// 		//
// 		// for (const dir of handle.unwatchers.keys()) {
// 		// 	if (dir !== '__clearPathRescanTimer__' && !lookup[dir]) {
// 		// 		handle.unwatchers.delete(dir);
// 		// 	}
// 		// }
// 		//
// 		// if (!lastPathInfo || (lastPathInfo.paths < pathInfo.paths || lastPathInfo.paths > pathInfo.paths)) {
// 		// 	// need force a scan
// 		// 	scanner.scan({ paths: pathInfo.paths, force: true, detectFn: isJDK, depth: 1 })
// 		// 		.then(results => processJDKs(results, uuid, pathInfo.defaultPath))
// 		// 		.then(results => {
// 		// 			if (!jdks) {
// 		// 				jdks = results;
// 		// 				jdks.watch(evt => {
// 		// 					handle.emit('results', opts.gawk ? results : results.toJS());
// 		// 				});
// 		// 				handle.emit('results', opts.gawk ? jdks : jdks.toJS());
// 		// 			}
// 		// 		})
// 		// 		.catch(err => {
// 		// 			handle.stop();
// 		// 			handle.emit('error', err);
// 		// 		});
// 		// } else if (lastPathInfo.defaultPath !== pathInfo.defaultPath) {
// 		// 	// only need to update the default jdk
// 		// 	processJDKs(jdks._value, uuid, pathInfo.defaultPath);
// 		// }
// 		//
// 		// lastPathInfo = pathInfo;
// 		//
// 		// if (process.platform === 'win32') {
// 		// 	timer = setTimeout(() => getPathInfo(opts).then(rescan), pathRescanInterval);
// 		// }
// 	}
//
// 	Promise.resolve()
// 		.then(() => getPaths(opts))
// 		.then(rescan)
// 		.catch(err => {
// 			handle.stop();
// 			handle.emit('error', err);
// 		});
//
// 	return handle;
// }
//
// /**
//  * Returns an array of search paths.
//  *
//  * @param {Object} [opts] - Various options.
//  * @param {Boolean} [opts.ignorePlatformPaths=false] - When true, doesn't search
//  * well known platform specific paths.
//  * @param {Array} [opts.paths] - One or more paths to known JDKs.
//  * @returns {Promise} Resolves array of paths.
//  */
// function getPaths(opts) {
// 	return Promise.resolve()
// 		.then(() => {
// 			if (opts.ignorePlatformPaths) {
// 				return [];
// 			}
//
// 			if (process.platform === 'linux') {
// 				return Promise.resolve([
// 					'/opt',
// 					'/usr',
// 					'~'
// 				]);
// 			}
//
// 			if (process.platform === 'darwin') {
// 				return Promise.resolve([
// 					'/Applications/Genymotion.app/Contents/MacOS',
// 					'~/Applications/Genymotion.app/Contents/MacOS'
// 				]);
// 			}
//
// 			if (process.platform === 'win32') {
// 				return Promise.resolve([
// 					'%ProgramFiles%\\Genymobile\\Genymotion',
// 					'%ProgramFiles%\\Genymotion',
// 					'%ProgramFiles(x86)%\\Genymobile\\Genymotion',
// 					'%ProgramFiles(x86)%\\Genymotion'
// 				]);
// 			}
//
// 			return [];
// 		})
// 		.then(platformPaths => appc.detect.getPaths({
// 			executable: 'genymotion' + appc.subprocess.exe,
// 			paths: (platformPaths || []).concat(opts.paths).filter(p => p)
// 		}));
// }
