import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

import * as androidlib from '../dist/index';

const tmpDir = tmp.dirSync({
	prefix: 'androidlib-emulators-test-',
	unsafeCleanup: true
}).name;

describe('Emulators', () => {
	beforeEach(function () {
		this.avdPath = androidlib.options.avd.path;
	});

	afterEach(function () {
		androidlib.options.avd.path = this.avdPath;
	});

	after(function () {
		fs.removeSync(tmpDir);
	});

	it('should detect mock emulators when passing in an empty array of sdks', function () {
		const sdks = [ ];
		const avdDir = path.join(__dirname, 'mocks', 'avd');

		androidlib.options.avd.path = avdDir;

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
			target: null,
			'sdk-version': null,
			'api-level': null,
			type: 'avd'
		});
	});

	it('should detect system emulators', () => {
		const emulators = androidlib.emulators.getEmulators({ force: true });
		expect(emulators).to.be.an('array');

		for (const emu of emulators) {
			expect(emu).to.be.an('object');
			expect(emu).to.have.keys('id', 'name', 'device', 'path', 'abi', 'skin', 'sdcard', 'googleApis', 'target', 'sdk-version', 'api-level', 'type');
		}
	});
});
