import fs from 'fs';
import options from './options';
import path from 'path';

import { arrayify, cacheSync, get } from 'appcd-util';
import { expandPath } from 'appcd-path';
import { exe } from 'appcd-subprocess';
import { isDir, isFile } from 'appcd-fs';
import { spawnSync } from 'child_process';
import { DOMParser } from 'xmldom';

/**
 * Common VirtualBox install locations
 * @type {Object}
 */
export const virtualBoxLocations = {
	darwin: [
		'/usr/local/bin'
	],
	linux: [
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local',
		'~'
	],
	win32: [
		'%ProgramFiles%\\Oracle\\VirtualBox',
		'%ProgramFiles(x86)%\\Oracle\\VirtualBox',
	]
};

/**
 * Map of platform specific paths to the `VirtualBox.xml` file.
 * @type {Object}
 */
export const virtualBoxConfigFile = {
	darwin: '~/Library/VirtualBox/VirtualBox.xml',
	linux: '~/.config/VirtualBox/VirtualBox.xml',
	win32: '~/.VirtualBox/VirtualBox.xml'
};

/**
 * Returns the path to the VirtualBox config file.
 *
 * @returns {String}
 */
export function getConfigFile() {
	return expandPath(get(options, 'virtualbox.configFile') || virtualBoxConfigFile[process.platform]);
}

/**
 * VirtualBox information
 */
export class VirtualBox {
	/**
	 * Performs tests to see if this is a VirtualBox install directory,
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

		this.configFile = getConfigFile();
		this.executables = {
			vboxmanage: path.join(dir, `vboxmanage${exe}`)
		};
		this.path = dir;

		if (!isFile(this.executables.vboxmanage)) {
			throw new Error('Directory does not contain a "vboxmanage" executable');
		}

		const { status, stdout } = spawnSync(this.executables.vboxmanage, [ '-version' ]);
		if (status !== 0) {
			throw new Error(`Failed to get VirtualBox version (code ${status})`);
		}
		this.version = stdout.toString().split(/\r?\n/)[0].trim();
	}

	/**
	 * List all VirtualBox VMs.
	 *
	 * @return {Array.<Object>} - Array of VM objects with id and name.
	 */
	list() {
		const readXMLFile = (file, tags) => {
			const results = {};

			const doc = new DOMParser({
				errorHandler: {
					warning() {},
					error() {}
				}
			}).parseFromString(fs.readFileSync(file, 'utf8'), 'text/xml');

			if (!doc) {
				throw new Error(`Unable to parse XML file: ${file}`);
			}

			for (const tag of tags) {
				const elems = doc.getElementsByTagName(tag);
				results[tag] = [];

				for (let i = 0; i < elems.length; i++) {
					const el = elems[i];
					const props = {};
					for (let j = 0; j < el.attributes.length; j++) {
						const attr = el.attributes.item(j);
						props[attr.name] = attr.value.trim();
					}
					results[tag].push(props);
				}
			}

			return results;
		};

		const vms = [];

		for (const entry of readXMLFile(this.configFile, [ 'MachineEntry' ]).MachineEntry) {
			if (!entry.uuid || !entry.src) {
				continue;
			}

			const vmFile = expandPath(entry.src);
			const vm = {
				id:    entry.uuid,
				name:  null,
				path:  path.dirname(vmFile),
				props: {}
			};
			const vmConf = readXMLFile(vmFile, [ 'Machine', 'GuestProperty' ]);

			if (vmConf.Machine.length) {
				vm.name = vmConf.Machine[0].name;
			}

			for (const prop of vmConf.GuestProperty) {
				vm.props[prop.name] = prop.value;
			}

			vms.push(vm);
		}

		return vms;
	}
}

export default VirtualBox;

/**
 * Detect installations of VirtualBox.
 *
 * @param {Boolean} force - Force function to be ran.
 * @return {VirtualBox}
 */
export function getVirtualBox(force) {
	return cacheSync('virtualbox', force, () => {
		let searchPaths = arrayify(get(options, 'virtualbox.searchPaths'), true);
		if (!searchPaths.length) {
			searchPaths = virtualBoxLocations[process.platform];
		}

		for (const dir of searchPaths) {
			try {
				return new VirtualBox(dir);
			} catch (e) {
				// squelch
			}
		}

		throw new Error('Unable to find VirtualBox');
	});
}
