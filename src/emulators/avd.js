import 'babel-polyfill';
import 'source-map-support/register';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as net from 'net';
import appc from 'node-appc';

import * as util from '../util';
import * as sdk from '../sdk';
import { Emulator, EmulatorManager } from '../emulator';

// All emulators have their console ports opened on even ports between ports 5554 and 5584
const DEFAULTPORT = 5554;
const PORTLIMIT = 5584;
const emuRegExp = /^emulator\-(\d+)$/;
let cache = null;

/**
 * Detects all existing Android Virtual Devices.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.bypassCache=false] - When true, forces scan for all Paths.
 * @returns {Promise}
 */
export function detect(opts = {}) {
	// get the list of emulators through  `android list`
	//TODO normalized `android` command for Windows

	if (cache && !opts.bypassCache) {
		return Promise.resolve(cache);
	}

	const results = cache = {
		sdk : {},
		targets: {},
		avds: []
	};

	let sdkInfo;

	return sdk
		.detect()
		.then(result => {
			sdkInfo = result.sdk;
			results.sdk = result.sdk;
			return util.run(sdkInfo.executables.android, ['list']);
		})
		.then(({ code, stdout, stderr }) => {
			if (code) {
				return null;
			}

			let addons = {};
			const addonsDir = path.join(sdkInfo.path, 'add-ons');
			const sdkPlatformDir = path.join(sdkInfo.path, 'platforms');
			const manifestNameRegex = /^(?:name|Addon\.Name(?:Display)?)=(.*)$/m;
			const manifestVendorRegex = /^(?:vendor|Addon\.Vendor(?:Display)?)=(.*)$/m;
			const manifestApiRegex = /^(?:api|AndroidVersion\.ApiLevel)=(.*)$/m;
			const manifestRevisionRegex = /^(?:revision|Pkg.Revision)=(.*)$/m;

			fs.existsSync(addonsDir) && fs.readdirSync(addonsDir).forEach(subDir => {
				const dir = path.join(addonsDir, subDir);
				if (fs.statSync(dir).isDirectory()) {
					let file = path.join(dir, 'manifest.ini');

					if (!fs.existsSync(file)) {
						file = path.join(dir, 'source.properties');
					}

					if (fs.existsSync(file)) {
						const manifest = fs.readFileSync(file).toString();
						const name = manifest.match(manifestNameRegex);
						const vendor = manifest.match(manifestVendorRegex);
						const api = manifest.match(manifestApiRegex);
						const revision = manifest.match(manifestRevisionRegex);
						name && vendor && api && revision && (addons[name[1] + '|' + vendor[1] + '|' + api[1] + '|' + revision[1]] = dir);
					}
				}
			});

			let sections = {};
			let lastSection;
			const sectionRegExp = /^\w.*\:$/;

			stdout.split('\n').forEach(line => {
				if (sectionRegExp.test(line)) {
					sections[line] || (sections[line] = []);
					lastSection = line;
				} else if (lastSection && line) {
					sections[lastSection].push(line);
				}
			});

			Object.keys(sections).forEach(name => {
				sections[name] = sections[name].join('\n').split(/\-\-\-\-\-\-+\n/);
			});

			// process the targets
			const targets = sections['Available Android targets:'];
			const avds = sections['Available Android Virtual Devices:'];
			const issues = sections['The following Android Virtual Devices could not be loaded:'];
			const deviceDefs = sections['Available devices definitions:'];
			const idRegex = /^id: ([^\s]+) or "(.+)"$/;
			const libEntryRegex = /^\*\s+?(.+) \((.*)\)$/;
			const basedOnRegex = /^Based on Android ([^\s]+) \(API level ([^)]+)\)$/;
			const keyValRegex = /^\s*(.+)\: (.+)$/;
			let apiLevelMap = {};
			let sdkMap = {};
			let finalTargets = {};
			let finalAvds = [];
			let ver2api = {};

			//TODO refactor this
			targets && targets.forEach(target => {
				target.split('\n\w').forEach(chunk => {
					chunk = chunk.trim();
					if (!chunk) return;
					let lines = chunk.split('\n');
					let m = lines.shift().match(idRegex);
					let info = m && (finalTargets[m[1]] = { id: m[2], abis: [], skins: [] });
					let line;
					let p;
					let key;
					let value;
					if (!m) return; // shouldn't happen

					for (let i = 0, len = lines.length; i < len; i++) {
						line = lines[i].trim();
						if (line == 'Libraries:') {
							info.libraries || (info.libraries = {});
							for (++i; i < len; i++) {
								if (m = lines[i].trim().match(libEntryRegex)) {
									if (++i < len) {
										info.libraries[m[1]] = {
											jar: m[2],
											description: lines[i].trim()
										};
									} else {
										i--;
									}
								} else {
									i--;
									break;
								}
							}
						} else if (m = line.match(basedOnRegex)) {
							info['based-on'] = {
								'android-version': m[1],
								'api-level': ~~m[2]
							};
						} else {
							// simple key-value
							p = line.indexOf(':');
							if (p != -1) {
								key = line.substring(0, p).toLowerCase().trim().replace(/\s/g, '-');
								value = line.substring(p+1).trim();
								switch (key) {
									case 'abis':
									case 'skins':
										value.split(',').forEach(function (v) {
											v = v.replace('(default)', '').trim();
											if (info[key].indexOf(v) == -1) {
												info[key].push(v);
											}
										});
										break;
									case 'tag/abis':
										// note: introduced in android sdk tools 22.6
										value.split(',').forEach(function (v) {
											var p = v.indexOf('/');
											v = (p == -1 ? v : v.substring(p + 1)).trim();
											if (info.abis.indexOf(v) == -1) {
												info.abis.push(v);
											}
										});
										break;
									case 'type':
										info[key] = value.toLowerCase();
										break;
									default:
										var num = Number(value);
										if (value.indexOf('.') === -1 && !isNaN(num) && typeof num === 'number') {
											info[key] = Number(value);
										} else {
											info[key] = value;
										}
								}
							}
						}
					}

					if (info.type === 'platform') {
						let srcPropsFile = path.join(sdkPlatformDir, info.id, 'source.properties'),
							srcProps = fs.existsSync(srcPropsFile) ? fs.readFileSync(srcPropsFile).toString() : '';

						info.path = path.join(sdkPlatformDir, info.id);
						info.sdk = (function (m) { return m ? ~~m[1] : null; })(srcProps.match(/^AndroidVersion.ApiLevel=(.*)$/m));
						info.version = (function (m) { if (m) return m[1]; m = info.name.match(/Android (((\d\.)?\d\.)?\d)/); return m ? m[1] : null; })(srcProps.match(/^Platform.Version=(.*)$/m));
						info.androidJar = path.join(info.path, 'android.jar');
						//TODO
						// info.supported = !~~info['api-level'] || appc.version.satisfies(info['api-level'], androidPackageJson.vendorDependencies['android sdk'], true);
						info.aidl = path.join(info.path, 'framework.aidl');
						fs.existsSync(info.aidl) || (info.aidl = null);

						apiLevelMap[info['api-level'] || info.id.replace('android-', '')] = info;
						sdkMap[info.version] = info;
						ver2api[info.version] = info.sdk;
					} else if (info.type === 'add-on' && info['based-on']) {
						info.path = addons[info.name + '|' + info.vendor + '|' + info['based-on']['api-level'] + '|' + info.revision] || null;
						info.version = info['based-on']['android-version'];
						info.androidJar = null;
						//TODO
						// info.supported = !~~info['based-on']['api-level'] || appc.version.satisfies(info['based-on']['api-level'], androidPackageJson.vendorDependencies['android sdk'], true);
					}
				});
			});

			// all targets are processed, now try to fill in aidl & androidJar paths for  add-ons
			Object.keys(finalTargets).forEach(id => {
				let basedOn = finalTargets[id]['based-on'];
				if (finalTargets[id].type === 'add-on' && basedOn && apiLevelMap[basedOn['api-level']]) {
					finalTargets[id].androidJar = apiLevelMap[basedOn['api-level']].androidJar;
					finalTargets[id].aidl = apiLevelMap[basedOn['api-level']].aidl;
				}
			});

			// parse the avds
			avds && avds.forEach(avd => {
				if (avd = avd.trim()) {
					let lines = avd.split('\n');
					let info = {
						type: 'avd'
					};
					let m;
					let key;

					for (let i = 0, len = lines.length; i < len; i++) {
						let line = lines[i].trim();
						if (m = line.match(keyValRegex)) {
							key = m[1].toLowerCase().trim().replace(/\s/g, '-');
							if (key === 'tag/abi') {
								info['abi'] = m[2].replace(/^\w+\//, '');
							} else {
								info[key] = m[2];
							}
						} else if (m = line.match(basedOnRegex)) {
							info['based-on'] = {
								'android-version': m[1],
								'api-level': ~~m[2]
							};
						}
					}

					if (info.path && info.sdcard && !fs.existsSync(info.sdcard)) {
						let sdcardFile = path.join(info.path, 'sdcard.img');
						info.sdcard = fs.existsSync(sdcardFile) ? sdcardFile : null;
					}

					info.googleApis = /google/i.test(info.target);

					if (info['based-on'] && info['based-on']['android-version']) {
						info['sdk-version'] = info['based-on']['android-version'];
					} else if (info.target) {
						if (m = info.target.match(/^Android ([^\s]+)/)) {
							info['sdk-version'] = m[1];
							info['api-level'] = ver2api[m[1]] || null;
						}
					}
					finalAvds.push(info);
				}
			});

			results.targets = finalTargets;
			results.avds = finalAvds;
			return results;
		})
		.catch(err => {
			console.log('- emulator detect err: ', err);
		});
}

/**
 * Detects if a specific Android Virtual Device is running and if so, returns
 * the emulator AVD definition object and the device definition object.
 * @param {Object} config - The CLI config object
 * @param {Object} emu - The Android emulator avd definition
 * @param {Array<Object>} devices - An array of device definition objects
 * @returns {Promise}
 */
export function isRunning(config, emu, devices) {
	devices = devices.filter(d => { return emuRegExp.test(d.id) && d.state === 'device'; });
	if (!devices.length || emu.type !== 'avd') return Promise.resolve(false);

	// let result;
	// devices.some(device => {
	// 	let m = device.id.match(emuRegExp);
	// 	if (m && device.emulator.name === emu.name) {
	// 		result = device;
	// 		return true;
	// 	}
	// });
	const result = devices.filter(device => {
		let m = device.id.match(emuRegExp);
		return m && device.emulator.name === emu.name;
	});

	return Promise.resolve(result.shift());
}

/**
 * Detects if a specific device name is an Android emulator.
 * @param {Object} config - The CLI config object
 * @param {Object} device - The device names
 * @returns {Promise}
 */
export function isEmulator(config, device) {
	let port = device.match(emuRegExp);
	if (!port) {
		return Promise.resolve(false);
	}

	return Promise.all([
		getAvdName(port[1]),
		this.detect(config)
	])
	.then(([avdName, avdInfo]) => {
		let avds = avdInfo && avdInfo.avds;
		return avds.filter(a => { return a.name === avdName; }).shift();
	});
}

/**
 * Launches the specified Android emulator.
 * @param {Object} config - The CLI config object
 * @param {Object|String} emu - The Android emulator avd definition or the name of the emulator
 * @param {Object} [opts] - Emulator start options
 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Android environment detection cache and re-queries the system
 * @param {Number} [opts.port=5560] - The TCP port the emulator will use for the console
 * @param {String} [opts.sdcard] - A path to the virtual SD card to use with the emulator
 * @param {Number} [opts.partitionSize=128] - The emulator's system/data partition size in MBs
 * @param {Array|String} [opts.stdio] - The stdio configuration to pass into spawn()
 * @param {Boolean} [opts.detached] - The detached flag to pass into spawn()
 * @returns {Promise}
 */
export function start(config = {}, opts = {}, emu) {
	let port = opts.port || DEFAULTPORT;
	let emulatorExe;

	return this
		.detect()
		.then(result => {
			emulatorExe = result.sdk.executables.emulator;

			//TODO check if the emulator is valid
			function doUntil(p){
				return util.findport(p)
					.then(result => {
						if (result || p >= PORTLIMIT) {
							return result;
						} else {
							p = p + 2;
							return doUntil(p);
						}
					});
			}

			return doUntil(port)
				.then(result => {
					console.log('result: ', result);
					return result;
				});
		})
		.then(port => {
			console.log('using port : ', port);

			// default args
			let args = [
				'-avd', emu.name,                                // use a specific android virtual device
				'-port', port,                                   // TCP port that will be used for the console
				'-no-boot-anim',                                 // disable animation for faster boot
				'-partition-size', opts.partitionSize || 128     // system/data partition size in MBs
			];

			let sdcard = opts.sdcard || emu.sdcard;
			sdcard && args.push('-sdcard', sdcard);              // SD card image (default <system>/sdcard.img

			// add any other args
			opts.logcat               && args.push('-logcat', opts.logcat);                // enable logcat output with given tags
			opts.sysdir               && args.push('-sysdir', opts.sysdir);                // search for system disk images in <dir>
			opts.system               && args.push('-system', opts.system);                // read initial system image from <file>
			opts.datadir              && args.push('-datadir', opts.datadir);              // write user data into <dir>
			opts.kernel               && args.push('-kernel', opts.kernel);                // use specific emulated kernel
			opts.ramdisk              && args.push('-ramdisk', opts.ramdisk);              // ramdisk image (default <system>/ramdisk.img
			opts.initdata             && args.push('-init-data', opts.initdata);           // same as '-init-data <file>'
			opts.data                 && args.push('-data', opts.data);                    // data image (default <datadir>/userdata-qemu.img
			opts.cache                && args.push('-cache', opts.cache);                  // cache partition image (default is temporary file)
			opts.cacheSize            && args.push('-cache-size', opts.cacheSize);         // cache partition size in MBs
			opts.noCache              && args.push('-no-cache');                           // disable the cache partition
			opts.snapStorage          && args.push('-snapstorage', opts.snapStorage);      // file that contains all state snapshots (default <datadir>/snapshots.img)
			opts.noSnapStorage        && args.push('-no-snapstorage');                     // do not mount a snapshot storage file (this disables all snapshot functionality)
			opts.snapshot             && args.push('-snapshot', opts.snapshot);            // name of snapshot within storage file for auto-start and auto-save (default 'default-boot')
			opts.noSnapshot           && args.push('-no-snapshot');                        // perform a full boot and do not do not auto-save, but qemu vmload and vmsave operate on snapstorage
			opts.noSnapshotSave       && args.push('-no-snapshot-save');                   // do not auto-save to snapshot on exit: abandon changed state
			opts.noSnapshotLoad       && args.push('-no-snapshot-load');                   // do not auto-start from snapshot: perform a full boot
			opts.snapshotList         && args.push('-snapshot-list');                      // show a list of available snapshots
			opts.noSnapshotUpdateTime && args.push('-no-snapshot-update-time');            // do not do try to correct snapshot time on restore
			opts.wipeData             && args.push('-wipe-data');                          // reset the user data image (copy it from initdata)
			opts.skindir              && args.push('-skindir', opts.skindir);              // search skins in <dir> (default <system>/skins)
			opts.skin                 && args.push('-skin', opts.skin);                    // select a given skin
			opts.noSkin               && args.push('-no-skin');                            // don't use any emulator skin
			opts.dynamicSkin          && args.push('-dynamic-skin');                       // dynamically construct a skin of given size, requires -skin WxH option
			opts.memory               && args.push('-memory', opts.memory);                // physical RAM size in MBs
			opts.netspeed             && args.push('-netspeed', opts.netspeed);            // maximum network download/upload speeds
			opts.netdelay             && args.push('-netdelay', opts.netdelay);            // network latency emulation
			opts.netfast              && args.push('-netfast');                            // disable network shaping
			opts.trace                && args.push('-trace', opts.trace);                  // enable code profiling (F9 to start)
			opts.showKernel           && args.push('-show-kernel');                        // display kernel messages
			opts.shell                && args.push('-shell');                              // enable root shell on current terminal
			opts.noJNI                && args.push('-no-jni');                             // disable JNI checks in the Dalvik runtime
			opts.noAudio              && args.push('-no-audio');                           // disable audio support
			opts.audio                && args.push('-audio', opts.audio);                  // use specific audio backend
			opts.rawKeys              && args.push('-raw-keys');                           // disable Unicode keyboard reverse-mapping
			opts.radio                && args.push('-radio', opts.radio);                  // redirect radio modem interface to character device
			opts.onion                && args.push('-onion', opts.onion);                  // use overlay PNG image over screen
			opts.onionAlpha           && args.push('-onion-alpha', opts.onionAlpha);       // specify onion-skin translucency
			opts.onionRotation        && args.push('-onion-rotation', opts.onionRotation); // specify onion-skin rotation 0|1|2|3
			opts.scale                && args.push('-scale', opts.scale);                  // scale emulator window
			opts.dpiDevice            && args.push('-dpi-device', opts.dpiDevice);         // specify device's resolution in dpi (default 165)
			opts.httpProxy            && args.push('-http-proxy', opts.httpProxy);         // make TCP connections through a HTTP/HTTPS proxy
			opts.timezone             && args.push('-timezone', opts.timezone);            // use this timezone instead of the host's default
			opts.dnsServer            && args.push('-dns-server', opts.dnsServer);         // use this DNS server(s) in the emulated system
			opts.cpuDelay             && args.push('-cpu-delay', opts.cpuDelay);           // throttle CPU emulation
			opts.noWindow             && args.push('-no-window');                          // disable graphical window display
			opts.reportConsole        && args.push('-report-console', opts.reportConsole); // report console port to remote socket
			opts.gps                  && args.push('-gps', opts.gps);                      // redirect NMEA GPS to character device
			opts.keyset               && args.push('-keyset', opts.keyset);                // specify keyset file name
			opts.shellSerial          && args.push('-shell-serial', opts.shellSerial);     // specific character device for root shell
			opts.tcpdump              && args.push('-tcpdump', opts.tcpdump);              // capture network packets to file
			opts.bootchart            && args.push('-bootchart', opts.bootchart);          // enable bootcharting
			opts.charmap              && args.push('-charmap', opts.charmap);              // use specific key character map
			opts.sharedNetId          && args.push('-shared-net-id', opts.sharedNetId);    // join the shared network, using IP address 10.1.2.<number>
			opts.nandLimits           && args.push('-nand-limits', opts.nandLimits);       // enforce NAND/Flash read/write thresholds
			opts.memcheck             && args.push('-memcheck', opts.memcheck);            // enable memory access checking
			opts.gpu                  && args.push('-gpu', opts.gpu);                      // set hardware OpenGLES emulation mode
			opts.cameraBack           && args.push('-camera-back', opts.cameraBack);       // set emulation mode for a camera facing back
			opts.cameraFront          && args.push('-camera-front', opts.cameraFront);     // set emulation mode for a camera facing front
			opts.screen               && args.push('-screen', opts.screen);                // set emulated screen mode
			opts.force32bit           && args.push('-force-32bit');                        // always use 32-bit emulator

			// set system property on boot
			if (opts.props && typeof opts.props === 'object') {
				Object.keys(opts.props).forEach(prop => {
					args.push('-prop', prop + '=' + opts.props[prop]);
				});
			}

			// pass arguments to qemu
			if (Array.isArray(opts.qemu)) {
				args.push('-qemu');
				args = args.concat(opts.qemu);
			}

			let emuopts = {
				detached: opts.hasOwnProperty('detached') ? !!opts.detached : true,
				stdio: opts.stdio// || 'ignore'
			};
			opts.cwd && (emuopts.cwd = opts.cwd);
			opts.env && (emuopts.env = opts.env);
			opts.uid && (emuopts.uid = opts.uid);
			opts.gid && (emuopts.gid = opts.gid);

			console.log('---- starting emulator');

			let child = this.child = spawn(emulatorExe, args, emuopts);
			let device = new Emulator;

			device.id = 'emulator-' + port;
			device.emulator = {
				pid: child.pid,
				port: port
			};
			Object.assign(device.emulator, emu);

			child.stdout && child.stdout.on('data', data => {
				device.emit('stdout', data);
			});

			child.stderr && child.stderr.on('data', data => {
				device.emit('stderr', data);
			});

			child.on('error', err => {
				device.emit('error', err);
			});

			child.on('close', (code, signal) => {
				device.emit('exit', code, signal);
			});

			child.unref();

			return device;
		});
		// .catch(err => {
		// 	console.log('- emulator start err: ', err);
		// });
}

/**
 * Kills the specified Android emulator.
 * @param {Object} config - The CLI config object
 * @param {String} name - The name of the emulator
 * @param {Object} device - Android device definition object
 * @param {Number} [device.port] - The TCP port the emulator used
 * @param {Object} opts - Emulator options object
 * @param {Boolean} [opts.bypassCache=false] - Bypasses the Genymotion environment detection cache and re-queries the system
 * @returns {Promise}
 */
export function stop(config, name, device, opts) {
	let args = [
		'-s',
		'emulator-' + device.port,
		'emu',
		'kill'
	];

	return this
		.detect(opts)
		.then(result => {
			return util.run(result.sdk.executables.adb, args);
		})
		.then(({ code, stdout, stderr }) => {
			console.log('- code: ', code);
			console.log('- stdout: ', stdout);
			console.log('- stderr: ', stderr);
			return { code, stdout, stderr };
		});
}


/**
 * Get the name of the emulator connected to a specifc port
 * @param {Number} port - The TCP port the emulator used
 * @returns {Promise}
 */
function getAvdName(port) {
	return new Promise((resolve, reject) => {
		const WAITING_FOR_WELCOME = 1;
		const WAITING_FOR_NAME = 2;
		let state = WAITING_FOR_WELCOME;
		let socket = net.connect({ port: port });

		function end(err, result) {
			if (socket) {
				socket.end();
				socket = null;
				resolve(result);
			}
		}

		socket.on('data', function (data) {
			switch (state) {
				case WAITING_FOR_WELCOME:
					state = WAITING_FOR_NAME;
					socket.write('avd name\n');
					break;
				case WAITING_FOR_NAME:
					end(null, data.toString().trim().split('\n').shift().trim());
					break;
			}
		});

		socket.on('end', end);
		socket.on('error', end);
	});
}
