import androidlib from '../src/index';
import appc from 'node-appc';
import path from 'path';

const exe = appc.subprocess.exe;
const bat = appc.subprocess.bat;
const sdk = androidlib.sdk;

describe('sdk', () => {
	before(function () {
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

	after(function () {
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
			}).to.throw(Error, 'Directory does not exist');
		});

		it('should error if tools source.properties is missing', () => {
			expect(() => {
				new sdk.SDK(path.resolve('./test/mocks/empty'));
			}).to.throw(Error, 'Directory does not contain a valid Android SDK; bad source.properties');
		});

		it('should error if required tool is missing', () => {
			expect(() => {
				new sdk.SDK(path.resolve(`./test/mocks/sdk/${process.platform}/vanilla-missing-android`));
			}).to.throw(Error, 'Directory does not contain a valid Android SDK; missing executable "android"');
		});

		it('should find vanilla SDK', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/vanilla`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults(results, {
				path: mockDir,
				buildTools: [],
				platformTools: { executables: {}, path: null, version: null },
				proguard: path.join(mockDir, 'tools', 'proguard', 'lib', 'proguard.jar'),
				targets: [],
				tools: {
					executables: {
						android: path.join(mockDir, 'tools', `android${bat}`),
						emulator: path.join(mockDir, 'tools', `emulator${exe}`),
						mksdcard: path.join(mockDir, 'tools', `mksdcard${exe}`)
					},
					minPlatformToolsRev: 20,
					path: path.join(mockDir, 'tools'),
					version: '24.4.1'
				}
			});
		});

		it('should find vanilla SDK without proguard', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/vanilla-no-proguard`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults(results, {
				path: mockDir,
				buildTools: [],
				platformTools: { executables: {}, path: null, version: null },
				proguard: null,
				targets: [],
				tools: {
					executables: {
						android: path.join(mockDir, 'tools', `android${bat}`),
						emulator: path.join(mockDir, 'tools', `emulator${exe}`),
						mksdcard: path.join(mockDir, 'tools', `mksdcard${exe}`)
					},
					minPlatformToolsRev: 20,
					path: path.join(mockDir, 'tools'),
					version: '24.4.1'
				}
			});
		});

		it('should find single SDK', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults(results, {
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
						version: '23.0.3'
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
					{
						id: 'android-23',
						name: 'Android 6.0',
						type: 'platform',
						apiLevel: 23,
						codename: null,
						revision: 3,
						path: path.join(mockDir, 'platforms', 'android-23'),
						version: '6.0',
						abis: {
							'android-tv':   [ 'armeabi-v7a', 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
							'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-23', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-23', 'framework.aidl')
					},
					{
						id: 'Google Inc.:Google APIs:23',
						name: 'Google APIs',
						type: 'add-on',
						apiLevel: 23,
						codename: null,
						revision: 1,
						path: path.join(mockDir, 'add-ons', 'addon-google_apis-google-23'),
						basedOn: 'android-23',
						abis: {
							'android-tv':   [ 'armeabi-v7a', 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
							'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-23', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-23', 'framework.aidl')
					}
				],
				tools: {
					executables: {
						android: path.join(mockDir, 'tools', `android${bat}`),
						emulator: path.join(mockDir, 'tools', `emulator${exe}`),
						mksdcard: path.join(mockDir, 'tools', `mksdcard${exe}`)
					},
					minPlatformToolsRev: 20,
					path: path.join(mockDir, 'tools'),
					version: '25.1.7'
				}
			});
		});

		it('should find single SDK with bad build source.properties', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk-bad-build-source-props`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults(results, {
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
				tools: {
					executables: {
						android: path.join(mockDir, 'tools', `android${bat}`),
						emulator: path.join(mockDir, 'tools', `emulator${exe}`),
						mksdcard: path.join(mockDir, 'tools', `mksdcard${exe}`)
					},
					minPlatformToolsRev: 20,
					path: path.join(mockDir, 'tools'),
					version: '25.1.7'
				}
			});
		});

		it('should find single SDK with no dx.jar', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/single-sdk-no-dx`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults(results, {
				path: mockDir,
				buildTools: [
					{
						dx: null,
						executables: {
							aapt: path.join(mockDir, 'build-tools', '23.0.3', `aapt${exe}`),
							aidl: path.join(mockDir, 'build-tools', '23.0.3', `aidl${exe}`),
							zipalign: path.join(mockDir, 'build-tools', '23.0.3', `zipalign${exe}`)
						},
						path: path.join(mockDir, 'build-tools', '23.0.3'),
						version: '23.0.3'
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
					{
						id: 'android-23',
						name: 'Android 6.0',
						type: 'platform',
						apiLevel: 23,
						codename: null,
						revision: 3,
						path: path.join(mockDir, 'platforms', 'android-23'),
						version: '6.0',
						abis: {
							'android-tv':   [ 'armeabi-v7a', 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
							'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-23', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-23', 'framework.aidl')
					},
					{
						id: 'Google Inc.:Google APIs:23',
						name: 'Google APIs',
						type: 'add-on',
						apiLevel: 23,
						codename: null,
						revision: 1,
						path: path.join(mockDir, 'add-ons', 'addon-google_apis-google-23'),
						basedOn: 'android-23',
						abis: {
							'android-tv':   [ 'armeabi-v7a', 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
							'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-23', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-23', 'framework.aidl')
					}
				],
				tools: {
					executables: {
						android: path.join(mockDir, 'tools', `android${bat}`),
						emulator: path.join(mockDir, 'tools', `emulator${exe}`),
						mksdcard: path.join(mockDir, 'tools', `mksdcard${exe}`)
					},
					minPlatformToolsRev: 20,
					path: path.join(mockDir, 'tools'),
					version: '25.1.7'
				}
			});
		});

		it('should find multiple SDKs', () => {
			const mockDir = path.resolve(`./test/mocks/sdk/${process.platform}/multiple-sdks`);
			const results = new sdk.SDK(mockDir).toJS();
			validateResults(results, {
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
						version: '23.0.3'
					},
					{
						dx: path.join(mockDir, 'build-tools', '24.0.0-preview', 'lib', 'dx.jar'),
						executables: {
							aapt: path.join(mockDir, 'build-tools', '24.0.0-preview', `aapt${exe}`),
							aidl: path.join(mockDir, 'build-tools', '24.0.0-preview', `aidl${exe}`),
							zipalign: path.join(mockDir, 'build-tools', '24.0.0-preview', `zipalign${exe}`)
						},
						path: path.join(mockDir, 'build-tools', '24.0.0-preview'),
						version: '24.0.0 rc4'
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
					{
						id: 'android-23',
						name: 'Android 6.0',
						type: 'platform',
						apiLevel: 23,
						codename: null,
						revision: 3,
						path: path.join(mockDir, 'platforms', 'android-23'),
						version: '6.0',
						abis: {
							'android-tv':   [ 'armeabi-v7a', 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
							'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-23', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-23', 'framework.aidl')
					},
					{
						id: 'android-N',
						name: 'Android N (Preview)',
						type: 'platform',
						apiLevel: 23,
						codename: 'N',
						revision: 2,
						path: path.join(mockDir, 'platforms', 'android-N'),
						version: 'N',
						abis: {
							'android-tv':   [ 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-N', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-N', 'framework.aidl')
					},
					{
						id: 'Google Inc.:Google APIs:23',
						name: 'Google APIs',
						type: 'add-on',
						apiLevel: 23,
						codename: null,
						revision: 1,
						path: path.join(mockDir, 'add-ons', 'addon-google_apis-google-23'),
						basedOn: 'android-23',
						abis: {
							'android-tv':   [ 'armeabi-v7a', 'x86' ],
							'android-wear': [ 'armeabi-v7a', 'x86' ],
							'default':      [ 'armeabi-v7a', 'x86', 'x86_64' ],
							'google_apis':  [ 'armeabi-v7a', 'x86', 'x86_64' ]
						},
						skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
						defaultSkin: 'WVGA800',
						minToolsRev: 22,
						androidJar: path.join(mockDir, 'platforms', 'android-23', 'android.jar'),
						aidl: path.join(mockDir, 'platforms', 'android-23', 'framework.aidl')
					}
				],
				tools: {
					executables: {
						android: path.join(mockDir, 'tools', `android${bat}`),
						emulator: path.join(mockDir, 'tools', `emulator${exe}`),
						mksdcard: path.join(mockDir, 'tools', `mksdcard${exe}`)
					},
					minPlatformToolsRev: 20,
					path: path.join(mockDir, 'tools'),
					version: '25.1.7'
				}
			});
		});
	});

	describe('detect()', () => {
		it('should detect SDK using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			delete process.env.NODE_APPC_SKIP_GLOBAL_SEARCH_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_ENVIRONMENT_PATHS;
			delete process.env.NODE_APPC_SKIP_GLOBAL_EXECUTABLE_PATH;

			sdk.detect()
				.then(results => {
					validateResults(results);
					done();
				})
				.catch(done);
		});

		/*
		it('should detect single SDK', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/32-bit/mock-android-ndk-r9d${win}`);
			ndk.detect({ force: true, ignorePlatformPaths: true, paths: ndkPath })
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

		it('should detect multiple SDKs', done => {
			const ndkPath = path.resolve(`./test/mocks/ndk/32-bit/mock-android-ndk-r9d${win}`);
			ndk.detect({ force: true, ignorePlatformPaths: true, paths: ndkPath })
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
		*/
	});

	// it('should detect installed SDK', done => {
	// 	const sdkPath = path.resolve(`./test/mocks/mockSDKs/mock-android-sdk${win}`);
	// 	sdk
	// 		.detect({ bypassCache: true, sdkPath, searchPaths: null })
	// 		.then(result => {
	// 			console.log(result);
	// 			done();
				/*
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('sdks', 'linux64bit');

				const sdks = result.sdks;
				expect(sdks).to.be.an.Array;

				const sdk = sdks[0];
				expect(sdk).to.have.keys('path', 'executables', 'dx', 'proguard', 'tools', 'platformTools', 'buildTools', 'targets');

				expect(sdk.path).to.be.a.String;
				expect(sdk.path).to.have.string('mock-android-sdk');

				expect(sdk.dx).to.be.a.String;
				expect(sdk.dx).to.not.equal('');

				expect(sdk.proguard).to.be.a.String;
				expect(sdk.proguard).to.not.equal('');
				//
				expect(sdk.executables).to.be.an.Object;
				for (let name of Object.keys(sdk.executables)) {
					expect(sdk.executables[name]).to.be.a.String;
					expect(sdk.executables[name]).to.not.equal('');
					expect(() => fs.statSync(sdk.executables[name])).to.not.throw(Error);
				}

				const tools = sdk.tools;
				expect(tools).to.be.an.Object;
				expect(tools).to.have.keys('path', 'version');
				expect(tools.version).to.equal('25.0.10');

				const platformTools = sdk.platformTools;
				expect(platformTools).to.be.an.Object;
				expect(platformTools).to.have.keys('path', 'version');
				expect(platformTools.version).to.equal('23.1');

				const buildTools = sdk.buildTools;
				expect(buildTools).to.be.an.Object;
				expect(buildTools).to.have.keys('path', 'version');
				expect(buildTools.version).to.equal('24');

				done();
				*/
	//		})
	// 		.catch(done);
	// });
});

function validateResults(results, expected) {
	expect(results).to.be.an.Object;
	expect(results).to.have.keys('path', 'buildTools', 'platformTools', 'proguard', 'targets', 'tools');

	if (expected) {
		expect(results).to.deep.equal(expected);
	}
}
