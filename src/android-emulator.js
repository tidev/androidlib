import BaseDevice from './base-device';
import BaseEmulator from './base-emulator';
import fs from 'fs';
import net from 'net';
import options from './options';
import path from 'path';

import { arrayify, cacheSync, get } from 'appcd-util';
import { expandPath } from 'appcd-path';
import { isDir, isFile } from 'appcd-fs';
import { readPropertiesFile } from './util';

/**
 * The default provisioning profile directory.
 * @type {String}
 */
const defaultAvdDir = '~/.android/avd';

/**
 * Returns the path to the Android Virtual Machines (AVD) directory.
 *
 * @returns {String}
 */
export function getAvdDir() {
	return get(options, 'avd.path') || defaultAvdDir;
}

/**
 * Android emulator information.
 */
export class AndroidEmulator extends BaseEmulator {
	type = 'avd';
}

export default AndroidEmulator;

/**
 * Information about a running Android emulator.
 */
export class AndroidEmulatorDevice extends BaseDevice {
	constructor(info, emu) {
		super(info);
		this.emulator = emu;
	}
}

/**
 * Detects Android Emulators.
 *
 * @param {Object} [opts] - Various options.
 * @param {Boolean} [opts.force] - When `true`, bypasses the cache and forces redetection.
 * @param {Array<SDK>} [opts.sdks] - When passed in, it will attempt to resolve the AVD's target, SDK
 * version, and API level.
 * @returns {Array<AndroidEmulator>}
 */
export function getEmulators({ force, sdks } = {}) {
	return cacheSync(`androidlib:avd:${sdks && sdks.map(s => s.path).sort().join(':') || ''}`, force, () => {
		const avdDir = expandPath(getAvdDir());
		const emulators = [];

		if (!isDir(avdDir)) {
			return emulators;
		}

		sdks = arrayify(sdks, true);

		const avdFilenameRegExp = /^(.+)\.ini$/;

		for (let name of fs.readdirSync(avdDir)) {
			const m = name.match(avdFilenameRegExp);
			if (!m) {
				continue;
			}

			const ini = readPropertiesFile(path.join(avdDir, name));
			if (!ini) {
				continue;
			}

			name = m[1];

			let dir = ini.path;
			if ((!dir || !isDir(dir)) && ini['path.rel'] && !isDir(dir = path.join(path.dirname(avdDir), ini['path.rel']))) {
				continue;
			}

			const config = readPropertiesFile(path.join(dir, 'config.ini'));
			if (!config) {
				continue;
			}

			const sdcard = path.join(dir, 'sdcard.img');
			let target = null;
			let sdkLevel = null;
			let apiLevel = null;
			if (config['image.sysdir.1']) {
				const imageDir = config['image.sysdir.1'].replace(/\\/g, '/').replace(/^system-images\//, '').replace(/\/$/, '');
				for (const sdk of sdks) {
					if (sdk.systemImages && sdk.systemImages[imageDir]) {
						const image = sdk.systemImages[imageDir];
						for (const platform of sdk.platforms) {
							if (platform.sdk === image.sdk) {
								apiLevel = platform.apiLevel;
								sdkLevel = platform.version;
								target = `${platform.name} (API level ${platform.apiLevel})`;
								break;
							}
						}
						if (target) {
							break;
						}
					}
				}
			}

			emulators.push(new AndroidEmulator({
				id:            config['AvdId'] || name,
				name:          config['avd.ini.displayname'] || name,
				device:        config['hw.device.name'] + ' (' + config['hw.device.manufacturer'] + ')',
				path:          dir,
				abi:           config['abi.type'],
				skin:          config['skin.name'],
				sdcard:        config['hw.sdCard'] === 'yes' && isFile(sdcard) ? sdcard : null,
				googleApis:    config['tag.id'] === 'google_apis',
				target,
				'sdk-version': sdkLevel,
				'api-level':   apiLevel
			}));
		}

		return emulators;
	});
}

/**
 * Determines if the info object represents an Android Emulator.
 *
 * @param {Object} info - The device information.
 * @returns {Promise<Boolean>}
 */
export async function isEmulatorDevice(info) {
	let m = info.id.match(/^emulator-(\d+)$/);
	if (!m) {
		return false;
	}
	const port = parseInt(m[1]);

	const avdName = await new Promise((resolve, reject) => {
		let state = 'connecting';
		let avdName = null;
		let buffer = '';
		const responseRegExp = /(.*)\r\nOK\r\n/;
		const socket = net.connect({ port });

		socket.on('data', function (data) {
			buffer += data.toString();
			var m = buffer.match(responseRegExp);
			if (!m || state === 'done') {
				// do nothing
			} else if (state === 'connecting') {
				state = 'sending command';
				buffer = '';
				socket.write('avd name\n');
			} else if (state === 'sending command') {
				state = 'done';
				avdName = m[1].trim();
				socket.end('quit\n');
			}
		});

		socket.on('end', function () {
			resolve(avdName);
		});

		socket.on('error', reject);
	});

	for (const emu of getEmulators()) {
		if (emu.id === avdName) {
			return new AndroidEmulatorDevice(info, emu);
		}
	}

	return false;
}
