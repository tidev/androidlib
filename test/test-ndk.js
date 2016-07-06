import _ from 'lodash';
import appc from 'node-appc';
import del from 'del';
import fs from 'fs-extra';
import { GawkArray, GawkObject } from 'gawk';
import androidlib from '../src/index';
import path from 'path';
import temp from 'temp';

temp.track();

const ndk = androidlib.ndk;
const win = process.platform === 'win32' ? '-win' : '';
const cmd = appc.subprocess.cmd;

describe('ndk', () => {
	beforeEach(function () {
		this.ANDROID_NDK      = process.env.ANDROID_NDK;
		this.PATH             = process.env.PATH;
		process.env.JAVA_HOME = '';
		process.env.PATH      = '';
		process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS = 1;
		process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS = 1;
		process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH = 1;
	});

	afterEach(function () {
		process.env.ANDROID_NDK = this.ANDROID_NDK;
		process.env.PATH        = this.PATH;
		delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
		delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
		delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;
		ndk.resetCache();
	});

	describe('NDK', () => {
		it('should error if directory is invalid', () => {
			expect(() => {
				new ndk.NDK();
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new ndk.NDK(123);
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new ndk.NDK('');
			}).to.throw(TypeError, 'Expected directory to be a valid string');
		});

		it('should error if directory does not exist', () => {
			expect(() => {
				new ndk.NDK('foo/bar');
			}).to.throw(Error, 'Directory does not exist');
		});

		it('should error if directory is not an NDK', () => {
			expect(() => {
				new ndk.NDK(__dirname);
			}).to.throw(Error, 'Directory does not contain an Android NDK');
		});

		it('should load NDK with old version', () => {
			const values = new ndk.NDK(path.resolve('./test/mocks/ndk/64-bit/mock-android-ndk-r9')).toJS();
			expect(values.name).to.equal('r9');
			expect(values.version).to.equal('9.0');
		});

		it('should load NDK with missing old version', () => {
			const values = new ndk.NDK(path.resolve('./test/mocks/ndk/64-bit/mock-android-ndk-r9-no-version')).toJS();
			expect(values.name).to.equal('mock-android-ndk-r9-no-version');
			expect(values.version).to.be.null;
		});

		it('should load NDK with missing new version', () => {
			const values = new ndk.NDK(path.resolve('./test/mocks/ndk/64-bit/mock-android-ndk-r11b-no-version')).toJS();
			expect(values.name).to.equal('mock-android-ndk-r11b-no-version');
			expect(values.version).to.be.null;
		});

		it('should load NDK with bad new version', () => {
			const values = new ndk.NDK(path.resolve('./test/mocks/ndk/64-bit/mock-android-ndk-r11b-bad-version')).toJS();
			expect(values.name).to.equal('mock-android-ndk-r11b-bad-version');
			expect(values.version).to.equal('foo');
		});

		it('should load NDK with new major version', () => {
			const values = new ndk.NDK(path.resolve('./test/mocks/ndk/64-bit/mock-android-ndk-r11b-major-version')).toJS();
			expect(values.name).to.equal('r11');
			expect(values.version).to.equal('11.0');
		});
	});

	describe('detect()', () => {
		it('should detect NDK using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			this.ANDROID_NDK && (process.env.ANDROID_NDK = this.ANDROID_NDK);
			this.PATH        && (process.env.PATH      = this.PATH);
			delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;

			ndk.detect()
				.then(results => {
					expect(results).to.be.an.Array;
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r9d 32-bit', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/32-bit/mock-android-ndk-r9d${win}`);
			ndk.detect({ force: true, paths: ndkPath })
				.then(results => {
					validateResults(results, [
						{
							path: ndkPath,
							name: 'r9d',
							version: '9.3',
							arch: '32-bit',
							executables: {
								'ndk-build': path.join(ndkPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(ndkPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(ndkPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r9d 64-bit', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r9d${win}`);
			ndk.detect({ force: true, paths: ndkPath })
				.then(results => {
					validateResults(results, [
						{
							path: ndkPath,
							name: 'r9d',
							version: '9.3',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(ndkPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(ndkPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(ndkPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r11b 32-bit', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/32-bit/mock-android-ndk-r11b${win}`);
			ndk.detect({ force: true, paths: ndkPath })
				.then(results => {
					validateResults(results, [
						{
							path: ndkPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '32-bit',
							executables: {
								'ndk-build': path.join(ndkPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(ndkPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(ndkPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r11b 64-bit', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			ndk.detect({ force: true, paths: ndkPath })
				.then(results => {
					validateResults(results, [
						{
							path: ndkPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(ndkPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(ndkPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(ndkPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should not find any NDKs in an empty directory', done => {
			ndk.detect({ force: true, paths: path.resolve('./test/mocks/empty') })
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.have.lengthOf(0);
					done();
				})
				.catch(done);
		});

		it('should find mock NDK via ANDROID_NDK environment variable', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			process.env.ANDROID_NDK = ndkPath;
			delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;

			ndk.resetCache(true);

			ndk.detect({ force: true })
				.then(results => {
					validateResults(results, [
						{
							path: ndkPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(ndkPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(ndkPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(ndkPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should not find an NDK when ANDROID_NDK points to a file', done => {
			process.env.ANDROID_NDK = __filename;
			ndk.detect({ force: true })
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.have.lengthOf(0);
					done();
				})
				.catch(done);
		});

		it('should find mock NDK via ndk-build in the PATH', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			process.env.PATH = ndkPath;
			delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;

			ndk.resetCache(true);

			ndk.detect({ force: true })
				.then(results => {
					validateResults(results, [
						{
							path: ndkPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(ndkPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(ndkPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(ndkPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should not find a NDK when paths is a file', done => {
			ndk.detect({ force: true, paths: __filename })
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.have.lengthOf(0);
					done();
				})
				.catch(done);
		});

		it('should not re-detect after initial detect', done => {
			let tmp = temp.mkdirSync('androidlib-test-');
			try {
				tmp = fs.realpathSync(tmp);
			} catch (e) {
				// squeltch
			}

			const r9Path = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r9d${win}`);
			const r11bPath = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			const opts = {
				force: true,
				paths: [
					r11bPath,
					tmp
				]
			};

			// run the initial detect
			ndk.detect(opts)
				.then(results => {
					validateResults(results, [
						{
							path: r11bPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(r11bPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(r11bPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(r11bPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
				})
				.then(() => {
					// run detect again, but this time we do not force re-detect and
					// we copy JDK 1.7 into the tmp dir so that there should be 2
					// detected JDKs, but since we're not forcing, it's returning
					// the cached results
					opts.force = false;
					fs.copySync(r9Path, tmp);
					return ndk.detect(opts);
				})
				.then(results => {
					validateResults(results, [
						{
							path: r11bPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(r11bPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(r11bPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(r11bPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
				})
				.then(() => {
					// force re-detect again to find the JDK 1.7 we copied
					opts.force = true;
					return ndk.detect(opts);
				})
				.then(results => {
					validateResults(results, [
						{
							path: tmp,
							name: 'r9d',
							version: '9.3',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(tmp, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(tmp, `ndk-gdb${cmd}`),
								'ndk-which': path.join(tmp, `ndk-which${cmd}`)
							},
							default: false
						},
						{
							path: r11bPath,
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(r11bPath, `ndk-build${cmd}`),
								'ndk-gdb':   path.join(r11bPath, `ndk-gdb${cmd}`),
								'ndk-which': path.join(r11bPath, `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should queue up detect calls', function (done) {
			this.timeout(5000);
			this.slow(4000);

			const opts = {
				force: true,
				paths: path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`)
			};

			Promise
				.all([
					ndk.detect(opts),
					ndk.detect(opts)
				])
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.have.lengthOf(2);
					expect(results[0]).to.deep.equal(results[1]);
					done();
				})
				.catch(done);
		});

		it('should return unique gawk objects for different paths', done => {
			const opts1 = {
				force: true,
				gawk: true,
				paths: path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`)
			};

			const opts2 = {
				force: true,
				gawk: true,
				paths: path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r9d${win}`)
			};

			Promise
				.all([
					ndk.detect(opts1),
					ndk.detect(opts1),
					ndk.detect(opts2)
				])
				.then(results => {
					expect(results[0]).to.equal(results[1]);
					expect(results[0]).to.not.equal(results[2]);
					done();
				})
				.catch(done);
		});

		it('should return a gawk objects and receive updates', done => {
			let tmp = temp.mkdirSync('androidlib-test-');
			try {
				tmp = fs.realpathSync(tmp);
			} catch (e) {
				// squeltch
			}

			const opts = {
				force: true,
				gawk: true,
				paths: tmp
			};

			fs.copySync(path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`), path.join(tmp, 'ndk-r11b'));

			let counter = 0;

			function checkDone(err) {
				if (err || ++counter === 2) {
					done(err);
				}
			}

			ndk.detect(opts)
				.then(results => {
					validateResults(results.toJS(), [
						{
							path: path.join(tmp, 'ndk-r11b'),
							name: 'r11b',
							version: '11.1.2683735',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(tmp, 'ndk-r11b', `ndk-build${cmd}`),
								'ndk-gdb':   path.join(tmp, 'ndk-r11b', `ndk-gdb${cmd}`),
								'ndk-which': path.join(tmp, 'ndk-r11b', `ndk-which${cmd}`)
							},
							default: true
						}
					]);

					const unwatch = results.watch(_.debounce(evt => {
						try {
							unwatch();
							validateResults(evt.source.toJS(), [
								{
									path: path.join(tmp, 'ndk-r9d'),
									name: 'r9d',
									version: '9.3',
									arch: '64-bit',
									executables: {
										'ndk-build': path.join(tmp, 'ndk-r9d', `ndk-build${cmd}`),
										'ndk-gdb':   path.join(tmp, 'ndk-r9d', `ndk-gdb${cmd}`),
										'ndk-which': path.join(tmp, 'ndk-r9d', `ndk-which${cmd}`)
									},
									default: true
								}
							]);
							checkDone();
						} catch (err) {
							checkDone(err);
						}
					}));
				})
				.then(() => {
					del.sync([ path.join(tmp, 'ndk-r11b') ], { force: true });
					fs.copySync(path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r9d${win}`), path.join(tmp, 'ndk-r9d'));
					return ndk.detect(opts);
				})
				.then(results => {
					validateResults(results.toJS(), [
						{
							path: path.join(tmp, 'ndk-r9d'),
							name: 'r9d',
							version: '9.3',
							arch: '64-bit',
							executables: {
								'ndk-build': path.join(tmp, 'ndk-r9d', `ndk-build${cmd}`),
								'ndk-gdb':   path.join(tmp, 'ndk-r9d', `ndk-gdb${cmd}`),
								'ndk-which': path.join(tmp, 'ndk-r9d', `ndk-which${cmd}`)
							},
							default: true
						}
					]);
					checkDone();
				})
				.catch(checkDone);
		});

		it('should handle error when NDK paths is not an array of strings', done => {
			ndk.detect({ paths: [ 123 ] })
				.then(results => {
					done(new Error('Expected rejection'));
				})
				.catch(err => {
					try {
						expect(err).to.be.an.TypeError;
						expect(err.message).to.equal('Expected paths to be a string or an array of strings');
						done();
					} catch (e) {
						done(e);
					}
				});
		});

		it('should strip empty NDK paths', done => {
			ndk.detect({ paths: [ '' ] })
				.then(results => {
					expect(results).to.have.lengthOf(0);
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
			this.slow(5000);

			this.watcher = ndk
				.watch()
				.on('results', results => {
					validateResults(results);
					this.watcher.stop();
					done();
				})
				.on('error', done);
		});

		it('should watch directory for NDK to be added', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let count = 0;
			const src = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			const dest = temp.path('androidlib-test-');
			this.cleanup.push(dest);

			this.watcher = ndk
				.watch({ paths: dest })
				.on('results', results => {
					count++;
					if (count === 1) {
						// 1) initial call
						expect(results).to.have.lengthOf(0);
						// first time, copy the ndk into our temp directory
						fs.copySync(src, dest);

					} else if (count === 2) {
						// 2) should find our new NDK
						validateResults(results, [
							{
								path: dest,
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit',
								executables: {
									'ndk-build': path.join(dest, `ndk-build${cmd}`),
									'ndk-gdb':   path.join(dest, `ndk-gdb${cmd}`),
									'ndk-which': path.join(dest, `ndk-which${cmd}`)
								},
								default: true
							}
						]);
						setTimeout(() => del([dest], { force: true }), 250);

					} else if (count === 3) {
						// 3) should detect the NDK was deleted
						expect(results).to.have.lengthOf(0);
						this.watcher.stop();
						done();
					}
				})
				.on('error', done);
		});

		it('should watch a path to contain an NDK', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let count = 0;
			const src = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			const dest = temp.path('androidlib-test-');
			this.cleanup.push(dest);

			this.watcher = ndk
				.watch({ paths: dest })
				.on('results', results => {
					count++;
					if (count === 1) {
						// 1) initial call
						expect(results).to.have.lengthOf(0);

						// first time, copy the ndk into our temp directory
						fs.copySync(src, path.join(dest, 'android-ndk'));

					} else if (count === 2) {
						// 2) should find our new NDK
						validateResults(results, [
							{
								path: path.join(dest, 'android-ndk'),
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit',
								executables: {
									'ndk-build': path.join(dest, 'android-ndk', `ndk-build${cmd}`),
									'ndk-gdb':   path.join(dest, 'android-ndk', `ndk-gdb${cmd}`),
									'ndk-which': path.join(dest, 'android-ndk', `ndk-which${cmd}`)
								},
								default: true
							}
						]);
						setTimeout(() => del([dest], { force: true }), 250);

					} else if (count === 3) {
						// 3) should detect the NDK was deleted
						expect(results).to.have.lengthOf(0);
						this.watcher.stop();
						done();
					}
				})
				.on('error', done);
		});

		it('should watch directory for NDK to be deleted', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let tmp = temp.mkdirSync('androidlib-test-');
			try {
				tmp = fs.realpathSync(tmp);
			} catch (e) {
				// squeltch
			}

			const r11bPath = path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`);
			const opts = {
				force: true,
				paths: [
					r11bPath,
					tmp
				]
			};

			fs.copySync(path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r9d${win}`), tmp);

			let count = 0;

			this.watcher = ndk
				.watch(opts)
				.on('results', results => {
					count++;

					if (count === 1) {
						validateResults(results, [
							{
								path: tmp,
								name: 'r9d',
								version: '9.3',
								arch: '64-bit',
								executables: {
									'ndk-build': path.join(tmp, `ndk-build${cmd}`),
									'ndk-gdb':   path.join(tmp, `ndk-gdb${cmd}`),
									'ndk-which': path.join(tmp, `ndk-which${cmd}`)
								},
								default: false
							},
							{
								path: r11bPath,
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit',
								executables: {
									'ndk-build': path.join(r11bPath, `ndk-build${cmd}`),
									'ndk-gdb':   path.join(r11bPath, `ndk-gdb${cmd}`),
									'ndk-which': path.join(r11bPath, `ndk-which${cmd}`)
								},
								default: true
							}
						]);
						del.sync([tmp], { force: true });
					} else if (count === 2) {
						validateResults(results, [
							{
								path: r11bPath,
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit',
								executables: {
									'ndk-build': path.join(r11bPath, `ndk-build${cmd}`),
									'ndk-gdb':   path.join(r11bPath, `ndk-gdb${cmd}`),
									'ndk-which': path.join(r11bPath, `ndk-which${cmd}`)
								},
								default: true
							}
						]);
						this.watcher.stop();
						done();
					}
				})
				.on('error', done);
		});

		it('should return a gawk array and receive updates', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let tmp = temp.mkdirSync('androidlib-test-');
			try {
				tmp = fs.realpathSync(tmp);
			} catch (e) {
				// squeltch
			}

			const opts = {
				gawk: true,
				paths: tmp
			};

			fs.copySync(path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r11b${win}`), path.join(tmp, 'ndk-r11b'));

			let counter = 0;
			let gobj = null;

			const checkDone = err => {
				if (err || ++counter === 1) {
					this.watcher.stop();
					done(err);
				}
			};

			this.watcher = ndk
				.watch(opts)
				.on('results', results => {
					expect(results).to.be.instanceof(appc.gawk.GawkArray);
					if (gobj === null) {
						validateResults(results.toJS(), [
							{
								path: path.join(tmp, 'ndk-r11b'),
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit',
								executables: {
									'ndk-build': path.join(tmp, 'ndk-r11b', `ndk-build${cmd}`),
									'ndk-gdb':   path.join(tmp, 'ndk-r11b', `ndk-gdb${cmd}`),
									'ndk-which': path.join(tmp, 'ndk-r11b', `ndk-which${cmd}`)
								},
								default: true
							}
						]);
						gobj = results;
						const unwatch = results.watch(_.debounce(evt => {
							try {
								unwatch();
								validateResults(evt.source.toJS(), [
									{
										path: path.join(tmp, 'ndk-r9d'),
										name: 'r9d',
										version: '9.3',
										arch: '64-bit',
										executables: {
											'ndk-build': path.join(tmp, 'ndk-r9d', `ndk-build${cmd}`),
											'ndk-gdb':   path.join(tmp, 'ndk-r9d', `ndk-gdb${cmd}`),
											'ndk-which': path.join(tmp, 'ndk-r9d', `ndk-which${cmd}`)
										},
										default: true
									}
								]);
								checkDone();
							} catch (err) {
								checkDone(err);
							}
						}));
						del.sync([ path.join(tmp, 'ndk-r11b') ], { force: true });
						fs.copySync(path.resolve(`./test/mocks/ndk/64-bit/mock-android-ndk-r9d${win}`), path.join(tmp, 'ndk-r9d'));
					}
				})
				.on('error', checkDone);
		});

		it('should handle error when jdk paths is invalid', function (done) {
			this.watcher = ndk
				.watch({ paths: [ 123 ] })
				.on('results', results => {
					this.watcher.stop();
					done(new Error('Expected error to be emitted'));
				})
				.on('error', err => {
					try {
						this.watcher.stop();
						expect(err).to.be.an.TypeError;
						expect(err.message).to.equal('Expected paths to be a string or an array of strings');
						done();
					} catch (e) {
						done(e);
					}
				});
		});
	});
});

function validateResults(results, expected) {
	expect(results).to.be.an.Array;

	for (const ndk of results) {
		expect(ndk).to.have.keys('path', 'name', 'version', 'arch', 'executables', 'default');

		expect(ndk.path).to.be.a.String;
		expect(ndk.name).to.be.a.String;
		expect(ndk.version).to.be.a.String;
		expect(ndk.arch).to.be.a.String;

		expect(ndk.executables).to.be.an.Object;
		for (const name of Object.keys(ndk.executables)) {
			expect(ndk.executables[name]).to.be.a.String;
			expect(ndk.executables[name]).to.not.equal('');
			expect(() => fs.statSync(ndk.executables[name])).to.not.throw(Error);
		}
	}

	if (expected) {
		expect(results).to.deep.equal(expected);
	}
}
