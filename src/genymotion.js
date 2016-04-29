import fs from 'fs';
import path from 'path';

import * as util from './util';

const exe = util.exe;
const bat = util.bat;
const genyRegexp = /genymo(tion|bile)/i;
const genyExeName = `genymotion${exe}`;
const vboxManagerExeName = `VBoxManage${exe}`;

/**
 * Detects Genymotion environment information.
 *
 * @param {Object} [opts] - An object with various params.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	const results = {
		path : null,
		home: null,
		virtualbox: null,
		executables: {
			genymotion: null,
			player: null,
			vboxmanage: null
		}
	};

	return Promise.all([
		detectGenymotion(opts),
		detectVirtualbox(opts)
	])
	.then(([genymotion, virtualbox]) => {
		if (genymotion) {
			results.path = genymotion.path;
			results.executables = genymotion.executables;
			results.home = genymotion.home;
		}

		if (virtualbox) {
			results.executables.vboxmanage = virtualbox.vboxmanage;
			results.virtualbox = virtualbox.version;
		}
		return results;
	});
}

function detectGenymotion(opts = {}) {
	const optsGenyPath = opts.genymotion && opts.genymotion.path;
	let searchDirs = util.getSearchPaths();
	let genyPaths = [];

	if (optsGenyPath) {
		searchDirs.unshift(optsGenyPath);
	}

	searchDirs
		.map(dir => util.expandPath(dir))
		.map(dir => {
			util.existsSync(dir) && fs.readdirSync(dir).forEach(sub => {
				let subdir = path.join(dir, sub);
				if (genyRegexp.test(subdir) && sub[0] !== '.' && fs.statSync(subdir).isDirectory()) {
					genyPaths.push(path.join(dir, sub));
				}
			});
		});

	return Promise
		.all(genyPaths.map(p => {
			const executable = util.scan(p, genyExeName);
			if (!executable) {
				return Promise.resolve();
			}

			// strip off the executable name to get the genymotion directory
			const dir = path.dirname(executable);

			let player = opts.genymotion && opts.genymotion.executables && opts.genymotion.executables.player;
			if (!player || !util.existsSync(player)) {
				player = path.join(dir, `player${exe}`);
			}
			if (!util.existsSync(player) && process.platform === 'darwin') {
				player = path.join(dir, 'player.app', 'Contents', 'MacOS', 'player');
			}
			if (!util.existsSync(player)) {
				player = null;
			}
			return {
				path: dir,
				executables: {
					genymotion: executable,
					player: player
				}
			};
		}))
		.then(results => {
			let geny;
			results.some(v => {
				if (v) {
					geny = v;
					return true;
				}
			});

			return geny;
		})
		.then(result => {
			// attempt to find the Genymotion home directory
			const genyHomeDir = opts.genymotion && opts.genymotion.home;
			let genymotionHomeDirs = [];

			if (util.existsSync(genyHomeDir)) {
				genymotionHomeDirs.push(genyHomeDir);
			}
			if (process.platform === 'win32') {
				genymotionHomeDirs.push('~/AppData/Local/Genymobile/Genymotion');
			} else {
				genymotionHomeDirs.push('~/.Genymobile/Genymotion', '~/.Genymotion');
			}

			for (const genyHome of genymotionHomeDirs) {
				const dir = util.expandPath(genyHome);
				if (util.existsSync(dir) && fs.statSync(dir).isDirectory()) {
					result.home = dir;
					break;
				}
			}
			return result;
		});
}

function detectVirtualbox(opts = {}) {
	const vboxManagePath = opts.genymotion && opts.genymotion.executables && opts.genymotion.executables.vboxmanage;
	let exePaths = [vboxManagerExeName];

	if (vboxManagePath && util.existsSync(vboxManagePath)) {
		exePaths.unshift(vboxManagePath);
	}

	return Promise
		.race(exePaths.map(e => {
			return util.findExecutable(e)
			.catch(err => Promise.resolve());
		}))
		.then(result => {
			if (!result) {
				const searchDirs = util.getSearchPaths();
				return Promise.race(searchDirs.map(dir => {
					dir = util.expandPath(dir);
					if (!util.existsSync(dir)) {
						return Promise.resolve();
					}
					const executable = util.scan(dir, vboxManagerExeName, 3);
					return Promise.resolve(executable);
				}));
			}

			return result;
		})
		.then(result => {
			return util.run(result, ['--version'])
				.then(({ code, stdout, stderr }) => {
					return {
						vboxmanage: result,
						version: code ? null : stdout.trim()
					};
				});
		});
}
