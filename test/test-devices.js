import * as androidlib from '../dist/index';

describe('Devices', () => {
	it.skip('should detect all devices', async function () {
		this.timeout(10000);
		this.slow(5000);

		try {
			const devices = await androidlib.devices.getDevices();
			expect(devices).to.be.an('array');

			for (const dev of devices) {
				expect(dev).to.be.an('object');
				expect(dev).to.have.keys('abi', 'brand', 'id', 'manufacturer', 'model', 'name', 'sdk', 'state', 'release', 'device');
			}
		} catch (e) {
			if (e.message !== 'Unable to find and start adb') {
				throw e;
			}
		}
	});
});
