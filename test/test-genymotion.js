import path from 'path';

import * as androidlib from '../dist/index';

import { exe } from 'appcd-subprocess';

describe('Genymotion', () => {
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
		const genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);
		const geny = new androidlib.genymotion.Genymotion(genyDir);

		const vboxDir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const vbox = new androidlib.virtualbox.VirtualBox(vboxDir);

		const results = await geny.getEmulators(vbox);

		expect(results).to.deep.equal([
			{
				name: 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
				guid: 'a9364ace-c263-433a-b137-1c8d4e70c348',
				target: '8.0',
				'sdk-version': '8.0',
				genymotion: '2.11.0',
				dpi: 420,
				abi: 'x86',
				googleApis: null
			}
		]);
	});

	it('getEmulatorInfo should error if no guid', async () => {
		const genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);
		const geny = new androidlib.genymotion.Genymotion(genyDir);

		try {
			await geny.getEmulatorInfo({ });
		} catch (e) {
			expect(e instanceof TypeError).to.equal(true);
			expect(e.message).to.equal('Guid must be a string');
		}
	});

	it('getEmulatorInfo should not error if no vbox', async () => {
		const genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);
		const geny = new androidlib.genymotion.Genymotion(genyDir);

		await geny.getEmulatorInfo({ guid: 'foo' });
	});

	it('should get emulator info', async () => {
		const genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);
		const geny = new androidlib.genymotion.Genymotion(genyDir);

		const vboxDir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const vbox = new androidlib.virtualbox.VirtualBox(vboxDir);

		const results = await geny.getEmulatorInfo({ guid: 'a9364ace-c263-433a-b137-1c8d4e70c348', vbox: vbox });

		expect(results).to.deep.equal({
			target: '8.0',
			'sdk-version': '8.0',
			genymotion: '2.11.0',
			dpi: 420,
			abi: 'x86',
			googleApis: null
		});
	});

	it('should detect a genymotion install', async () => {
		const genyDir = path.resolve(`./test/mocks/genymotion/${process.platform}/good`);

		const vboxDir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const vbox = new androidlib.virtualbox.VirtualBox(vboxDir);

		const geny = await androidlib.genymotion.detect(genyDir, vbox);

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
				guid: 'a9364ace-c263-433a-b137-1c8d4e70c348',
				target: '8.0',
				'sdk-version': '8.0',
				genymotion: '2.11.0',
				dpi: 420,
				abi: 'x86',
				googleApis: null
			}
		]);
		expect(geny.path).to.equal(genyDir);

		// TODO: Figure out how to mock the home dir and deployed dir
	});
});
