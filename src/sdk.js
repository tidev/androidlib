import fs from 'fs';
import options from './options';
import path from 'path';

import { arrayify, cache, get } from 'appcd-util';
import { bat, exe } from 'appcd-subprocess';
import { expandPath } from 'appcd-path';
import { isDir, isFile } from 'appcd-fs';
import { readPropertiesFile } from './util';

/**
 * Directories to scan for Android SDKs.
 * @type {Object}
 */
export const sdkLocations = {
	darwin: [
		'~/Library/Android/sdk',
		'~',
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local',
	],
	linux: [
		'~/Android/sdk',
		'~',
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local'
	],
	win32: [
		'%LOCALAPPDATA%\\Android\\Sdk',
		'~',
		'%SystemDrive%',
		'%ProgramFiles%',
		'%ProgramFiles(x86)%',
		'%CommonProgramFiles%'
	]
};

/**
 * Detects and organizes Android SDK information.
 */
export class SDK {
	/**
	 * Checks if the specified directory is an Android SDK.
	 *
	 * @param {String} dir - The directory to check for an Android SDK.
	 * @access public
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = expandPath(dir);
		if (!isDir(dir)) {
			throw new Error('Directory does not exist');
		}

		let toolsDir = path.join(dir, 'tools');
		if (!isDir(toolsDir)) {
			// are we in a subdirectory already in the SDK?
			throw new Error('Directory does not contain a "tools" directory');
		}

		const toolsProps = readPropertiesFile(path.join(toolsDir, 'source.properties'));
		if (!toolsProps) {
			throw new Error('Directory contains bad "tools/source.properties" file');
		}
		const version = toolsProps['Pkg.Revision'];
		if (!version) {
			throw new Error('Directory contains invalid "tools/source.properties" (missing Pkg.Revision)');
		}

		const executables = this.findExecutables(toolsDir, {
			android:    `android${bat}`,
			emulator:   `emulator${exe}`,
			sdkmanager: `bin/sdkmanager${bat}`
		});

		if (!isFile(executables.emulator)) {
			throw new Error('Directory missing "tools/emulator" executable');
		}

		this.addons = [];
		this.buildTools = [];
		this.path = dir;
		this.platforms = [];
		this.platformTools = {
			executables: {},
			path: null,
			version: null
		};
		this.systemImages = {};
		this.targets = [];
		this.tools = {
			executables,
			path: toolsDir,
			version
		};

		/**
		 * Detect build tools
		 */
		const buildToolsDir = path.join(dir, 'build-tools');
		if (isDir(buildToolsDir)) {
			for (const name of fs.readdirSync(buildToolsDir)) {
				const dir = path.join(buildToolsDir, name);
				if (isDir(dir)) {
					const dxFile = path.join(dir, 'lib', 'dx.jar');
					const buildToolsProps = readPropertiesFile(path.join(dir, 'source.properties'));
					if (buildToolsProps) {
						this.buildTools.push({
							dx:          isFile(dxFile) ? dxFile : null,
							executables: this.findExecutables(dir, {
								aapt:     `aapt${exe}`,
								aapt2:    `aapt2${exe}`,
								aidl:     `aidl${exe}`,
								zipalign: `zipalign${exe}`
							}),
							path:        dir,
							version:     buildToolsProps && buildToolsProps['Pkg.Revision'] || null
						});
					}
				}
			}
		}

		/**
		 * Detect platform tools
		 */
		const platformToolsDir = path.join(dir, 'platform-tools');
		if (isDir(platformToolsDir)) {
			const platformToolsProps = readPropertiesFile(path.join(platformToolsDir, 'source.properties'));
			if (platformToolsProps) {
				this.platformTools = {
					executables: this.findExecutables(platformToolsDir, {
						adb: `adb${exe}`
					}),
					path:        platformToolsDir,
					version:     platformToolsProps && platformToolsProps['Pkg.Revision'] || null
				};
			}
		}

		/**
		 * Detect system images
		 */
		const systemImagesDir = path.join(dir, 'system-images');
		if (isDir(systemImagesDir)) {
			for (const platform of fs.readdirSync(systemImagesDir)) {
				const platformDir = path.join(systemImagesDir, platform);
				if (isDir(platformDir)) {
					for (const tag of fs.readdirSync(platformDir)) {
						const tagDir = path.join(platformDir, tag);
						if (isDir(tagDir)) {
							for (const abi of fs.readdirSync(tagDir)) {
								const abiDir = path.join(tagDir, abi);
								const props = readPropertiesFile(path.join(abiDir, 'source.properties'));
								if (props && props['AndroidVersion.ApiLevel'] && props['SystemImage.TagId'] && props['SystemImage.Abi']) {
									const imageDir = path.relative(systemImagesDir, abiDir).replace(/\\/g, '/');
									const skinsDir = path.join(abiDir, 'skins');

									this.systemImages[imageDir] = {
										abi: props['SystemImage.Abi'],
										sdk: `android-${props['AndroidVersion.CodeName'] || props['AndroidVersion.ApiLevel']}`,
										skins: isDir(skinsDir) ? fs.readdirSync(skinsDir).map(name => {
											return isFile(path.join(skinsDir, name, 'hardware.ini')) ? name : null;
										}).filter(x => x) : [],
										type: props['SystemImage.TagId']
									};
								}
							}
						}
					}
				}
			}
		}

		/**
		 * Detect platforms
		 */
		const platformsDir = path.join(dir, 'platforms');
		if (isDir(platformsDir)) {
			for (const name of fs.readdirSync(platformsDir)) {
				const dir = path.join(platformsDir, name);
				const sourceProps = readPropertiesFile(path.join(dir, 'source.properties'));
				const apiLevel = sourceProps ? ~~sourceProps['AndroidVersion.ApiLevel'] : null;
				if (!sourceProps || !apiLevel || !isFile(path.join(dir, 'build.prop'))) {
					continue;
				}

				// read in the sdk properties, if exists
				const sdkProps = readPropertiesFile(path.join(dir, 'sdk.properties'));

				// detect the available skins
				const skinsDir = path.join(dir, 'skins');
				const skins = isDir(skinsDir) ? fs.readdirSync(skinsDir).map(name => {
					return isFile(path.join(skinsDir, name, 'hardware.ini')) ? name : null;
				}).filter(x => x) : [];
				let defaultSkin = sdkProps && sdkProps['sdk.skin.default'];
				if (skins.indexOf(defaultSkin) === -1 && skins.indexOf(defaultSkin = 'WVGA800') === -1) {
					defaultSkin = skins[skins.length - 1] || null;
				}

				const apiName = sourceProps['AndroidVersion.CodeName'] || apiLevel;
				const sdk = `android-${apiName}`;
				let tmp;

				const abis = {};
				for (const image of Object.values(this.systemImages)) {
					if (image.sdk === sdk) {
						if (!abis[image.type]) {
							abis[image.type] = [];
						}
						if (!abis[image.type].includes(image.abi)) {
							abis[image.type].push(image.abi);
						}

						for (const skin of image.skins) {
							if (!skins.includes(skin)) {
								skins.push(skin);
							}
						}
					}
				}

				this.platforms.push({
					sdk,
					name:        `Android ${sourceProps['Platform.Version']}${sourceProps['AndroidVersion.CodeName'] ? ' (Preview)' : ''}`,
					apiLevel:    apiLevel,
					codename:    sourceProps['AndroidVersion.CodeName'] || null,
					revision:    +sourceProps['Layoutlib.Revision'] || null,
					path:        dir,
					version:     sourceProps['Platform.Version'],
					abis:        abis,
					skins:       skins,
					defaultSkin: defaultSkin,
					minToolsRev: +sourceProps['Platform.MinToolsRev'] || null,
					androidJar:  isFile(tmp = path.join(dir, 'android.jar')) ? tmp : null,
					aidl:        isFile(tmp = path.join(dir, 'framework.aidl')) ? tmp : null
				});
			}
		}

		/**
		 * Detect addons
		 */
		const addonsDir = path.join(dir, 'add-ons');
		if (isDir(addonsDir)) {
			for (const name of fs.readdirSync(addonsDir)) {
				const dir = path.join(addonsDir, name);
				const sourceProps = readPropertiesFile(path.join(dir, 'source.properties'));
				const apiLevel = sourceProps ? ~~sourceProps['AndroidVersion.ApiLevel'] : null;
				if (!sourceProps || !apiLevel || !sourceProps['Addon.VendorDisplay'] || !sourceProps['Addon.NameDisplay']) {
					continue;
				}

				let basedOn = null;
				for (const platform of this.platforms) {
					if (platform.codename === null && platform.apiLevel === apiLevel) {
						basedOn = platform;
						break;
					}
				}

				this.addons.push({
					sdk:         `${sourceProps['Addon.VendorDisplay']}:${sourceProps['Addon.NameDisplay']}:${apiLevel}`,
					name:        sourceProps['Addon.NameDisplay'],
					apiLevel:    apiLevel,
					revision:    +sourceProps['Pkg.Revision'] || null,
					codename:    sourceProps['AndroidVersion.CodeName'] || null,
					path:        dir,
					basedOn:     basedOn ? { version: basedOn.version, apiLevel: basedOn.apiLevel } : null,
					abis:        basedOn && basedOn.abis || null,
					skins:       basedOn && basedOn.skins || null,
					defaultSkin: basedOn && basedOn.defaultSkin || null,
					minToolsRev: basedOn && basedOn.minToolsRev || null,
					androidJar:  basedOn && basedOn.androidJar || null,
					aidl:        basedOn && basedOn.aidl || null,
					vendor: 	 sourceProps['Addon.VendorDisplay'] || null,
					description: sourceProps['Pkg.Desc']  || null,
					version:	 basedOn && basedOn.version || null
				});
			}
		}

		function sortFn(a, b) {
			if (a.codename === null) {
				if (b.codename !== null && a.apiLevel === b.apiLevel) {
					// sort GA releases before preview releases
					return -1;
				}
			} else if (a.apiLevel === b.apiLevel) {
				return b.codename === null ? 1 : a.codename.localeCompare(b.codename);
			}

			return a.apiLevel - b.apiLevel;
		}

		this.platforms.sort(sortFn);
		this.addons.sort(sortFn);
	}

	/**
	 * Scans a directory for executables.
	 *
	 * @param {String} dir - The directory to look for executables in.
	 * @param {Object} exes - A map of
	 * @returns {Object}
	 * @access private
	 */
	findExecutables(dir, exes) {
		const executables = {};
		for (const name of Object.keys(exes)) {
			const file = path.join(dir, exes[name]);
			executables[name] = isFile(file) ? file : null;
		}
		return executables;
	}
}

export default SDK;

/**
 * Detects installed Android SDKs, then caches and returns the results.
 *
 * @param {Boolean} [force=false] - When `true`, bypasses cache and forces redetection.
 * @returns {Promise<Array.<SDK>>}
 */
export function getSDKs(force) {
	return cache('androidlib:sdk', force, () => {
		const results = [];
		const searchPaths = arrayify(get(options, 'sdk.searchPaths') || sdkLocations[process.platform], true);

		for (let dir of searchPaths) {
			try {
				results.push(new SDK(dir));
			} catch (e) {
				// not an SDK, check subdirectories
				if (isDir(dir = expandPath(dir))) {
					for (const name of fs.readdirSync(dir)) {
						try {
							results.push(new SDK(path.join(dir, name)));
						} catch (e2) {
							// not an SDK
						}
					}
				}
			}
		}

		return results;
	});
}
