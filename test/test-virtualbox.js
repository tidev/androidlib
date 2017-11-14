import path from 'path';

import * as androidlib from '../dist/index';

import { exe } from 'appcd-subprocess';

describe('VirtualBox', () => {
	it('should error if directory is invalid', () => {
		expect(() => {
			new androidlib.virtualbox.VirtualBox();
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.virtualbox.VirtualBox();
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.virtualbox.VirtualBox();
		}).to.throw(TypeError, 'Expected directory to be a valid string');
	});

	it('should error if directory does not exist', () => {
		expect(() => {
			new androidlib.virtualbox.VirtualBox(path.join(__dirname, 'doesnotexist'));
		}).to.throw(Error, 'Directory does not exist');
	});

	it('should error if "vboxmanage" is missing', () => {
		expect(() => {
			new androidlib.virtualbox.VirtualBox(path.resolve('./test/mocks/empty'));
		}).to.throw(Error, 'Directory does not contain a "vboxmanage" executable');
	});

	it('should detect a correct directory', () => {
		const dir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);

		const results = new androidlib.virtualbox.VirtualBox(dir);

		expect(results).to.deep.equal({
			executables: {
				vboxmanage: path.join(dir, `vboxmanage${exe}`)
			},
			version: '5.0.28r111378'
		});
	});

	it('should list vms', async () => {
		const dir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const vbox = new androidlib.virtualbox.VirtualBox(dir);
		const results = await vbox.list();
		expect(results).to.deep.equal([
			{
				name: 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
				guid: 'a9364ace-c263-433a-b137-1c8d4e70c348'
			}
		]);
	});

	it('list vms should return null if vboxmanage errored', async () => {
		const dir = path.resolve(`./test/mocks/virtualbox/${process.platform}/bad`);
		const vbox = new androidlib.virtualbox.VirtualBox(dir);
		const results = await vbox.list();
		expect(results).to.equal(null);
	});

	it('should enumerate guestproperties', async () => {
		const dir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const vbox = new androidlib.virtualbox.VirtualBox(dir);
		const results = await vbox.getGuestproperties('a9364ace-c263-433a-b137-1c8d4e70c348');
		expect(results).to.deep.equal([
			{ name: 'android_version', value: '8.0' },
			{ name: 'datadisk_size', value: '32768' },
			{ name: 'genymotion_device_id', value: '000000000000000' },
			{ name: 'genymotion_force_navbar', value: '1' },
			{ name: 'genymotion_platform', value: 'p' },
			{ name: 'genymotion_player_version', value: '1' },
			{ name: 'genymotion_version', value: '2.11.0' },
			{ name: 'sensor_camera', value: '1' },
			{ name: 'sensor_gyro', value: '1' },
			{ name: 'vbox_dpi', value: '420' }
		]);
	});

	it('enumerate guest properties should return null if vboxmanage errored', async () => {
		const dir = path.resolve(`./test/mocks/virtualbox/${process.platform}/bad`);
		const vbox = new androidlib.virtualbox.VirtualBox(dir);
		const results = await vbox.getGuestproperties('a9364ace-c263-433a-b137-1c8d4e70c348');
		expect(results).to.equal(null);
	});
});
