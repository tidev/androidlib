import path from 'path';

import * as androidlib from '../dist/index';

import { bat, exe } from 'appcd-subprocess';

describe('SDK', () => {
	it('should error if directory is invalid', () => {
		expect(() => {
			new androidlib.sdk.SDK();
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.sdk.SDK(123);
		}).to.throw(TypeError, 'Expected directory to be a valid string');

		expect(() => {
			new androidlib.sdk.SDK('');
		}).to.throw(TypeError, 'Expected directory to be a valid string');
	});

	it('should error if directory does not exist', () => {
		expect(() => {
			new androidlib.sdk.SDK(path.join(__dirname, 'doesnotexist'));
		}).to.throw(Error, 'Directory does not exist');
	});

	it('should error if "tools" directory is missing', () => {
		expect(() => {
			new androidlib.sdk.SDK(path.resolve('./test/mocks/empty'));
		}).to.throw(Error, 'Directory does not contain a "tools" directory');
	});

	it('should error if "tools/source.properties" directory is bad', () => {
		expect(() => {
			new androidlib.sdk.SDK(path.resolve('./test/mocks/sdk/all/bad-tools-source-props'));
		}).to.throw(Error, 'Directory contains bad "tools/source.properties" file');
	});

	it('should error if "tools/source.properties" directory is invalid', () => {
		expect(() => {
			new androidlib.sdk.SDK(path.resolve('./test/mocks/sdk/all/invalid-tools-source-props'));
		}).to.throw(Error, 'Directory contains invalid "tools/source.properties" (missing Pkg.Revision)');
	});

	it('should error if "tools/emulator" is missing', () => {
		expect(() => {
			new androidlib.sdk.SDK(path.resolve('./test/mocks/sdk/all/missing-emulator'));
		}).to.throw(Error, 'Directory missing "tools/emulator" executable');
	});

	it('should detect vanilla sdk', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/vanilla`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [],
			buildTools: [],
			path: dir,
			platforms: [],
			platformTools: {
				executables: {},
				path: null,
				version: null
			},
			systemImages: {},
			targets: [],
			tools: {
				executables: {
					android: path.join(dir, 'tools', `android${bat}`),
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: path.join(dir, 'tools', 'bin', `sdkmanager${bat}`)
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});

	it('should detect vanilla sdk with some missing tools', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/missing-tools`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [],
			buildTools: [],
			path: dir,
			platforms: [],
			platformTools: {
				executables: {},
				path: null,
				version: null
			},
			systemImages: {},
			targets: [],
			tools: {
				executables: {
					android: null,
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: null
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});

	it('should detect sdk with build tools', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-build-tools`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [],
			buildTools: [
				{
					dx: path.join(dir, 'build-tools', '23.0.3', 'lib', 'dx.jar'),
					executables: {
						aapt: path.join(dir, 'build-tools', '23.0.3', `aapt${exe}`),
						aapt2: path.join(dir, 'build-tools', '23.0.3', `aapt2${exe}`),
						aidl: path.join(dir, 'build-tools', '23.0.3', `aidl${exe}`),
						zipalign: path.join(dir, 'build-tools', '23.0.3', `zipalign${exe}`)
					},
					path: path.join(dir, 'build-tools', '23.0.3'),
					version: '23.0.3'
				}
			],
			path: dir,
			platforms: [],
			platformTools: {
				executables: {},
				path: null,
				version: null
			},
			systemImages: {},
			targets: [],
			tools: {
				executables: {
					android: path.join(dir, 'tools', `android${bat}`),
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: path.join(dir, 'tools', 'bin', `sdkmanager${bat}`)
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});

	it('should detect sdk with platform tools', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platform-tools`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [],
			buildTools: [],
			path: dir,
			platforms: [],
			platformTools: {
				executables: {
					adb: path.join(dir, 'platform-tools', `adb${exe}`)
				},
				path: path.join(dir, 'platform-tools'),
				version: '23.1'
			},
			systemImages: {},
			targets: [],
			tools: {
				executables: {
					android: path.join(dir, 'tools', `android${bat}`),
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: path.join(dir, 'tools', 'bin', `sdkmanager${bat}`)
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});

	it('should detect sdk with system images', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-system-images`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [],
			buildTools: [],
			path: dir,
			platforms: [],
			platformTools: {
				executables: {},
				path: null,
				version: null
			},
			systemImages: {
				'android-23': {
					'android-tv': [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						}
					],
					'android-wear': [
						{
							abi: 'armeabi-v7a',
							skins: [
								'AndroidWearRound',
								'AndroidWearRound360x360',
								'AndroidWearRound400x400',
								'AndroidWearRound480x480',
								'AndroidWearRoundChin320x290',
								'AndroidWearRoundChin360x325',
								'AndroidWearRoundChin360x326',
								'AndroidWearRoundChin360x330',
								'AndroidWearSquare',
								'AndroidWearSquare320x320'
							]
						},
						{
							abi: 'x86',
							skins: [
								'AndroidWearRound',
								'AndroidWearRound360x360',
								'AndroidWearRound400x400',
								'AndroidWearRound480x480',
								'AndroidWearRoundChin320x290',
								'AndroidWearRoundChin360x325',
								'AndroidWearRoundChin360x326',
								'AndroidWearRoundChin360x330',
								'AndroidWearSquare',
								'AndroidWearSquare320x320'
							]
						}
					],
					default: [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						},
						{
							abi: 'x86_64',
							skins: []
						},
					],
					google_apis: [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						},
						{
							abi: 'x86_64',
							skins: []
						}
					]
				}
			},
			targets: [],
			tools: {
				executables: {
					android: path.join(dir, 'tools', `android${bat}`),
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: path.join(dir, 'tools', 'bin', `sdkmanager${bat}`)
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});

	it('should detect sdk with system images and platforms', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-platforms`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [],
			buildTools: [],
			path: dir,
			platforms: [
				{
					id:          'android-23',
					name:        'Android 6.0',
					apiLevel:    23,
					codename:    null,
					revision:    3,
					path:        path.join(dir, 'platforms', 'android-23'),
					version:     '6.0',
					abis: {
						'android-tv': [ 'armeabi-v7a', 'x86' ],
						'android-wear': [ 'armeabi-v7a', 'x86' ],
						default: [ 'armeabi-v7a', 'x86', 'x86_64' ],
						google_apis: [ 'armeabi-v7a', 'x86', 'x86_64' ]
					},
					skins: [
						'HVGA',
						'QVGA',
						'WQVGA400',
						'WQVGA432',
						'WSVGA',
						'WVGA800',
						'WVGA854',
						'WXGA720',
						'WXGA800',
						'WXGA800-7in',
						'AndroidWearRound',
						'AndroidWearRound360x360',
						'AndroidWearRound400x400',
						'AndroidWearRound480x480',
						'AndroidWearRoundChin320x290',
						'AndroidWearRoundChin360x325',
						'AndroidWearRoundChin360x326',
						'AndroidWearRoundChin360x330',
						'AndroidWearSquare',
						'AndroidWearSquare320x320'
					],
					defaultSkin: 'WVGA800',
					minToolsRev: 22,
					androidJar:  path.join(dir, 'platforms', 'android-23', 'android.jar'),
					aidl:        path.join(dir, 'platforms', 'android-23', 'framework.aidl')
				},
				{
					id:          'android-N',
					name:        'Android N (Preview)',
					apiLevel:    23,
					codename:    'N',
					revision:    2,
					path:        path.join(dir, 'platforms', 'android-N'),
					version:     'N',
					abis:        {},
					skins:       [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in' ],
					defaultSkin: 'WVGA800',
					minToolsRev: 22,
					androidJar:  path.join(dir, 'platforms', 'android-N', 'android.jar'),
					aidl:        path.join(dir, 'platforms', 'android-N', 'framework.aidl')
				}
			],
			platformTools: {
				executables: {},
				path: null,
				version: null
			},
			systemImages: {
				'android-23': {
					'android-tv': [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						}
					],
					'android-wear': [
						{
							abi: 'armeabi-v7a',
							skins: [
								'AndroidWearRound',
								'AndroidWearRound360x360',
								'AndroidWearRound400x400',
								'AndroidWearRound480x480',
								'AndroidWearRoundChin320x290',
								'AndroidWearRoundChin360x325',
								'AndroidWearRoundChin360x326',
								'AndroidWearRoundChin360x330',
								'AndroidWearSquare',
								'AndroidWearSquare320x320'
							]
						},
						{
							abi: 'x86',
							skins: [
								'AndroidWearRound',
								'AndroidWearRound360x360',
								'AndroidWearRound400x400',
								'AndroidWearRound480x480',
								'AndroidWearRoundChin320x290',
								'AndroidWearRoundChin360x325',
								'AndroidWearRoundChin360x326',
								'AndroidWearRoundChin360x330',
								'AndroidWearSquare',
								'AndroidWearSquare320x320'
							]
						}
					],
					default: [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						},
						{
							abi: 'x86_64',
							skins: []
						},
					],
					google_apis: [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						},
						{
							abi: 'x86_64',
							skins: []
						}
					]
				}
			},
			targets: [],
			tools: {
				executables: {
					android: path.join(dir, 'tools', `android${bat}`),
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: path.join(dir, 'tools', 'bin', `sdkmanager${bat}`)
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});

	it('should detect sdk with system images, platforms, and addons', () => {
		const dir = path.resolve(`./test/mocks/sdk/${process.platform}/with-addons`);
		const results = new androidlib.sdk.SDK(dir);

		expect(results).to.deep.equal({
			addons: [
				{
					id:       'Google Inc.:Google APIs:23',
					name:     'Google APIs',
					apiLevel: 23,
					revision: 1,
					codename: null,
					path:     path.join(dir, 'add-ons', 'addon-google_apis-google-23'),
					basedOn:  'android-23',
					abis: {
						'android-tv':   [ 'armeabi-v7a', 'x86' ],
						'android-wear': [ 'armeabi-v7a', 'x86' ],
						default:        [ 'armeabi-v7a', 'x86', 'x86_64' ],
						google_apis:    [ 'armeabi-v7a', 'x86', 'x86_64' ]
					},
					skins: [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in', 'AndroidWearRound', 'AndroidWearRound360x360', 'AndroidWearRound400x400', 'AndroidWearRound480x480', 'AndroidWearRoundChin320x290', 'AndroidWearRoundChin360x325', 'AndroidWearRoundChin360x326', 'AndroidWearRoundChin360x330', 'AndroidWearSquare', 'AndroidWearSquare320x320' ],
					defaultSkin: 'WVGA800',
					minToolsRev: 22,
					androidJar:  path.join(dir, 'platforms', 'android-23', 'android.jar'),
					aidl:        path.join(dir, 'platforms', 'android-23', 'framework.aidl')
				}
			],
			buildTools: [],
			path: dir,
			platforms: [
				{
					id:          'android-23',
					name:        'Android 6.0',
					apiLevel:    23,
					codename:    null,
					revision:    3,
					path:        path.join(dir, 'platforms', 'android-23'),
					version:     '6.0',
					abis: {
						'android-tv':   [ 'armeabi-v7a', 'x86' ],
						'android-wear': [ 'armeabi-v7a', 'x86' ],
						default:        [ 'armeabi-v7a', 'x86', 'x86_64' ],
						google_apis:    [ 'armeabi-v7a', 'x86', 'x86_64' ]
					},
					skins: [
						'HVGA',
						'QVGA',
						'WQVGA400',
						'WQVGA432',
						'WSVGA',
						'WVGA800',
						'WVGA854',
						'WXGA720',
						'WXGA800',
						'WXGA800-7in',
						'AndroidWearRound',
						'AndroidWearRound360x360',
						'AndroidWearRound400x400',
						'AndroidWearRound480x480',
						'AndroidWearRoundChin320x290',
						'AndroidWearRoundChin360x325',
						'AndroidWearRoundChin360x326',
						'AndroidWearRoundChin360x330',
						'AndroidWearSquare',
						'AndroidWearSquare320x320'
					],
					defaultSkin: 'WVGA800',
					minToolsRev: 22,
					androidJar:  path.join(dir, 'platforms', 'android-23', 'android.jar'),
					aidl:        path.join(dir, 'platforms', 'android-23', 'framework.aidl')
				},
				{
					id:          'android-N',
					name:        'Android N (Preview)',
					apiLevel:    23,
					codename:    'N',
					revision:    2,
					path:        path.join(dir, 'platforms', 'android-N'),
					version:     'N',
					abis:        {},
					skins:       [ 'HVGA', 'QVGA', 'WQVGA400', 'WQVGA432', 'WSVGA', 'WVGA800', 'WVGA854', 'WXGA720', 'WXGA800', 'WXGA800-7in' ],
					defaultSkin: 'WVGA800',
					minToolsRev: 22,
					androidJar:  path.join(dir, 'platforms', 'android-N', 'android.jar'),
					aidl:        path.join(dir, 'platforms', 'android-N', 'framework.aidl')
				}
			],
			platformTools: {
				executables: {},
				path: null,
				version: null
			},
			systemImages: {
				'android-23': {
					'android-tv': [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						}
					],
					'android-wear': [
						{
							abi: 'armeabi-v7a',
							skins: [
								'AndroidWearRound',
								'AndroidWearRound360x360',
								'AndroidWearRound400x400',
								'AndroidWearRound480x480',
								'AndroidWearRoundChin320x290',
								'AndroidWearRoundChin360x325',
								'AndroidWearRoundChin360x326',
								'AndroidWearRoundChin360x330',
								'AndroidWearSquare',
								'AndroidWearSquare320x320'
							]
						},
						{
							abi: 'x86',
							skins: [
								'AndroidWearRound',
								'AndroidWearRound360x360',
								'AndroidWearRound400x400',
								'AndroidWearRound480x480',
								'AndroidWearRoundChin320x290',
								'AndroidWearRoundChin360x325',
								'AndroidWearRoundChin360x326',
								'AndroidWearRoundChin360x330',
								'AndroidWearSquare',
								'AndroidWearSquare320x320'
							]
						}
					],
					default: [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						},
						{
							abi: 'x86_64',
							skins: []
						},
					],
					google_apis: [
						{
							abi: 'armeabi-v7a',
							skins: []
						},
						{
							abi: 'x86',
							skins: []
						},
						{
							abi: 'x86_64',
							skins: []
						}
					]
				}
			},
			targets: [],
			tools: {
				executables: {
					android: path.join(dir, 'tools', `android${bat}`),
					emulator: path.join(dir, 'tools', `emulator${exe}`),
					sdkmanager: path.join(dir, 'tools', 'bin', `sdkmanager${bat}`)
				},
				path: path.join(dir, 'tools'),
				version: '24.4.1'
			}
		});
	});
});
