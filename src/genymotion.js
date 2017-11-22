import BaseDevice from './base-device';
import BaseEmulator from './base-emulator';
import options from './options';
import path from 'path';
import VirtualBox, { getVirtualBox } from './virtualbox';

import { arrayify, cacheSync, get } from 'appcd-util';
import { exe } from 'appcd-subprocess';
import { expandPath } from 'appcd-path';
import { isDir, isFile } from 'appcd-fs';

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
 * Genymotion emulator information.
 */
export class GenymotionEmulator extends BaseEmulator {
	abi = 'x86';
	display = null;
	dpi = null;
	genymotion = null;
	googleApis = null;
	hardwareOpenGL = null;
	id = null;
	ipaddress = null;
	name = null;
	'sdk-version' = null;
	target = null;
	type = 'genymotion';

	constructor(info) {
		if (!info || typeof info !== 'object') {
			throw new TypeError('Expected vm info to be an object');
		}

		if (!info.props || !info.props.genymotion_version) {
			throw new Error('Expected vm info to have a \'genymotion_version\' property');
		}

		super();

		this.id   = info.id;
		this.name = info.name;
		this.path = info.path;

		for (const [ name, value ] of Object.entries(info.props)) {
			switch (name) {
				case 'android_version':
					this['sdk-version'] = this.target = value;
					break;
				case 'genymotion_player_version':
				case 'genymotion_version':
					this.genymotion = value;
					break;
				case 'hardware_opengl':
					this.hardwareOpenGL = !!parseInt(value);
					break;
				case 'vbox_dpi':
					this.dpi = ~~value;
					break;
				case 'vbox_graph_mode':
					this.display = value || null;
					break;
				case 'androvm_ip_management':
					this.ipaddress = value || null;
					break;
			}
		}
	}
}

export default GenymotionEmulator;

/**
 * Information about a running Genymotion emulator.
 */
export class GenymotionEmulatorDevice extends BaseDevice {
	constructor(info, emu) {
		super(info);
		this.emulator = emu;
		this.genymotion = info['ro.genymotion.version'];
	}
}

/**
 * Genymotion information.
 */
export class Genymotion {
	/**
	 * Performs tests to see if this is a Genymotion install directory, and then initializes the
	 * info.
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

		this.executables = {
			genymotion: path.join(dir, `genymotion${exe}`),
			player:     path.join(dir, `player${exe}`)
		};
		this.home 		 = null;
		this.path 		 = dir;

		// on macOS, it lives in 'Contents/MacOS'
		if (process.platform === 'darwin') {
			if (isFile(this.executables.genymotion)) {
				this.path = path.resolve(this.path, '../..');
			} else {
				this.executables.genymotion = path.join(this.path, 'Contents/MacOS/genymotion');
			}

			this.executables.player = path.join(this.path, 'Contents/MacOS/player.app/Contents/MacOS/player');
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

		this.emulators = getEmulators({ force: true, vbox: this });
	}
}

/**
 * Get the Genymotion emulators installed on a system.
 *
 * @param {Object} [opts] - Various options.
 * @param {Boolean} [opts.force] - When `true`, bypasses the cache and forces redetection of
 * VirtualBox if not passed in.
 * @param {Object} [opts.vbox] - Object containing information about the VirtualBox install.
 * @return {Array<GenymotionEmulator>} The installed emulators.
 * @access public
 */
export function getEmulators({ force, vbox } = {}) {
	if (!(vbox instanceof VirtualBox)) {
		try {
			vbox = getVirtualBox(force);
		} catch (e) {
			return [];
		}
	}

	return cacheSync(`androidlib:genymotion:${vbox && vbox.path || ''}`, force, () => {
		return vbox.list()
			.filter(vm => vm.props.genymotion_version)
			.map(vm => new GenymotionEmulator(vm));
	});
}

/**
 * Determines if an emulator is a Genymotion emulator.
 *
 * @param {Object} info - The device information.
 * @returns {Boolean}
 */
export function isEmulatorDevice(info) {
	if (info['ro.genymotion.version']) {
		if (info['ro.product.model']) {
			for (const emu of getEmulators()) {
				if (emu.id === info['ro.product.model']) {
					return new GenymotionEmulatorDevice(info, emu);
				}
			}
		}
		return new GenymotionEmulatorDevice(info);
	}

	return false;
}
