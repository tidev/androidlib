import BaseDevice from './base-device';
import gawk from 'gawk';

import * as adb from './adb';

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
	const devices = await adb.devices();
	return devices.filter(d => d instanceof Device);
}

/**
 * Starts listening for devices being connected or disconnected.
 *
 * @returns {TrackDeviceHandle}
 */
export function trackDevices() {
	const handle = adb.trackDevices();
	const devices = gawk([]);

	setImmediate(() => {
		getDevices()
			.then(connectedDevices => {
				handle.emit('devices', connectedDevices);
				handle.on('change', connectedDevices => gawk.set(devices, connectedDevices));

				gawk.set(devices, connectedDevices);
				gawk.watch(devices, () => handle.emit('devices', devices));
			})
			.catch(err => {
				handle.emit('error', err);
			});
	});

	return handle;
}
