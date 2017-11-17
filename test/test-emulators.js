import path from 'path';

import * as androidlib from '../dist/index';

describe('Emulators', () => {
	beforeEach(function () {
		this.avdPath = androidlib.options.avd.path;
		this.searchPaths = androidlib.options.virtualbox.searchPaths;
	});

	afterEach(async function () {
		androidlib.options.avd.path = this.avdPath;
		androidlib.options.virtualbox.searchPaths = this.searchPaths;
	});

	it('should detect mock emulators with no virtualbox', async function () {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const sdk = new androidlib.sdk.SDK(dir);
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/bad`);

		const emulators = await androidlib.emulators.getEmulators({ force: true, sdk });

		expect(emulators).to.be.an('array');
		expect(emulators).to.have.lengthOf(1);
		let emulator = emulators[0];
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
			'api-level': null,
			type: 'avd'
		});
	});

	it('should detect mock emulators', async function () {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const sdks = new androidlib.sdk.SDK(dir);
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);

		const emulators = await androidlib.emulators.getEmulators({ force: true, sdks });

		expect(emulators).to.be.an('array');
		expect(emulators).to.have.lengthOf(2);
		let emulator = emulators[0];
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
			'api-level': 23,
			type: 'avd'
		});

		emulator = emulators[1];
		expect(emulator).to.be.instanceof(androidlib.GenymotionEmulator);

		expect(emulator).to.deep.equal({
			name: 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
			id: 'a9364ace-c263-433a-b137-1c8d4e70c348',
			target: '8.0',
			'sdk-version': '8.0',
			genymotion: '2.11.0',
			dpi: 420,
			abi: 'x86',
			googleApis: null,
			display: null,
			hardwareOpenGL: null,
			ipaddress: null,
			type: 'genymotion'
		});
	});

	it('should detect system emulators', async () => {
		const emulators = await androidlib.emulators.getEmulators({ force: true });
		expect(emulators).to.be.an('array');

		for (const emu of emulators) {
			expect(emu).to.be.an('object');
			if (emu instanceof androidlib.AndroidEmulator) {
				expect(emu).to.have.keys('id', 'name', 'device', 'path', 'abi', 'skin', 'sdcard', 'googleApis', 'target', 'sdk-version', 'api-level', 'type');
			} else {
				expect(emu).to.have.keys('id', 'name', 'display', 'dpi', 'hardwareOpenGL', 'genymotion', 'abi', 'target', 'sdk-version', 'ipaddress', 'googleApis', 'type');
			}
		}
	});
});
