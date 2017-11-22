import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

import * as androidlib from '../dist/index';

import { exe } from 'appcd-subprocess';

const tmpDir = tmp.dirSync({
	prefix: 'androidlib-virtualbox-test-',
	unsafeCleanup: true
}).name;

describe('VirtualBox', () => {
	beforeEach(function () {
		this.configFile = androidlib.options.virtualbox.configFile;
	});

	afterEach(function () {
		androidlib.options.virtualbox.configFile = this.configFile;
	});

	after(() => {
		fs.removeSync(tmpDir);
	});

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

		expect(results).to.be.an('object');
		expect(results).to.have.keys('configFile', 'executables', 'path', 'version');

		expect(results.configFile).to.be.a('string');

		expect(results.executables).to.deep.equal({
			vboxmanage: path.join(dir, `vboxmanage${exe}`)
		});

		expect(results.path).to.equal(dir);
		expect(results.version).to.equal('5.0.28r111378');
	});

	it('should list vms', () => {
		const configFile = path.join(tmpDir, 'VirtualBox.xml');
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

		const dir = path.resolve(`./test/mocks/virtualbox/${process.platform}/good`);
		const vbox = new androidlib.virtualbox.VirtualBox(dir);

		expect(vbox).to.deep.equal({
			configFile,
			executables: {
				vboxmanage: path.join(dir, `vboxmanage${exe}`)
			},
			path: dir,
			version: '5.0.28r111378'
		});

		const results = vbox.list();
		expect(results).to.deep.equal([
			{
				id: vms[0].uuid,
				name: 'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
				path: path.dirname(vms[0].src),
				props: {
					android_version:                '8.0',
					androvm_ip_management:          '',
					datadisk_size:                  '32768',
					genymotion_device_id:           '000000000000000',
					genymotion_force_navbar:        '1',
					genymotion_platform:            'p',
					genymotion_player_version:      '1',
					genymotion_version:             '2.11.0',
					genymotion_vm_name:             'PREVIEW - Google Pixel - 8.0 - API 26 - 1080x1920',
					hardware_opengl:                '1',
					hardware_opengl_disable_render: '0',
					release_date:                   'Thu Oct 19 02:10:10 2017 GMT',
					sensor_camera:                  '1',
					sensor_gyro:                    '1',
					template_uuid:                  '74ad0f8b-90f5-47c5-bc7a-9c05b04de4ca',
					vbox_dpi:                       '420',
					vbox_graph_mode:                '1080x1920-16'
				}
			},
			{
				id: vms[1].uuid,
				name: 'Linux VM',
				path: path.dirname(vms[1].src),
				props: {}
			}
		]);
	});
});
