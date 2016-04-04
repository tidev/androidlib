import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

import * as util from '../util';
import ADB from '../adb';

const exe = util.exe;
const bat = util.bat;

/**
 * Detects all existing Genymotion emulators.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.genymotion.path] - Genymotion path.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	const results = {
		path : null,
		home: null,
		virtualbox: null,
		executables: [],
		avds: []
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
			results.avds = virtualbox.avds;
		}

		return results;
	});
}

function scan(parent, pattern, depth) {
	const files = fs.readdirSync(parent);
	for (let i = 0, l = files.length; i < l; i++) {
		const name = files[i];
		const file = path.join(parent, name);
		const stat = fs.statSync(file);
		let result;
		if (stat.isFile() && name === pattern) {
			return file;
		} else if (stat.isDirectory()) {
			try {
				if (depth === undefined) {
					result = scan(file, pattern);
				} else if (depth > 0){
					result = scan(file, pattern, depth - 1);
				}
			} catch (err) {
				// skip
			}

			if (result) {
				return result;
			}
		}
	}
}

function detectGenymotion(opts = {}) {
	const genyRegexp = /genymo(tion|bile)/i;
	const executableName = 'genymotion' + exe;
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
			const executable = scan(p, executableName);
			if (!executable) {
				return Promise.resolve();
			}

			// strip off the executable name to get the genymotion directory
			const dir = path.dirname(executable);

			let player = opts.genymotion && opts.genymotion.executables && opts.genymotion.executables.player;
			if (!player || !util.existsSync(player)) {
				player = path.join(dir, 'player' + exe);
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

			for (let i = 0, j = genymotionHomeDirs.length; i < j; i++) {
				const dir = util.expandPath(genymotionHomeDirs[i]);
				if (util.existsSync(dir) && fs.statSync(dir).isDirectory()) {
					result.home = dir;
					break;
				}
			}

			return result;
		});
}

function detectVirtualbox(opts = {}) {
	const executableName = 'VBoxManage' + exe;
	const vboxManagePath = opts.genymotion && opts.genymotion.executables && opts.genymotion.executables.vboxmanage;
	let exePaths = [executableName];

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
				const executableName = 'VBoxManage' + exe;
				let searchDirs = util.getSearchPaths();

				return Promise.race(searchDirs.map(dir => {
					dir = util.expandPath(dir);
					if (!util.existsSync(dir)) {
						return Promise.resolve();
					}
					const executable = scan(dir, executableName, 3);
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
		})
		.then(result => {
			// find all AVDs
			const vboxmanage = result.vboxmanage;
			if (vboxmanage) {
				return getVMInfo(opts, vboxmanage)
					.then(emus => {
						result.avds = emus;
						return result;
					});
			}

			return result;
		});
}

function getVMInfo(opts, vboxmanage) {
	return util.run(vboxmanage, ['list', 'vms'])
		.then(({ code, stdout, stderr }) => {
			if (code) {
				return Promise.resolve();
			}

			return Promise.all(stdout.split('\n').map(line => {
				line = line.trim();
				if (!line) return Promise.resolve();

				const m = line.match(/^"(.+)" \{(.+)\}$/);
				if (!m) return Promise.resolve();

				let emu = {
					name: m[1],
					guid: m[2],
					type: 'genymotion',
					abi: 'x86',
					googleApis: null, // null means maybe since we don't know for sure unless the emulator is running
					'sdk-version': null
				};

				return util.run(vboxmanage, ['guestproperty', 'enumerate', emu.guid])
					.then(({ code, stdout, stderr }) => {
						if (!code) {
							for (let line in stdout.split('\n')) {
								const m = line.trim().match(/Name: (\S+), value: (\S*), timestamp:/);
								if (m) {
									switch (m[1]) {
										case 'android_version':
											emu['sdk-version'] = emu.target = m[2];
											break;
										case 'genymotion_version':
											emu.genymotion = m[2];
											break;
										case 'hardware_opengl':
											emu.hardwareOpenGL = !!parseInt(m[2]);
											break;
										case 'vbox_dpi':
											emu.dpi = ~~m[2];
											break;
										case 'vbox_graph_mode':
											emu.display = m[2];
											break;
										case 'androvm_ip_management':
											emu.ipaddress = m[2];
											break;
									}
								}
							}
						}

						// if the virtual machine does not define the genymotion version, then
						// it's not a Genymotion virtual machine
						if (!emu.genymotion) {
							emu = null;
						}

						// this is a hack, but by default new Genymotion emulators that have Google APIs will
						// say "Google Apps" in the name, so if we find that, assume it has Google APIs
						if (emu && /google apps/i.test(emu.name)) {
							emu.googleApis = true;
						}

						// there's an ip address, then the Genymotion emulator is running and
						// check if the Google APIs are installed
						if (emu && emu.ipaddress) {
							let adb = new ADB();
							return adb.shell(emu.ipaddress + ':5555', '[ -f /system/etc/g.prop ] && cat /system/etc/g.prop || echo ""')
								.then(out => {
									emu.googleApis = out ? out.toString().indexOf('gapps') != -1 : null;
									return emu;
								});
						} else {
							return emu;
						}
					});
			}));
		})
		.then(results => {
			return results.filter(a => { return a; });
		});
}

/**
 * Detects if a specific Genymotion VM is running and if so, returns
 * the emulator definition object.
 *
 * @param {Object} emu - The Android emulator avd definition.
 * @param {Array<Object>} devices - An array of device definition objects.
 * @param {Object} opts - Various options.
 * @returns {Promise}
 */
export function isRunning(emu, devices, opts = {}) {
	if (!devices.length || emu.type !== 'genymotion') {
		return Promise.resolve(false);
	}

	return detectVirtualbox(opts)
		.then(result => {
			const emus = result && result.avds.filter(e => { return e && e.name == emu.name && !!emu.ipaddress; }).shift();
			if (emus) {
				emus.id = `${emu.ipaddress}:5555`;
				return emus;
			}
			return false;
		});
}

/**
 * Detects if a specific device name is an Genymotion emulator.
 *
 * @param {String} deviceId - The id of the emulator.
 * @param {Object} opts - Various options.
 * @returns {Promise}
 */
 export function isEmulator(deviceId, opts = {}) {
	return detectVirtualbox()
		.then(result => result && result.avds.filter(e => { return e && deviceId.includes(e.ipaddress); }).shift());
 }

 /**
 * Launches the specified Genymotion emulator.
 *
 * @param {Object} emu - An emulator object.
 * @param {Object} opts - Emulator options object.
 * @param {String} [opts.titaniumHomeDir="~/.titanium"] - The Titanium home directory.
 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Genymotion environment detection cache and re-queries the system.
 * @param {String} [opts.cwd] - The current working directory to pass into spawn().
 * @param {Array|String} [opts.stdio="ignore"] - The stdio configuration to pass into spawn().
 * @param {Object} [opts.env] - The environment variables to pass into spawn().
 * @param {Boolean} [opts.detached=true] - The detached flag to pass into spawn().
 * @param {Number} [opts.uid] - The user id to pass into spawn().
 * @param {Number} [opts.gid] - The group id to pass into spawn().
 * @returns {Promise}
 */
export function start(emu, opts = {}) {
	return detect(opts)
		.then(results => {
			if (!results) return Promise.resolve();

			const emuopts = {
				detached: opts.hasOwnProperty('detached') ? !!opts.detached : true,
				stdio: opts.stdio || 'ignore'
			};
			opts.cwd && (emuopts.cwd = opts.cwd);
			opts.env && (emuopts.env = opts.env);
			opts.uid && (emuopts.uid = opts.uid);
			opts.gid && (emuopts.gid = opts.gid);

			emu.emit('message', `Starting emulator "${emu.name}"`);

			let child = spawn(results.executables.player, ['--vm-name', emu.name], emuopts);
			emu.pid = child.pid;

			child.stdout && child.stdout.on('data', data => emu.emit('stdout', data));
			child.stderr && child.stderr.on('data', data => emu.emit('stderr', data));
			child.on('error', err => emu.emit('error', err));
			child.on('close', (code, signal) => emu.emit('exit', code, signal));

			child.unref();
		});
}

 /**
 * Stops the specified Genymotion emulator.
 *
 * @param {String} name - The name of the emulator
 * @param {Object} device - Android device definition object
 * @param {Object} opts - Emulator options object.
 * @param {String} [opts.titaniumHomeDir="~/.titanium"] - The Titanium home directory.
 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Genymotion environment detection cache and re-queries the system.
 * @param {String} [opts.cwd] - The current working directory to pass into spawn().
 * @param {Array|String} [opts.stdio="ignore"] - The stdio configuration to pass into spawn().
 * @param {Object} [opts.env] - The environment variables to pass into spawn().
 * @param {Boolean} [opts.detached=true] - The detached flag to pass into spawn().
 * @param {Number} [opts.uid] - The user id to pass into spawn().
 * @param {Number} [opts.gid] - The group id to pass into spawn().
 * @returns {Promise}
 */
 export function stop(device, opts = {}) {
	 //TODO
 }
