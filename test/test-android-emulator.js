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
		const sdks = new androidlib.sdk.SDK(dir);
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;

		const emulators = await androidlib.avd.getEmulators({ force: true, sdks });
		expect(emulators).to.be.an('array');
		expect(emulators).to.have.lengthOf(1);

		const emulator = emulators[0];
		expect(emulator).to.be.instanceof(androidlib.AndroidEmulator);

		expect(emulator).to.deep.equal({
			id: 'test_API_23',
			name: 'Test API 23',
			device: 'Nexus 5X (Google)',
			path: path.join(avdDir, 'test.avd'),
			abi: 'x86',
			skin: 'nexus_5x',
			sdcard: null,
			googleApis: true,
			target: 'Android 6.0 (API level 23)',
			'sdk-version': '6.0',
			'api-level': 23
		});
	});

	it('should detect mock emulators when passing in an array of SDKs', async function () {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const sdk = new androidlib.sdk.SDK(dir);
		const sysImgDir = path.resolve(`./test/mocks/sdk/${process.platform}/with-system-images`);
		const sysImgsdk = new androidlib.sdk.SDK(sysImgDir);
		const sdks = [ sdk, sysImgsdk ];
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;

		const emulators = await androidlib.avd.getEmulators({ force: true, sdks });
		expect(emulators).to.be.an('array');
		expect(emulators).to.have.lengthOf(1);

		const emulator = emulators[0];
		expect(emulator).to.be.instanceof(androidlib.AndroidEmulator);

		expect(emulator).to.deep.equal({
			id: 'test_API_23',
			name: 'Test API 23',
			device: 'Nexus 5X (Google)',
			path: path.join(avdDir, 'test.avd'),
			abi: 'x86',
			skin: 'nexus_5x',
			sdcard: null,
			googleApis: true,
			target: 'Android 6.0 (API level 23)',
			'sdk-version': '6.0',
			'api-level': 23
		});
	});

	it('should detect system emulators', async () => {
		const emulators = await androidlib.avd.getEmulators({ force: true });
		expect(emulators).to.be.an('array');

		for (const emu of emulators) {
			expect(emu).to.be.an('object');
			expect(emu).to.have.keys('id', 'name', 'device', 'path', 'abi', 'skin', 'sdcard', 'googleApis', 'target', 'sdk-version', 'api-level');
		}
	});

	it('should not detect target, sdk-version and api-level when no sdk is passsed in', async () => {
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;

		const emulators = await androidlib.avd.getEmulators({ force: true });

		expect(emulators).to.be.an('array');
		expect(emulators).to.have.lengthOf(1);

		const emulator = emulators[0];
		expect(emulator).to.be.instanceof(androidlib.AndroidEmulator);

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
});
