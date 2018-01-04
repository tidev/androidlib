import appcdLogger from 'appcd-logger';
import BaseDevice from './base-device';
import gawk from 'gawk';

import * as adb from './adb';

const { log } = appcdLogger('androidlib:device');
const { pluralize } = appcdLogger;

/**
 * Information for a physically connected device.
 */
export default class Device extends BaseDevice {
}

/**
 * Detects all attached devices.
 *
 * @returns {Promise<Array.<Object>>}
 */
export async function getDevices() {
	log('Getting devices...');
	let devices = await adb.devices();
	devices = devices.filter(d => d instanceof Device);
	log(pluralize(`Found ${devices.length} device`, devices.length));
	return devices;
}

/**
 * Starts listening for devices being connected or disconnected.
 *
 * @returns {TrackDeviceHandle}
 */
export function trackDevices() {
	const handle = adb.trackDevices();
	const devices = gawk([]);
	let initialized = false;

	handle.on('change', connectedDevices => {
		connectedDevices = connectedDevices.filter(d => d instanceof Device);
		log(pluralize(`Found ${connectedDevices.length} device`, connectedDevices.length));

		gawk.set(devices, connectedDevices);

		if (!initialized) {
			handle.emit('devices', JSON.parse(JSON.stringify(devices)));
			gawk.watch(devices, () => handle.emit('devices', JSON.parse(JSON.stringify(devices))));
			initialized = true;
		}
	});

	return handle;
}
