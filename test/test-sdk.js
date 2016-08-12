import androidlib from '../src/index';
import appc from 'node-appc';
import del from 'del';
import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';

//temp.track();

const exe = appc.subprocess.exe;
const bat = appc.subprocess.bat;
const sdk = androidlib.sdk;

describe('sdk', () => {
	beforeEach(function () {
		this.androidSDKRootEnv       = process.env.ANDROID_SDK_ROOT;
		this.androidSDKEnv           = process.env.ANDROID_SDK;
		this.pathEnv                 = process.env.PATH;
		process.env.ANDROID_SDK_ROOT = '';
		process.env.ANDROID_SDK      = '';
		process.env.PATH             = '';
		process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS = 1;
		process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS = 1;
		process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH = 1;
	});

	afterEach(function () {
		process.env.ANDROID_SDK_ROOT = this.androidSDKRootEnv;
		process.env.ANDROID_SDK      = this.androidSDKEnv;
		process.env.PATH             = this.pathEnv;
		delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
		delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
		delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;
		sdk.resetCache();
	});

	describe('SDK', () => {
		it('should error if directory is invalid', () => {
			expect(() => {
				new sdk.SDK();
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new sdk.SDK(123);
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new sdk.SDK('');
			}).to.throw(TypeError, 'Expected directory to be a valid string');
		});

		it('should error if directory does not exist', () => {
			expect(() => {
				new sdk.SDK(path.join(__dirname, 'mocks', 'doesnotexist'));
			}).to.throw(Error, 'Directory does not exist or is actually a file');
		});

		it('should error if tools source.properties is missing', () => {
			expect(() => {
				new sdk.SDK(path.resolve('./test/mocks/empty'));
			}).to.throw(Error, 'Directory does not contain a valid Android SDK');
		});

		it('should error if required tool is missing', () => {
			expect(() => {
				new sdk.SDK(path.resolve(`./test/mocks/sdk/${process.platform}/vanilla-missing-android`));
			}).to.throw(Error, 'Directory does not contain a valid Android SDK; missing executable "android"');
		});

		it('should find vanilla SDK', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/vanilla`);
			const results = new sdk.SDK(mockDir).toJS();

			validateResults([ results ], [
				{
					path:          mockDir,
					buildTools:    [],
					platformTools: { executables: {}, path: null, version: null },
					proguard:      path.join(mockDir, 'tools', 'proguard', 'lib', 'proguard.jar'),
					targets:       [],
					tools:         tools24(mockDir)
				}
			]);
		});

		it('should find vanilla SDK without proguard', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/vanilla-no-proguard`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults([ results ], [
				{
					path: mockDir,
					buildTools: [],
					platformTools: { executables: {}, path: null, version: null },
					proguard: null,
					targets: [],
					tools: tools24(mockDir)
				}
			]);
		});

		it('should find single SDK', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults([ results ], [
				{
					path:          mockDir,
					buildTools:    [ buildTools23(mockDir) ],
					platformTools: platformTools(mockDir),
					proguard:      path.join(mockDir, 'tools', 'proguard', 'lib', 'proguard.jar'),
					targets: [
						android23(mockDir),
						googleAPIs23(mockDir)
					],
					tools: tools25(mockDir)
				}
			]);
		});

		it('should find single SDK with bad build source.properties', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk-bad-build-source-props`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults([ results ], [
				{
					path: mockDir,
					buildTools: [
						{
							dx: path.join(mockDir, 'build-tools', '23.0.3', 'lib', 'dx.jar'),
							executables: {
								aapt: path.join(mockDir, 'build-tools', '23.0.3', `aapt${exe}`),
								aidl: path.join(mockDir, 'build-tools', '23.0.3', `aidl${exe}`),
								zipalign: path.join(mockDir, 'build-tools', '23.0.3', `zipalign${exe}`)
							},
							path: path.join(mockDir, 'build-tools', '23.0.3'),
							version: null
						}
					],
					platformTools: {
						executables: {},
						path: null,
						version: null
					},
					proguard: path.join(mockDir, 'tools', 'proguard', 'lib', 'proguard.jar'),
					targets: [],
					tools: tools25(mockDir)
				}
			]);
		});

		it('should find single SDK with no dx.jar', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk-no-dx`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults([ results ], [
				{
					path: mockDir,
					buildTools: [
						{
							'dx': null,
							'executables': {
								'aapt':     path.join(mockDir, `build-tools/23.0.3/aapt${exe}`),
								'aidl':     path.join(mockDir, `build-tools/23.0.3/aidl${exe}`),
								'zipalign': path.join(mockDir, `build-tools/23.0.3/zipalign${exe}`)
							},
							'path': path.join(mockDir, 'build-tools/23.0.3'),
							'version': '23.0.3'
						}
					],
					platformTools: {
						executables: {
							adb: path.join(mockDir, 'platform-tools', `adb${exe}`)
						},
						path: path.join(mockDir, 'platform-tools'),
						version: '23.1'
					},
					proguard: path.join(mockDir, 'tools', 'proguard', 'lib', 'proguard.jar'),
					targets: [
						android23(mockDir),
						googleAPIs23(mockDir)
					],
					tools: tools25(mockDir)
				}
			]);
		});

		it('should find multiple SDKs', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/multiple-sdks`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults([ results ], [
				{
					path: mockDir,
					buildTools: [
						buildTools23(mockDir),
						buildTools24(mockDir)
					],
					platformTools: platformTools(mockDir),
					proguard: path.join(mockDir, 'tools', 'proguard', 'lib', 'proguard.jar'),
					targets: [
						android23(mockDir),
						androidN(mockDir),
						googleAPIs23(mockDir)
					],
					tools: tools25(mockDir)
				}
			]);
		});
	});

	describe('detect()', () => {
		it('should detect SDK using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;
			sdk.resetCache(true);

			sdk.detect()
				.then(results => {
					validateResults(results);
					done();
				})
				.catch(done);
		});

		it('should detect single SDK', done => {
			const sdkPath = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk`);

			sdk.detect({ paths: sdkPath })
				.then(results => {
					validateResults(results, [
						{
							'path':          sdkPath,
							'buildTools':    [ buildTools23(sdkPath) ] ,
							'platformTools': platformTools(sdkPath),
							'proguard':      path.join(sdkPath, 'tools/proguard/lib/proguard.jar'),
							'targets': [
								android23(sdkPath),
								googleAPIs23(sdkPath)
							],
							'tools':   tools25(sdkPath),
							'default': true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should detect multiple SDKs', done => {
			const sdkPath = path.resolve(`./test/mocks/sdk/${process.platform}/multiple-sdks`);

			sdk.detect({ paths: sdkPath })
				.then(results => {
					validateResults(results, [
						{
							'path': sdkPath,
							'buildTools': [
								buildTools23(sdkPath),
								buildTools24(sdkPath)
							],
							'platformTools': platformTools(sdkPath),
							'proguard': path.join(sdkPath, '/tools/proguard/lib/proguard.jar'),
							'targets': [
								android23(sdkPath),
								androidN(sdkPath),
								googleAPIs23(sdkPath)
							],
							'tools': tools25(sdkPath),
							'default': true
						}
					]);
					done();
				})
				.catch(done);
		});

		it('should not find any SDKs if directory does not exist', done => {
			sdk.detect({ paths: path.resolve('./doesnotexist') })
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.be.lengthOf(0);
					done();
				})
				.catch(done);
		});

		it('should not find any SDKs if directory does not contain an SDK', done => {
			sdk.detect({ paths: path.resolve('./test/mocks/empty') })
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.be.lengthOf(0);
					done();
				})
				.catch(done);
		});

		it('should not find any SDKs if directory contains bad SDK', done => {
			sdk.detect({ paths: path.resolve(`./test/mocks/sdk/${process.platform}/vanilla-missing-android`) })
				.then(results => {
					expect(results).to.be.an.Array;
					expect(results).to.be.lengthOf(0);
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
			//temp.cleanupSync();
			this.watcher && this.watcher.stop();
			//del.sync(this.cleanup, { force: true });
		});

		it('should watch using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			this.watcher = sdk
				.watch()
				.on('results', results => {
					validateResults(results);
					this.watcher.stop();
					done();
				})
				.on('error', done);
		});

		it('should watch directory for SDK to be added', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let count = 0;
			const src = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk`);
			const dest = temp.path('androidlib-test-');
			this.cleanup.push(dest);

			this.watcher = sdk
				.watch({ paths: dest })
				.on('results', results => {
					count++;
					if (count === 1) {
						// 1) initial call
						expect(results).to.have.lengthOf(0);
						// first time, copy the SDK into our temp directory
						fs.copySync(src, dest);

					} else if (count === 2) {
						// 2) should find our new SDK
						validateResults(results, [
							{
								path:          dest,
								buildTools:    [ buildTools23(dest) ],
								platformTools: platformTools(dest),
								proguard:      path.join(dest, 'tools', 'proguard', 'lib', 'proguard.jar'),
								targets: [
									android23(dest),
									googleAPIs23(dest)
								],
								tools: tools25(dest),
								default: true
							}
						]);
						setTimeout(() => del([dest], { force: true }), 250);

					} else if (count === 3) {
						// 3) should detect the SDK was deleted
						expect(results).to.have.lengthOf(0);
						this.watcher.stop();
						done();
					}
				})
				.on('error', done);
		});

		it('should watch an SDK for a platform to be added', function (done) {
			this.timeout(10000);
			this.slow(5000);

			let count = 0;
			const src = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk`);
			const srcPlatform = path.resolve(`./test/mocks/sdk/${process.platform}/multiple-sdks/platforms/android-N`);
			const srcSystemImages = path.resolve(`./test/mocks/sdk/${process.platform}/multiple-sdks/system-images/android-N`);
			let dest = temp.path('androidlib-test-');

			fs.copySync(src, dest);
			dest = fs.realpathSync(dest);
			this.cleanup.push(dest);

			this.watcher = sdk
				.watch({ paths: dest })
				.on('results', results => {
					count++;
					if (count === 1) {
						// 1) initial call
						expect(results).to.have.lengthOf(1);
						validateResults(results, [
							{
								path:          dest,
								buildTools:    [ buildTools23(dest) ],
								platformTools: platformTools(dest),
								proguard:      path.join(dest, 'tools', 'proguard', 'lib', 'proguard.jar'),
								targets: [
									android23(dest),
									googleAPIs23(dest)
								],
								tools: tools25(dest),
								default: true
							}
						]);

						// copy the platform into our temp directory
						fs.copySync(srcPlatform, path.join(dest, 'platforms', 'android-N'));
						fs.copySync(srcSystemImages, path.join(dest, 'system-images', 'android-N'));

					} else if (count === 2) {
						// 2) should find our new target
						validateResults(results, [
							{
								path:          dest,
								buildTools:    [ buildTools23(dest) ],
								platformTools: platformTools(dest),
								proguard:      path.join(dest, 'tools', 'proguard', 'lib', 'proguard.jar'),
								targets: [
									android23(dest),
									androidN(dest),
									googleAPIs23(dest)
								],
								tools: tools25(dest),
								default: true
							}
						]);

						setTimeout(() => del([dest], { force: true }), 250);

					} else if (count === 3) {
						// 3) should detect the SDK was deleted
						expect(results).to.have.lengthOf(0);
						this.watcher.stop();
						done();
					}
				})
				.on('error', done);
		});
	});

	//	console.log(JSON.stringify(results, null, '\t').replace(/"/g, '\'').replace(new RegExp('\'' + sdkPath, 'g'), 'path.join(sdkPath, \''));
});

function validateResults(results, expected) {
	expect(results).to.be.an.Array;

	for (const result of results) {
		expect(result).to.be.an.Object;
		expect(result).to.have.property('path');
		expect(result).to.have.property('buildTools');
		expect(result).to.have.property('platformTools');
		expect(result).to.have.property('proguard');
		expect(result).to.have.property('targets');
		expect(result).to.have.property('tools');
	}

	if (expected) {
		expect(results).to.deep.equal(expected);
	}
}

function android23(sdkPath) {
	return {
		'id':       'android-23',
		'name':     'Android 6.0',
		'type':     'platform',
		'apiLevel': 23,
		'codename': null,
		'revision': 3,
		'path':     path.join(sdkPath, 'platforms/android-23'),
		'version':  '6.0',
		'abis': {
			'android-tv':   [ 'armeabi-v7a', 'x86' ],
			'android-wear': [ 'armeabi-v7a', 'x86' ],
			'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
			'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
		},
		'skins': [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
		'defaultSkin': 'WVGA800',
		'minToolsRev': 22,
		'androidJar':  path.join(sdkPath, 'platforms/android-23/android.jar'),
		'aidl':        path.join(sdkPath, 'platforms/android-23/framework.aidl')
	};
}

function androidN(sdkPath) {
	return {
		'id':       'android-N',
		'name':     'Android N (Preview)',
		'type':     'platform',
		'apiLevel': 23,
		'codename': 'N',
		'revision': 2,
		'path':     path.join(sdkPath, '/platforms/android-N'),
		'version':  'N',
		'abis': {
			'android-tv': [ 'x86' ],
			'android-wear': [ 'armeabi-v7a', 'x86' ],
			'default': [ 'x86', 'x86_64' ]
		},
		'skins': [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
		'defaultSkin': 'WVGA800',
		'minToolsRev': 22,
		'androidJar': path.join(sdkPath, '/platforms/android-N/android.jar'),
		'aidl':       path.join(sdkPath, '/platforms/android-N/framework.aidl')
	};
}

function googleAPIs23(sdkPath) {
	return {
		'id':       'Google Inc.:Google APIs:23',
		'name':     'Google APIs',
		'type':     'add-on',
		'apiLevel': 23,
		'revision': 1,
		'codename': null,
		'path':     path.join(sdkPath, 'add-ons/addon-google_apis-google-23'),
		'basedOn':  'android-23',
		'abis': {
			'android-tv':   [ 'armeabi-v7a', 'x86' ],
			'android-wear': [ 'armeabi-v7a', 'x86' ],
			'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
			'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
		},
		'skins': [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
		'defaultSkin': 'WVGA800',
		'minToolsRev': 22,
		'androidJar':  path.join(sdkPath, 'platforms/android-23/android.jar'),
		'aidl':        path.join(sdkPath, 'platforms/android-23/framework.aidl')
	};
}

function buildTools23(sdkPath) {
	return {
		'dx': path.join(sdkPath, 'build-tools/23.0.3/lib/dx.jar'),
		'executables': {
			'aapt':     path.join(sdkPath, `build-tools/23.0.3/aapt${exe}`),
			'aidl':     path.join(sdkPath, `build-tools/23.0.3/aidl${exe}`),
			'zipalign': path.join(sdkPath, `build-tools/23.0.3/zipalign${exe}`)
		},
		'path': path.join(sdkPath, 'build-tools/23.0.3'),
		'version': '23.0.3'
	};
}

function buildTools24(sdkPath) {
	return {
		'dx': path.join(sdkPath, 'build-tools/24.0.0-preview/lib/dx.jar'),
		'executables': {
			'aapt':     path.join(sdkPath, `build-tools/24.0.0-preview/aapt${exe}`),
			'aidl':     path.join(sdkPath, `build-tools/24.0.0-preview/aidl${exe}`),
			'zipalign': path.join(sdkPath, `build-tools/24.0.0-preview/zipalign${exe}`)
		},
		'path': path.join(sdkPath, 'build-tools/24.0.0-preview'),
		'version': '24.0.0 rc4'
	};
}

function platformTools(sdkPath) {
	return {
		'executables': {
			'adb': path.join(sdkPath, `platform-tools/adb${exe}`)
		},
		'path': path.join(sdkPath, 'platform-tools'),
		'version': '23.1'
	};
}

function tools24(sdkPath) {
	return {
		'executables': {
			'android':  path.join(sdkPath, 'tools', `android${bat}`),
			'emulator': path.join(sdkPath, 'tools', `emulator${exe}`),
			'mksdcard': path.join(sdkPath, 'tools', `mksdcard${exe}`)
		},
		'minPlatformToolsRev': 20,
		'path':    path.join(sdkPath, 'tools'),
		'version': '24.4.1'
	};
}

function tools25(sdkPath) {
	return {
		'executables': {
			'android':  path.join(sdkPath, 'tools', `android${bat}`),
			'emulator': path.join(sdkPath, 'tools', `emulator${exe}`),
			'mksdcard': path.join(sdkPath, 'tools', `mksdcard${exe}`)
		},
		'minPlatformToolsRev': 20,
		'path':    path.join(sdkPath, 'tools'),
		'version': '25.1.7'
	};
}
