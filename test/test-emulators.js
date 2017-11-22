import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

import * as androidlib from '../dist/index';

const tmpDir = tmp.dirSync({
	prefix: 'androidlib-virtualbox-test-',
	unsafeCleanup: true
}).name;

describe('Emulators', () => {
	before(function () {
		const configFile = path.join(tmpDir, 'VirtualBox.xml');
		this.configFile = androidlib.options.virtualbox.configFile;
		androidlib.options.virtualbox.configFile = configFile;

		const vmsDir = path.resolve('./test/mocks/virtualbox/vms');
		const vms = [
			{
				uuid: 'a9364ace-c263-433a-b137-1c8d4e70c348',
				src: path.join(vmsDir, 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920', 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920.vbox')
			},
			{
				uuid: 'c6176f02-a693-4c32-9b2d-765eb83a40dc',
				src: path.join(vmsDir, 'Linux VM', 'Linux VM.vbox')
			}
		];

		const templateFile = path.resolve('./test/mocks/virtualbox/config/VirtualBox.xml');
		const template = fs.readFileSync(templateFile, 'utf8')
			.replace(
				'MACHINE_ENTRIES',
				vms.map(vm => `<MachineEntry uuid="${vm.uuid}" src="${vm.src}"/>`).join('\n')
			);
		fs.writeFileSync(configFile, template);
	});

	beforeEach(function () {
		this.avdPath = androidlib.options.avd.path;
		this.searchPaths = androidlib.options.virtualbox.searchPaths;
	});

	afterEach(async function () {
		androidlib.options.avd.path = this.avdPath;
		androidlib.options.virtualbox.searchPaths = this.searchPaths;
	});

	after(function () {
		androidlib.options.virtualbox.configFile = this.configFile;
		fs.removeSync(tmpDir);
	});

	it('should detect mock emulators with no virtualbox', function () {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const sdks = [ new androidlib.sdk.SDK(dir) ];
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/bad`);

		const emulators = androidlib.emulators.getEmulators({ force: true, sdks });

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
			target: 'Android 6.0 (API level 23)',
			'sdk-version': '6.0',
			'api-level': 23,
			type: 'avd'
		});
	});

	it('should detect mock emulators', function () {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const sdks = [ new androidlib.sdk.SDK(dir) ];
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);

		const emulators = androidlib.emulators.getEmulators({ force: true, sdks });

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
			display: '1080x1920-16',
			hardwareOpenGL: true,
			ipaddress: null,
			path: path.resolve('./test/mocks/virtualbox/vms/PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920'),
			type: 'genymotion'
		});
	});

	it('should detect mock emulators when passing in an empty array of sdks', function () {
		const sdks = [ ];
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);

		const emulators = androidlib.emulators.getEmulators({ force: true, sdks });

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
			target: null,
			'sdk-version': null,
			'api-level': null,
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
			display: '1080x1920-16',
			hardwareOpenGL: true,
			ipaddress: null,
			path: path.resolve('./test/mocks/virtualbox/vms/PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920'),
			type: 'genymotion'
		});

	});

	it('should detect system emulators', () => {
		const emulators = androidlib.emulators.getEmulators({ force: true });
		expect(emulators).to.be.an('array');

		for (const emu of emulators) {
			expect(emu).to.be.an('object');
			if (emu instanceof androidlib.AndroidEmulator) {
				expect(emu).to.have.keys('id', 'name', 'device', 'path', 'abi', 'skin', 'sdcard', 'googleApis', 'target', 'sdk-version', 'api-level', 'type');
			} else {
				expect(emu).to.have.keys('id', 'name', 'display', 'dpi', 'hardwareOpenGL', 'genymotion', 'abi', 'target', 'sdk-version', 'ipaddress', 'googleApis', 'path', 'type');
			}
		}
	});
});
