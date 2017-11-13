import * as adb from './adb';

/**
 * Detects all attached devices.
 *
 * @returns {Promise<Array.<Object>>}
 */
export async function getDevices() {
	const devices = await adb.devices();

	// TODO: filter out emulators

	return devices;
}

/**
 * Starts listening for devices being connected or disconnected.
 *
 * @returns {Promise<TrackDeviceHandle>}
 */
export function trackDevices() {
	const handle = adb.trackDevices();
	let ids = new Set();

	handle.on('change', devices => {
		let added = 0;
		const previous = ids;
		ids = new Set();
		devices = devices.filter(d => d.state === 'device');

		// TODO: filter out emulators

		// determine if the results changed
		for (const device of devices) {
			ids.add(device.id);
			if (previous.has(device.id)) {
				previous.delete(device.id);
			} else {
				added++;
			}
		}

		if (added || previous.size) {
			handle.emit('devices', devices);
		}
	});

	return handle;
}
