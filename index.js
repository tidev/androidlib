/**
 * Main namespace for the ioslib.
 *
 * @copyright
 * Copyright (c) 2014-2015 by Appcelerator, Inc. All Rights Reserved.
 *
 * @license
 * Licensed under the terms of the Apache Public License.
 * Please see the LICENSE included with this distribution for details.
 */

const
	async = require('async'),
	magik = require('./lib/utilities').magik,

	adb          = exports.adb          = require('./lib/adb'),
	device       = exports.device       = require('./lib/device'),
	emulator     = exports.emulator     = require('./lib/emulator'),
	env          = exports.env          = require('./lib/env'),
	ndk          = exports.ndk          = require('./lib/ndk'),
	sdk          = exports.sdk          = require('./lib/sdk');

var cache;

exports.detect = detect;

/**
 * Detects the entire iOS environment information.
 *
 * @param {Object} [options] - An object containing various settings.
 * @param {Boolean} [options.bypassCache=false] - When true, re-detects the all iOS information.
 * @param {String} [options.minIosVersion] - The minimum iOS SDK to detect.
 * @param {String} [options.minWatchosVersion] - The minimum WatchOS SDK to detect.
 * @param {String} [options.profileDir=~/Library/MobileDevice/Provisioning Profiles] - The path to search for provisioning profiles.
 * @param {String} [options.security] - Path to the <code>security</code> executable
 * @param {String} [options.supportedVersions] - A string with a version number or range to check if an Xcode install is supported.
 * @param {String} [options.type] - The type of emulators to return. Can be either "iphone" or "ipad". Defaults to all types.
 * @param {Boolean} [options.validOnly=true] - When true, only returns non-expired, valid certificates.
 * @param {String} [options.xcodeSelect] - Path to the <code>xcode-select</code> executable
 * @param {Function} [callback(err, info)] - A function to call when all detection tasks have completed.
 */
function detect(options, callback) {
	return magik(options, callback, function (emitter, options, callback) {
		if (cache && !options.bypassCache) {
			emitter.emit('detected', cache);
			return callback(null, cache);
		}

		var results = {
			detectVersion: '4.0',
			issues: []
		};

		function mix(src, dest) {
			Object.keys(src).forEach(function (name) {
				if (Array.isArray(src[name])) {
					if (Array.isArray(dest[name])) {
						dest[name] = dest[name].concat(src[name]);
					} else {
						dest[name] = src[name];
					}
				} else if (src[name] !== null && typeof src[name] === 'object') {
					dest[name] || (dest[name] = {});
					Object.keys(src[name]).forEach(function (key) {
						dest[name][key] = src[name][key];
					});
				} else {
					dest[name] = src[name];
				}
			});
		}

		async.parallel([
			function certificates(done) {
				certs.detect(options, function (err, result) {
					err || mix(result, results);
					done(err);
				});
			},
			function devices(done) {
				device.detect(options, function (err, result) {
					err || mix(result, results);
					done(err);
				});
			},
			function environment(done) {
				env.detect(options, function (err, result) {
					err || mix(result, results);
					done(err);
				});
			},
			function provisioningProfiles(done) {
				provisioning.detect(options, function (err, result) {
					err || mix(result, results);
					done(err);
				});
			},
			function simulators(done) {
				simulator.detect(options, function (err, result) {
					err || mix(result, results);
					done(err);
				});
			},
			function xcodes(done) {
				xcode.detect(options, function (err, result) {
					err || mix(result, results);
					done(err);
				});
			}
		], function (err) {
			if (err) {
				emitter.emit('error', err);
				return callback(err);
			} else {
				cache = results;
				emitter.emit('detected', results);
				return callback(null, results);
			}
		});
	});
};
