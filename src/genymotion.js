import BaseEmulator from './base-emulator';
import options from './options';
import path from 'path';
import plist from 'simple-plist';

import * as registry from 'appcd-winreg';

import { arrayify, cache, get } from 'appcd-util';
import { exe } from 'appcd-subprocess';
import { expandPath } from 'appcd-path';
import { isDir, isFile } from 'appcd-fs';
import { getVirtualBox } from './virtualbox';

/**
 * Common Genymotion install locations.
 * @type {Object}
 */
export const genymotionLocations = {
	darwin: [
		'/Applications/Genymotion.app/',
		'~/Applications/Genymotion.app/'
	],
	linux: [
		'/opt',
		'/usr',
		'~'
	],
	win32: [
		'%ProgramFiles%\\Genymobile\\Genymotion',
		'%ProgramFiles%\\Genymotion',
		'%ProgramFiles(x86)%\\Genymobile\\Genymotion',
		'%ProgramFiles(x86)%\\Genymotion'
	]
};

/**
 * Common Genymotion home directory locations.
 * @type {Object}
 */
export const genymotionHomeLocations = {
	darwin: [
		'~/.Genymobile/Genymotion',
		'~/.Genymotion'
	],
	linux : [
		'~/.Genymobile/Genymotion',
		'~/.Genymotion'
	],
	win32: [
		'%LocalAppData%/Genymobile/Genymotion'
	]
};

/**
 * The default location of the Genymotion configuration plist on macOS.
 * @type {String}
 */
export const genymotionPlist = '~/Library/Preferences/com.genymobile.Genymotion.plist';

/**
 * Genymotion emulator information.
 */
export class GenymotionEmulator extends BaseEmulator {}

export default GenymotionEmulator;

/**
 * Genymotion information.
 */
export class Genymotion {
	/**
	 * Performs tests to see if this is a Genymotion install directory,
	 * and then initializes the info.
	 *
	 * @param {String} dir - Directory to scan.
	 * @access public
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = expandPath(dir);
		if (!isDir(dir)) {
			throw new Error('Directory does not exist');
		}

		// on OS X, it lives in Contents/MacOS
		if (process.platform === 'darwin') {
			let p = path.join(dir, 'Contents', 'MacOS');
			if (isDir(p)) {
				dir = p;
			}
		}

		this.emulators 	 = [];
		this.executables = {};
		this.home 		 = null;
		this.path 		 = dir;
		if (process.platform === 'darwin') {
			this.deployedDir = expandPath(plist.readFileSync(expandPath(genymotionPlist))['vms·path']);
		} else {
			this.deployedDir = null;
		}
		this.executables.genymotion = path.join(dir, `genymotion${exe}`);

		if (process.platform === 'darwin') {
			this.executables.player = path.join(dir, 'player.app', 'Contents', 'MacOS', 'player');
		} else {
			this.executables.player = path.join(dir, `player${exe}`);
		}

		for (const name of Object.keys(this.executables)) {
			if (!isFile(this.executables[name])) {
				throw new Error(`Directory does not contain the "${name}" executable`);
			}
		}

		let searchPaths = arrayify(get(options, 'genymotion.home.searchPaths'), true);
		if (!searchPaths.length) {
			searchPaths = genymotionHomeLocations[process.platform];
		}

		for (let homeDir of searchPaths) {
			homeDir = expandPath(homeDir);
			if (isDir(homeDir)) {
				this.home = homeDir;
				break;
			}
		}
	}

	/**
	 * Init a Genymotion instance, populating emulators.
	 *
	 * @param {VirtualBox} vbox - A VirtualBox instance
	 * @return {Promise<Genymotion>} A Genymotion instance
	 * @access public
	 */
	async init(vbox) {
		const detectRegistry = async () => {
			if (process.platform === 'win32') {
				try {
					this.deployedDir = expandPath(await registry.get('HKCU', '\\Software\\Genymobile\\Genymotion', 'vms.path'));
				} catch (ex) {
					// squelch
				}
			}
		};

		await Promise.all([
			getEmulators(vbox).then(results => this.emulators = results),
			detectRegistry()
		]);

		return this;
	}

}

/**
 * Get the Genymotion emulators installed on a system.
 *
 * @param  {Object} [vbox] - Object containing information about the VirtualBox install.
 * @param {Boolean} [force] - When `true`, bypasses the cache and forces redetection.
 * @return {Promise<Array<GenymotionEmulator>>} The installed emulators.
 * @access public
 */
export function getEmulators(vbox, force) {
	return cache(`androidlib:genymotion:${vbox && vbox.path || ''}`, force, async () => {
		if (!vbox) {
			vbox = await getVirtualBox();
		}
		const emulators = [];
		const vms = await vbox.list();

		await Promise.all(vms.map(async vm => {
			await getEmulatorInfo({ vm: vm, vbox });
			if (vm.genymotion) {
				emulators.push(new GenymotionEmulator(vm));
			}
			return;
		}));

		return emulators;
	});
}

/**
 * Get the information for a specific vm.
 *
 * @param  {String}  vm - The VM.
 * @param  {Object}  [vbox] - Object containing information about the VirtualBox install.
 * @return {Promise<Object>} Object containing information about the VM
 * @access public
 */
export async function getEmulatorInfo({ vm, vbox }) {
	if (!vm || !vm.id || !vm.name) {
		throw new TypeError('vm must be a valid VM');
	}
	if (!vbox) {
		vbox = await getVirtualBox();
	}
	const vminfo = await vbox.getGuestproperties(vm.id);
	if (vminfo) {
		for (const info of vminfo) {
			switch (info.name) {
				case 'android_version':
					vm['sdk-version'] = vm.target = info.value;
					break;
				case 'genymotion_player_version':
				case 'genymotion_version':
					vm.genymotion = info.value;
					break;
				case 'hardware_opengl':
					vm.hardwareOpenGL = !!parseInt(info.value);
					break;
				case 'vbox_dpi':
					vm.dpi = ~~info.value;
					break;
				case 'vbox_graph_mode':
					vm.display = info.value;
					break;
				case 'androvm_ip_management':
					vm.ipaddress = info.value;
					break;
			}
		}

		if (vm.genymotion) {
			vm.abi = 'x86';
			vm.googleApis = null; // null means maybe since we don't know for sure unless the emulator is running
			return vm;
		}
	}
}

/**
 * Determines if an emulator is a Genymotion emulator.
 *
 * @param {Object} info - The device information.
 * @returns {Boolean}
 */
export function isEmulator(info) {
	if (info.genymotion) {
		return true;
	}
	return false;
}

/**
 * Detect the Genymotion install, and emulators.
 *
 * @param {String} dir - The directory to scan.
 * @param {Object} vbox - VirtualBox install info.
 * @return {Promise} A Genymotion instance
 */
export async function detect(dir, vbox) {
	return await new Genymotion(dir).init(vbox);
}
