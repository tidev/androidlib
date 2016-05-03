import del from 'del';
import fs from 'fs-extra';
import { GawkArray, GawkObject } from 'gawk';
import { ndk } from '../src/index';
import path from 'path';
import temp from 'temp';

temp.track();

const win = process.platform === 'win32' ? '-win' : '';

describe('ndk', () => {
	before(function () {
		this.androidNDKEnv = process.env.ANDROID_NDK;
		this.pathEnv = process.env.PATH;
		process.env.ANDROID_NDK = '';
		process.env.PATH = '';
	});

	after(function () {
		process.env.ANDROID_NDK = this.androidNDKEnv;
		process.env.PATH = this.pathEnv;
	});

	describe('detect()', () => {
		it('should detect NDK version r9d 32-bit', function (done) {
			const ndkPath = path.resolve(`./test/mocks/mockNDKs/32-bit/mock-android-ndk-r9d${win}`);
			ndk.detect({ bypassCache: true, ndkPath, searchPaths: null })
				.then(ndks => {
					checkResult(ndks, {
						ndkPath,
						name: 'r9d',
						version: '9.3',
						arch: '32-bit'
					});
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r9d 64-bit', function (done) {
			const ndkPath = path.resolve(`./test/mocks/mockNDKs/64-bit/mock-android-ndk-r9d${win}`);
			ndk.detect({ bypassCache: true, ndkPath, searchPaths: null })
				.then(ndks => {
					checkResult(ndks, {
						ndkPath,
						name: 'r9d',
						version: '9.3',
						arch: '64-bit'
					});
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r11b 32-bit', done => {
			const ndkPath = path.resolve(`./test/mocks/mockNDKs/32-bit/mock-android-ndk-r11b${win}`);
			ndk.detect({ bypassCache: true, ndkPath, searchPaths: null })
				.then(ndks => {
					checkResult(ndks, {
						ndkPath,
						name: 'r11b',
						version: '11.1.2683735',
						arch: '32-bit'
					});
					done();
				})
				.catch(done);
		});

		it('should detect NDK version r11b 64-bit', done => {
			const ndkPath = path.resolve(`./test/mocks/mockNDKs/64-bit/mock-android-ndk-r11b${win}`);
			ndk.detect({ bypassCache: true, ndkPath, searchPaths: null })
				.then(ndks => {
					checkResult(ndks, {
						ndkPath,
						name: 'r11b',
						version: '11.1.2683735',
						arch: '64-bit'
					});
					done();
				})
				.catch(done);
		});
	});

	describe('watch()', () => {
		beforeEach(function () {
			this.cleanup = [];
		});

		afterEach(function (done) {
			temp.cleanupSync();
			del(this.cleanup, { force: true }).then(() => done()).catch(done);
		});

		it('should watch a path to be an NDK', function (done) {
			this.timeout(10000);
			this.slow(10000);

			let iteration = 0;
			const src = path.resolve('./test/mocks/mockNDKs/64-bit/mock-android-ndk-r11b');
			const dest = temp.path('androidlib-test-');
			this.cleanup.push(dest);

			ndk.watch({ searchPaths: [ dest ] })
				.then(watcher => watcher
					.listen(ndks => {
						iteration++;

						if (iteration === 1) {
							// 1) initial call
							expect(ndks).to.be.instanceOf(GawkArray);
							expect(ndks).to.have.lengthOf(0);

							// first time, copy the ndk into our temp directory
							fs.copy(src, dest, { clobber: true }, err => {
								watcher.stop();
								done(err);
							});

						} else if (iteration === 2) {
							// 2) should find our new NDK
							checkResult(ndks, {
								ndkPath: src,
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit'
							});
							setTimeout(() => del([dest]), 250);

						} else if (iteration === 3) {
							// 3) should detect the NDK was deleted
							expect(ndks).to.be.instanceOf(GawkArray);
							expect(ndks).to.have.lengthOf(0);
							watcher.stop();
							done();

						} else {
							// this shouldn't happen
							watcher.stop();
							done(new Error(`Expected listener to be called 3 times, but was actually called ${iteration} times`));
						}
					})
					.catch(done)
				);
		});

		it('should watch a path to contain an NDK', function (done) {
			this.timeout(10000);
			this.slow(10000);

			let iteration = 0;
			const src = path.resolve('./test/mocks/mockNDKs/64-bit/mock-android-ndk-r11b');
			const dest = temp.path('androidlib-test-');
			this.cleanup.push(dest);

			ndk.watch({ searchPaths: [ dest ] })
				.then(watcher => watcher
					.listen(ndks => {
						iteration++;

						if (iteration === 1) {
							// 1) initial call
							expect(ndks).to.be.instanceOf(GawkArray);
							expect(ndks).to.have.lengthOf(0);

							// first time, copy the ndk into our temp directory
							fs.copy(src, path.join(dest, 'android-ndk'), { clobber: true }, err => {
								watcher.stop();
								done(err);
							});

						} else if (iteration === 2) {
							// 2) should find our new NDK
							checkResult(ndks, {
								ndkPath: src,
								name: 'r11b',
								version: '11.1.2683735',
								arch: '64-bit'
							});
							setTimeout(() => del([dest]), 250);

						} else if (iteration === 3) {
							// 3) should detect the NDK was deleted
							expect(ndks).to.be.instanceOf(GawkArray);
							expect(ndks).to.have.lengthOf(0);
							watcher.stop();
							done();

						} else {
							// this shouldn't happen
							watcher.stop();
							done(new Error(`Expected listener to be called 3 times, but was actually called ${iteration} times`));
						}
					})
					.catch(done)
				);
		});

		it('should error if watcher is stopped', function (done) {
			const ndkPath = path.resolve('./test/mocks/mockNDKs/64-bit/mock-android-ndk-r11b');

			ndk.watch({ ndkPath, searchPaths: null }).then(watcher => watcher
				.listen(ndk => {
					watcher.stop();
					expect(() => {
						watcher.listen(ndk => {});
					}).to.throw(Error, 'This watcher has been stopped');
					done();
				})
			);
		});

		it('should error if listen receives a non-function', function (done) {
			const ndkPath = path.resolve('./test/mocks/mockNDKs/64-bit/mock-android-ndk-r11b');

			ndk.watch({ ndkPath, searchPaths: null }).then(watcher => {
				expect(() => {
					watcher.listen('foo');
				}).to.throw(TypeError, 'Expected listener to be a function');
				done();
			});
		});

		it('should only allow listen to be called once', function (done) {
			const ndkPath = path.resolve('./test/mocks/mockNDKs/64-bit/mock-android-ndk-r11b');

			ndk.watch({ ndkPath, searchPaths: null }).then(watcher => {
				watcher.listen(ndk => {
					watcher.stop();
					done();
				});
				expect(() => {
					watcher.listen(ndk => {});
				}).to.throw(Error, 'Expected listen() to only be called once');
			});
		});
	});
});

function checkResult(ndks, expected) {
	expect(ndks).to.be.instanceOf(GawkArray);
	expect(ndks).to.have.lengthOf(1);

	let ndk = ndks.get(0);
	expect(ndk).to.be.instanceOf(GawkObject);
	expect(ndk.keys()).to.deep.equal(['path', 'name', 'version', 'arch', 'executables']);

	ndks = ndks.toJS();

	expect(ndks).to.be.an.Array;
	expect(ndks).to.have.lengthOf(1);

	ndk = ndks[0];
	expect(ndk).to.have.keys('path', 'name', 'version', 'arch', 'executables');

	expect(ndk.path).to.be.a.String;
	expect(ndk.path).to.equal(expected.ndkPath);

	expect(ndk.name).to.be.a.String;
	expect(ndk.name).to.equal(expected.name);

	expect(ndk.version).to.be.a.String;
	expect(ndk.version).to.equal(expected.version);

	expect(ndk.arch).to.be.a.String;
	expect(ndk.arch).to.equal(expected.arch);

	expect(ndk.executables).to.be.an.Object;
	for (const name of Object.keys(ndk.executables)) {
		expect(ndk.executables[name]).to.be.a.String;
		expect(ndk.executables[name]).to.not.equal('');
		expect(() => fs.statSync(ndk.executables[name])).to.not.throw(Error);
	}
}
