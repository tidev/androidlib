import path from 'path';

import * as androidlib from '../dist/index';
import { cmd } from 'appcd-subprocess';

describe('NDK', () => {
	it('should error if directory is invalid', () => {
		expect(() => {
			new androidlib.ndk.NDK();
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.ndk.NDK(123);
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.ndk.NDK('');
		}).to.throw(TypeError, 'Expected directory to be a valid string');
	});

	it('should error if directory does not exist', () => {
		expect(() => {
			new androidlib.ndk.NDK(path.join(__dirname, 'doesnotexist'));
		}).to.throw(Error, 'Directory does not exist');
	});

	it('should error if directory is missing the "build" directory', () => {
		expect(() => {
			new androidlib.ndk.NDK(path.join(__dirname, 'mocks/ndk/all/no-build-dir'));
		}).to.throw(Error, 'Directory does not contain the "build" directory');
	});

	it('should error if directory is missing the "platforms" directory', () => {
		expect(() => {
			new androidlib.ndk.NDK(path.join(__dirname, 'mocks/ndk/all/no-platforms-dir'));
		}).to.throw(Error, 'Directory does not contain the "platforms" directory');
	});

	it('should error if directory is missing the "ndk-build" executable', () => {
		expect(() => {
			new androidlib.ndk.NDK(path.join(__dirname, 'mocks/ndk/all/no-ndk-build'));
		}).to.throw(Error, 'Directory does not contain the "ndk-build" executable');
	});

	it('should error if directory is missing the "ndk-which" executable', () => {
		expect(() => {
			new androidlib.ndk.NDK(path.join(__dirname, `mocks/ndk/${process.platform}/no-ndk-which`));
		}).to.throw(Error, 'Directory does not contain the "ndk-which" executable');
	});

	it('should detect an NDK with no version', () => {
		const dir = path.join(__dirname, `mocks/ndk/${process.platform}/no-version`);
		const ndk = new androidlib.ndk.NDK(dir);
		expect(ndk).to.deep.equal({
			path: dir,
			name: 'no-version',
			version: null,
			arch: '64-bit',
			executables: {
				'ndk-build': path.join(dir, `ndk-build${cmd}`),
				'ndk-which': path.join(dir, `ndk-which${cmd}`)
			}
		});
	});

	it('should detect an NDK r9 64-bit release', () => {
		const dir = path.join(__dirname, `mocks/ndk/${process.platform}/r9d-64bit`);
		const ndk = new androidlib.ndk.NDK(dir);
		expect(ndk).to.deep.equal({
			path: dir,
			name: 'r9d',
			version: '9.3',
			arch: '64-bit',
			executables: {
				'ndk-build': path.join(dir, `ndk-build${cmd}`),
				'ndk-which': path.join(dir, `ndk-which${cmd}`)
			}
		});
	});

	it('should detect an NDK r9d 32-bit release', () => {
		const dir = path.join(__dirname, `mocks/ndk/${process.platform}/r9d-32bit`);
		const ndk = new androidlib.ndk.NDK(dir);
		expect(ndk).to.deep.equal({
			path: dir,
			name: 'r9d',
			version: '9.3',
			arch: '32-bit',
			executables: {
				'ndk-build': path.join(dir, `ndk-build${cmd}`),
				'ndk-which': path.join(dir, `ndk-which${cmd}`)
			}
		});
	});

	it('should detect an NDK r11b 64-bit release', () => {
		const dir = path.join(__dirname, `mocks/ndk/${process.platform}/r11b-64bit`);
		const ndk = new androidlib.ndk.NDK(dir);
		expect(ndk).to.deep.equal({
			path: dir,
			name: 'r11b',
			version: '11.1.2683735',
			arch: '64-bit',
			executables: {
				'ndk-build': path.join(dir, `ndk-build${cmd}`),
				'ndk-which': path.join(dir, `ndk-which${cmd}`)
			}
		});
	});

	it('should detect an NDK r11b 32-bit release', () => {
		const dir = path.join(__dirname, `mocks/ndk/${process.platform}/r11b-32bit`);
		const ndk = new androidlib.ndk.NDK(dir);
		expect(ndk).to.deep.equal({
			path: dir,
			name: 'r11b',
			version: '11.1.2683735',
			arch: '32-bit',
			executables: {
				'ndk-build': path.join(dir, `ndk-build${cmd}`),
				'ndk-which': path.join(dir, `ndk-which${cmd}`)
			}
		});
	});
});
