import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

import ADB from '../adb';
import EmulatorBase from './emulatorBase';
import * as util from '../util';

const exe = util.exe;
const bat = util.bat;

/**
 * Provides methods to detect and interact with Genymotion Emulator.
 *
 * @class
 * @constructor
 */
export default class GenymotionEmulator extends EmulatorBase {
	/**
	 * Creates a Genymotion Emulator object.
	 *
	 * @param {Object} options - the Genymotion emulator properties.
	 */
	constructor(options) {
		super();
		Object.assign(this, options);
	}

	/**
	 * Detects all existing Genymotion emulators.
	 *
	 * @param {Object} [opts] - An object with various params.
	 * @param {Boolean} [opts.genymotion.path] - Genymotion path.
	 * @returns {Promise}
	 */
	static detect(opts = {}) {
		const results = {
			path : null,
			home: null,
			virtualbox: null,
			executables: [],
			avds: []
		};

		return Promise.all([
			GenymotionEmulator.detectGenymotion(opts),
			GenymotionEmulator.detectVirtualbox(opts)
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

	static scan(parent, pattern, depth) {
		const files = fs.readdirSync(parent);
		for (const name of files) {
			const file = path.join(parent, name);
			const stat = fs.statSync(file);
			let result;
			if (stat.isFile() && name === pattern) {
				return file;
			} else if (stat.isDirectory()) {
				try {
					if (depth === undefined) {
						result = GenymotionEmulator.scan(file, pattern);
					} else if (depth > 0){
						result = GenymotionEmulator.scan(file, pattern, depth - 1);
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

	static detectGenymotion(opts = {}) {
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
				const executable = GenymotionEmulator.scan(p, executableName);
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

	static detectVirtualbox(opts = {}) {
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
					const searchDirs = util.getSearchPaths();
					return Promise.race(searchDirs.map(dir => {
						dir = util.expandPath(dir);
						if (!util.existsSync(dir)) {
							return Promise.resolve();
						}
						const executable = GenymotionEmulator.scan(dir, executableName, 3);
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
					return GenymotionEmulator
						.getVMInfo(opts, vboxmanage)
						.then(emus => {
							result.avds = emus;
							return result;
						});
				}
				return result;
			});
	}

	static getVMInfo(opts, vboxmanage) {
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
						abi: 'x86',
						googleApis: null, // null means maybe since we don't know for sure unless the emulator is running
						'sdk-version': null
					};
					return util.run(vboxmanage, ['guestproperty', 'enumerate', emu.guid])
						.then(({ code, stdout, stderr }) => {
							if (!code) {
								for (const line of stdout.split('\n')) {
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

							return emu && new GenymotionEmulator(emu);
						});
				}));
			})
			.then(results => results.filter(a => a));
	}

	/**
	 * Detects if a specific device name is an Genymotion emulator.
	 *
	 * @param {String} deviceId - The id of the emulator.
	 * @param {Object} opts - Various options.
	 * @returns {Promise}
	 * @access public
	 */
	static isEmulator(deviceId, opts = {}) {
		return GenymotionEmulator
			.detectVirtualbox()
			.then(result => result && result.avds.filter(e => e && e.ipaddress && deviceId.includes(e.ipaddress)).shift());
	}

	/**
	 * Detects if the Genymotion VM is running and if so, returns
	 * the emulator object.
	 *
	 * @param {Object} opts - Various options.
	 * @returns {Promise}
	 */
	isRunning(opts = {}) {
		return GenymotionEmulator.detectVirtualbox(opts)
			.then(result => {
				const emus = result && result.avds.filter(e => e && e.name == this.name && !!this.ipaddress).shift();
				if (emus) {
					emus.id = `${this.ipaddress}:5555`;
					return emus;
				}
				return false;
			});
	}

	 /**
	 * Launches the specified Genymotion emulator.
	 *
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
	 * @access public
	 */
	launch(opts = {}) {
		if (this && !this.name) {
			return Promise.reject(new Error('Expected the emulator object to have a "name" property.'));
		}

		return GenymotionEmulator.detect(opts)
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

				this.emit('message', `Starting emulator "${this.name}"`);

				let child = spawn(results.executables.player, ['--vm-name', this.name], emuopts);
				this.pid = child.pid;

				child.stdout && child.stdout.on('data', data => this.emit('stdout', data));
				child.stderr && child.stderr.on('data', data => this.emit('stderr', data));
				child.on('error', err => this.emit('error', err));
				child.on('close', (code, signal) => this.emit('exit', code, signal));

				child.unref();
			})
			.then(() => {
				this.emit('message', 'Genymotion emulator is starting, monitoring boot state...');
				return this.checkBooted(opts);
			});
	}

	 /**
	 * Stops the specified Genymotion emulator.
	 *
	 * @param {Object} opts - Emulator options object.
	 * @returns {Promise}
	 * @access public
	 */
	stop(opts = {}) {
		if (this && this.pid) {
			process.kill(this.pid);

			const adb = new ADB();
			return adb
				.stopServer()
				.then(result => adb.startServer())
				.then(result => result);
		}
		//TODO grep ps
	}
}
