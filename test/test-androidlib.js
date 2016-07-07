import androidlib from '../src/index';
import path from 'path';

describe('androidlib', () => {
	describe('detect()', () => {
		beforeEach(function () {
			this.androidNDKEnv      = process.env.ANDROID_NDK;
			this.androidSDKEnv      = process.env.ANDROID_SDK;
			this.pathEnv            = process.env.PATH;
			process.env.ANDROID_NDK = '';
			process.env.ANDROID_SDK = '';
			process.env.PATH        = '';
		});

		afterEach(function () {
			process.env.ANDROID_NDK = this.androidNDKEnv;
			process.env.ANDROID_SDK = this.androidSDKEnv;
			process.env.PATH        = this.pathEnv;
			androidlib.resetCache();
		});

		it('should detect the Android environment', function (done) {
			this.timeout(10000);
			this.slow(5000);

			androidlib
				.detect({
					force: true
				})
				.then(results => {
					validateResults(results);
					done();
				})
				.catch(done);
		});
	});

	describe('watch()', () => {
		beforeEach(function () {
			this.androidNDKEnv      = process.env.ANDROID_NDK;
			this.androidSDKEnv      = process.env.ANDROID_SDK;
			this.pathEnv            = process.env.PATH;
			process.env.ANDROID_NDK = '';
			process.env.ANDROID_SDK = '';
			process.env.PATH        = '';
			this.watcher            = null;
		});

		afterEach(function () {
			process.env.ANDROID_NDK = this.androidNDKEnv;
			process.env.ANDROID_SDK = this.androidSDKEnv;
			process.env.PATH        = this.pathEnv;
			this.watcher && this.watcher.stop();
			androidlib.resetCache();
		});

		it.skip('should watch the Android environment', function (done) {
			this.timeout(10000);
			this.slow(5000);

			this.watcher = androidlib
				.watch()
				.on('results', results => {
					try {
						this.watcher.stop();
						validateResults(results);
						done();
					} catch (e) {
						done(e);
					}
				})
				.on('error', done);
		});
	});

	describe('getAVDHome()', () => {
		beforeEach(function () {
			this.androidAVDHomeEnv   = process.env.ANDROID_AVD_HOME;
			this.homeEnv             = process.env.HOME;
			this.userProfileEnv      = process.env.USERPROFILE;
			process.env.ANDROID_HOME = '';
		});

		afterEach(function () {
			process.env.ANDROID_AVD_HOME = this.androidAVDHomeEnv;
			process.env.HOME             = this.homeEnv;
			process.env.USERPROFILE      = this.userProfileEnv;
		});

		it('should get the Android AVD home directory using defaults', done => {
			androidlib
				.getAVDHome()
				.then(dir => {
					done();
				})
				.catch(done);
		});

		it('should get the Android AVD home directory with explicit path', done => {
			const p = path.resolve('./test/mocks/home');
			androidlib
				.getAVDHome(p)
				.then(dir => {
					expect(dir).to.equal(p);
					done();
				})
				.catch(done);
		});

		it('should get the Android AVD home directory using ANDROID_HOME', done => {
			const p = path.resolve('./test/mocks/home');
			process.env.ANDROID_AVD_HOME = p;
			androidlib
				.getAVDHome()
				.then(dir => {
					expect(dir).to.equal(p);
					done();
				})
				.catch(done);
		});

		it('should fail to find the Android AVD home directory', done => {
			process.env.HOME         = '';
			process.env.USERPROFILE  = '';

			androidlib
				.getAVDHome()
				.then(dir => {
					expect(dir).to.be.null;
					done();
				})
				.catch(done);
		});
	});
});

function validateResults(results) {
	expect(results).to.be.an.Object;
	expect(results).to.have.keys('home', 'ndk', 'sdk');

	//console.log(results);
}
