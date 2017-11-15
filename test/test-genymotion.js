import path from 'path';

import * as androidlib from '../dist/index';

import { exe } from 'appcd-subprocess';

describe('Genymotion', () => {

	beforeEach(function () {
		this.searchPaths = androidlib.options.virtualbox.searchPaths;
	});

	afterEach(function () {
		androidlib.options.virtualbox.searchPaths = this.searchPaths;
	});

	it('should error if directory is invalid', () => {
		expect(() => {
			new androidlib.genymotion.Genymotion();
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.genymotion.Genymotion();
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.genymotion.Genymotion();
		}).to.throw(TypeError, 'Expected directory to be a valid string');
	});

	it('should error if directory does not exist', () => {
		expect(() => {
			new androidlib.genymotion.Genymotion(path.join(__dirname, 'doesnotexist'));
		}).to.throw(Error, 'Directory does not exist');
	});

	it('should error if "genymotion" is missing', () => {
		expect(() => {
			new androidlib.genymotion.Genymotion(path.resolve(__dirname, 'mocks', 'genymotion', process.platform, 'no-genymotion'));
		}).to.throw(Error, 'Directory does not contain the "genymotion" executable');
	});

	it('should error if "player" is missing', () => {
		expect(() => {
			new androidlib.genymotion.Genymotion(path.resolve(__dirname, 'mocks', 'genymotion', process.platform, 'no-player'));
		}).to.throw(Error, 'Directory does not contain the "player" executable');
	});

	it('should get emulators', async () => {
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const results = await androidlib.genymotion.getEmulators();

		expect(results).to.deep.equal([
			{
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
				ipaddress: null
			}
		]);
	});

	it('getEmulatorInfo should error if no guid', async () => {
		try {
			await androidlib.genymotion.getEmulatorInfo({ });
		} catch (e) {
			expect(e instanceof TypeError).to.equal(true);
			expect(e.message).to.equal('vm must be a valid VM');
		}
	});

	it('should get emulator info', async () => {
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const results = await androidlib.genymotion.getEmulatorInfo({
			vm: {
				name: 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
				id: 'a9364ace-c263-433a-b137-1c8d4e70c348'
			}
		});

		expect(results).to.deep.equal({
			name: 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
			id: 'a9364ace-c263-433a-b137-1c8d4e70c348',
			target: '8.0',
			'sdk-version': '8.0',
			genymotion: '2.11.0',
			dpi: 420,
			abi: 'x86',
			googleApis: null
		});
	});

	it('should detect a genymotion install', async () => {
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);
		const geny = await androidlib.genymotion.detect(genyDir);

		let playerPath;

		if (process.platform === 'darwin') {
			playerPath = path.join(genyDir, 'player.app', 'Contents', 'MacOS', `player${exe}`);
		} else {
			playerPath = path.join(genyDir, `player${exe}`);

		}

		expect(geny.executables).to.deep.equal({
			genymotion: path.join(genyDir, `genymotion${exe}`),
			player: playerPath
		});

		expect(geny.emulators).to.deep.equal([
			{
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
				ipaddress: null
			}
		]);
		expect(geny.path).to.equal(genyDir);

		// TODO: Figure out how to mock the home dir and deployed dir
	});
});
