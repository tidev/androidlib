import androidlib from '../src/index';
import appc from 'node-appc';
import del from 'del';
import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';

temp.track();

const virtualbox = androidlib.virtualbox;

describe('virtualbox', () => {
	beforeEach(function () {
		this.PATH        = process.env.PATH;
		process.env.PATH = '';
		process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS = 1;
		process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS = 1;
		process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH = 1;
	});

	afterEach(function () {
		process.env.PATH = this.PATH;
		delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
		delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
		delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;
		virtualbox.resetCache(true);
	});

	describe('VirtualBox', () => {
		it('should error if directory is invalid', () => {
			expect(() => {
				new virtualbox.VirtualBox();
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new virtualbox.VirtualBox(123);
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new virtualbox.VirtualBox('');
			}).to.throw(TypeError, 'Expected directory to be a valid string');
		});

		it('should error if directory does not exist', () => {
			expect(() => {
				new virtualbox.VirtualBox(path.join(__dirname, 'mocks', 'doesnotexist'));
			}).to.throw(Error, 'Directory does not exist or is actually a file');
		});

		it('should error if the directory does not contain vboxmanage', () => {
			expect(() => {
				new virtualbox.VirtualBox(path.join(__dirname, 'mocks', 'empty'));
			}).to.throw(Error, 'Directory does not contain vboxmanage executable');
		});

		it('should find mock VirtualBox', done => {
			const mockDir = path.resolve('./test/mocks/virtualbox');
			const vbox = new virtualbox.VirtualBox(mockDir);
			const expected = {
				path: mockDir,
				executables: {
					vboxmanage: path.join(mockDir, `vboxmanage${appc.subprocess.exe}`)
				},
				version: null
			};

			expect(vbox.toJS()).to.deep.equal(expected);

			vbox.init()
				.then(() => {
					expected.version = '1.2.3r456789';
					expect(vbox.toJS()).to.deep.equal(expected);
					done();
				})
				.catch(done);
		});
	});

	describe('detect()', () => {
		it('should detect VirtualBox using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			process.env.PATH = this.PATH;
			delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;

			virtualbox.detect()
				.then(result => {
					if (typeof result !== 'undefined') {
						validateResult(result);
					}
					done();
				})
				.catch(done);
		});

		it('should detect mock VirtualBox', function (done) {
			this.timeout(10000);
			this.slow(5000);

			const mockDir = path.resolve('./test/mocks/virtualbox');
			virtualbox.detect({ paths: mockDir })
				.then(result => {
					expect(result).to.deep.equal({
						path: mockDir,
						executables: {
							vboxmanage: path.join(mockDir, `vboxmanage${appc.subprocess.exe}`)
						},
						version: '1.2.3r456789'
					});
					done();
				})
				.catch(done);
		});

		it('should not detect anything in empty directory', function (done) {
			this.timeout(10000);
			this.slow(5000);

			virtualbox.detect({ paths: path.resolve('./test/mocks/empty') })
				.then(result => {
					expect(result).to.be.undefined;
					done();
				})
				.catch(done);
		});
	});

	describe('watch()', () => {
		beforeEach(function () {
			this.cleanup            = [];
			this.watcher            = null;
		});

		afterEach(function () {
			temp.cleanupSync();
			this.watcher && this.watcher.stop();
			del.sync(this.cleanup, { force: true });
		});

		it('should watch using defaults', function (done) {
			this.timeout(10000);
			this.slow(6000);

			this.watcher = virtualbox
				.watch()
				.on('results', result => {
					if (typeof result !== 'undefined') {
						validateResult(result);
					}
				})
				.on('ready', () => {
					done();
				})
				.on('error', done);
		});

		it('should watch directory for VirtualBox to be added', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let count = 0;
			const src = path.resolve('./test/mocks/virtualbox');
			const dest = temp.path('androidlib-test-');
			this.cleanup.push(dest);

			this.watcher = virtualbox
				.watch({ paths: dest })
				.on('results', result => {
					count++;
					if (count === 1) {
						expect(result).to.deep.equal({
							path: dest,
							executables: {
								vboxmanage: path.join(dest, `vboxmanage${appc.subprocess.exe}`)
							},
							version: '1.2.3r456789'
						});
						setTimeout(() => del([dest], { force: true }), 250);

					} else if (count === 2) {
						expect(result).to.equal.undefined;
						this.watcher.stop();
						done();
					}
				})
				.on('ready', () => {
					fs.copySync(src, dest);
				})
				.on('error', done);
		});
	});
});

function validateResult(result) {
	expect(result).to.be.an.Object;
	expect(result).to.have.keys('path', 'executables', 'version');

	expect(result.path).to.be.a.String;
	expect(appc.fs.isDir(result.path)).to.be.true;

	expect(result.executables).to.be.an.Object;
	expect(result.executables).to.have.keys('vboxmanage');
	expect(result.executables.vboxmanage).to.be.a.String;
	expect(appc.fs.isFile(result.executables.vboxmanage)).to.be.true;

	expect(result.version).to.be.a.String;
	expect(result.version).to.not.equal('');
}
