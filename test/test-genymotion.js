import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

import * as androidlib from '../dist/index';

import { exe } from 'appcd-subprocess';

const tmpDir = tmp.dirSync({
	prefix: 'androidlib-virtualbox-test-',
	unsafeCleanup: true
}).name;

describe('Genymotion', () => {
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
				vms.map(vm => `<MachineEntry uuid="{${vm.uuid}}" src="${vm.src}"/>`).join('\n')
			);
		fs.writeFileSync(configFile, template);
	});

	beforeEach(function () {
		this.searchPaths = androidlib.options.virtualbox.searchPaths;
	});

	afterEach(function () {
		androidlib.options.virtualbox.searchPaths = this.searchPaths;
	});

	after(function () {
		androidlib.options.virtualbox.configFile = this.configFile;
		fs.removeSync(tmpDir);
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

	it('should get emulators', () => {
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const results = androidlib.genymotion.getEmulators({ force: true });

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
				display: '1080x1920-16',
				hardwareOpenGL: true,
				ipaddress: null,
				path: path.resolve('./test/mocks/virtualbox/vms/PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920'),
				type: 'genymotion'
			}
		]);
	});

	it('should detect a genymotion install', () => {
		androidlib.options.virtualbox.searchPaths = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		let genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);
		const geny = new androidlib.genymotion.Genymotion(genyDir);

		let playerPath = path.join(genyDir, `player${exe}`);
		if (process.platform === 'darwin') {
			playerPath = path.join(genyDir, 'Contents', 'MacOS', 'player.app', 'Contents', 'MacOS', 'player');
		}

		let genyexe = path.join(genyDir, `genymotion${exe}`);
		if (process.platform === 'darwin') {
			genyexe = path.join(genyDir, 'Contents', 'MacOS', 'genymotion');
		}

		expect(geny.executables).to.deep.equal({
			genymotion: genyexe,
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
				display: '1080x1920-16',
				hardwareOpenGL: true,
				ipaddress: null,
				path: path.resolve('./test/mocks/virtualbox/vms/PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920'),
				type: 'genymotion'
			}
		]);
		expect(geny.path).to.equal(genyDir);
	});
});
