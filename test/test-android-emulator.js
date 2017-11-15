import path from 'path';

import * as androidlib from '../dist/index';

describe('AndroidEmulator', () => {
	beforeEach(function () {
		this.avdPath = androidlib.options.avd.path;
	});

	afterEach(async function () {
		androidlib.options.avd.path = this.avdPath;
	});

	it('should detect mock emulators', async function () {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const sdk = new androidlib.sdk.SDK(dir);
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;

		const emulators = await androidlib.androidEmulator.getEmulators(sdk);
		expect(emulators).to.be.an('array');
		expect(emulators).to.have.lengthOf(1);

		const emulator = emulators[0];
		expect(emulator).to.be.instanceof(androidlib.Emulator);

		expect(emulator).to.deep.equal({
			id: 'test_API_23',
			name: 'Test API 23',
			device: 'Nexus 5X (Google)',
			path: path.join(avdDir, 'test.avd'),
			abi: 'x86',
			skin: 'nexus_5x',
			sdcard: null,
			googleApis: true,
			target: null,
			'sdk-version': null,
			'api-level': null
		});
	});

	it('should detect system emulators', async () => {
		const emulators = await androidlib.androidEmulator.getEmulators();
		expect(emulators).to.be.an('array');

		for (const emu of emulators) {
			expect(emu).to.be.an('object');
			expect(emu).to.have.keys('id', 'name', 'device', 'path', 'abi', 'skin', 'sdcard', 'googleApis', 'target', 'sdk-version', 'api-level');
		}
	});
});
