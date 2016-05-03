import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

import ADB from '../adb';
import EmulatorBase from './EmulatorBase';
import * as Genymotion from '../genymotion';
import * as util from '../util';

const exe = util.exe;
const bat = util.bat;

/**
 * Provides methods to detect and interact with Genymotion Emulator.
 */
export default class GenymotionEmulator extends EmulatorBase {
	/**
	 * Creates a Genymotion Emulator object.
	 *
	 * @param {Object} options - the Genymotion emulator properties.
	 */
	constructor(options) {
		super();
		this.type 			= 'genymotion';
		this.name 			= options.name;
		this.id 			= options.ipaddress;
		this.guid 			= options.guid;
		this.abi 			= options.abi;
		this.googleApis 	= options.googleApis;
		this.sdkVersion 	= options['sdk-version'];
		this.apiLevel 		= options['api-level'];
		this.target 		= options.target;
		this.genymotion 	= options.genymotion;
		this.hardwareOpenGL = options.hardwareOpenGL;
		this.dpi 			= options.dpi;
		this.display 		= options.display;
	}

	/**
	 * Detects all existing Genymotion emulators.
	 *
	 * @param {Object} [opts] - An object with various params.
	 * @param {Boolean} [opts.genymotion.path] - Genymotion path.
	 * @returns {Promise}
	 */
	static detect(opts = {}) {
		return Genymotion
			.detect(opts)
			.then(result => {
				if (result && result.executables && result.executables.vboxmanage) {
					return GenymotionEmulator.getVMInfo(result.executables.vboxmanage);
				}
			})
			.then(avds => avds ? avds : []);
	}

	/**
	 * Find all Genymotion emulators.
	 *
	 * @param {String} vboxmanage - VBoxManage path.
	 * @returns {Promise}
	 */
	static getVMInfo(vboxmanage) {
		return util
			.run(vboxmanage, ['list', 'vms'])
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
								return emu;
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
			.detect(opts)
			.then(result => result.filter(e => e && e.id && deviceId.includes(e.id)).shift());
	}

	/**
	 * Detects if the Genymotion VM is running and if so, returns
	 * the emulator object.
	 *
	 * @param {Object} opts - Various options.
	 * @returns {Promise}
	 */
	isRunning(opts = {}) {
		return GenymotionEmulator
			.detect(opts)
			.then(result => {
				const emus = result.filter(e => e && e.name == this.name && !!this.id).shift();
				if (emus) {
					emus.id = `${this.id}:5555`;
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

		// get Genymotion player
		return Genymotion
			.detect(opts)
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
