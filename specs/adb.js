/**
 * adb specs
 */
'use strict';
const should = require('should'),
	fs = require('fs'),
	path = require('path'),
	spawn = require('child_process').spawn,
	adb = require('../lib/adb');

describe('adb', function () {
	(process.env.JENKINS ? it.skip : it)('should have launch', function () {
		should(adb.launch).be.a.function; // eslint-disable-line no-unused-expressions
	});

	(process.env.JENKINS ? it.skip : it)('should be able to launch example app', function (done) {
		this.timeout(30000);

		const project_dir = path.join(__dirname, '..', 'example'),
			cwd = process.cwd();

		process.chdir(project_dir);
		try {
			const child = spawn('ant', [ 'debug' ]);
			child.on('error', done);
			child.stdout.on('data', function (buf) {
				process.env.TRAVIS && console.log(String(buf).trim());
			});
			child.stderr.on('data', function (buf) {
				console.error(String(buf).trim());
			});
			child.on('close', function (exitCode) {
				if (exitCode !== 0) {
					return done('exited with exitCode ' + exitCode);
				}

				const apk = path.join(project_dir, 'bin', 'TestApp-debug.apk');
				should(fs.existsSync(apk)).be.true; // eslint-disable-line no-unused-expressions

				function callback (err) {
					done(err);
				}

				function logger() {
					// console.log(label,' ',message);
				}

				// now launch
				const config = {
					callback: callback,
					logger: logger,
					apk: apk,
					appid: 'org.appcelerator.test',
					name: 'Main',
					auto_exit: true,
					arch: 'arm',
					sdk: '18'
				};

				adb.launch(config);
			});
		} finally {
			process.chdir(cwd);
		}
	});
});
