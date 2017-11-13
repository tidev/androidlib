import Emulator from './emulator';
import fs from 'fs';
import options from './options';
import path from 'path';
import SDK from './sdk';

import { expandPath } from 'appcd-path';
import { get } from 'appcd-util';
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
 * Detects Android Emulators.
 *
 * @param {SDK} [sdk] - When passed in, it will attempt to resolve the AVD's target, SDK version,
 * and API level.
 * @returns {Promise<Array>}
 */
export async function getEmulators(sdk) {
	const results = [];
	const avdDir = expandPath(getAvdDir());

	if (!isDir(avdDir)) {
		return results;
	}

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
		let sdk = null;
		let apiLevel = null;

		if (config['image.sysdir.1'] && sdk instanceof SDK) {
			const imageDir = config['image.sysdir.1'].replace(/^system-images\//, '').replace(/\/$/, '');
			const image = sdk.systemImages[imageDir];
			if (image) {
				for (const platform of sdk.platforms) {
					if (platform.sdk === image.sdk) {
						apiLevel = platform.apiLevel;
						sdk = platform.version;
						target = `${platform.name} (API level ${platform.apiLevel})`;
						break;
					}
				}
			}
		}

		results.push(new Emulator({
			id:            config['AvdId'] || name,
			name:          config['avd.ini.displayname'] || name,
			device:        config['hw.device.name'] + ' (' + config['hw.device.manufacturer'] + ')',
			path:          dir,
			abi:           config['abi.type'],
			skin:          config['skin.name'],
			sdcard:        config['hw.sdCard'] === 'yes' && isFile(sdcard) ? sdcard : null,
			googleApis:    config['tag.id'] === 'google_apis',
			target,
			'sdk-version': sdk,
			'api-level':   apiLevel
		}));
	}

	return results;
}
