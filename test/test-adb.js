import appcdLogger from 'appcd-logger';
import MockAdbServer from './fixtures/adb-server';
import path from 'path';

import * as androidlib from '../dist/index';

import { run } from 'appcd-subprocess';

const { log } = appcdLogger('test:androidlib:adb');
const { highlight } = appcdLogger.styles;

const port = 9999;

describe('ADB', () => {
	beforeEach(function () {
		this.path = androidlib.options.env.path;
		this.port = androidlib.options.adb.port;
		this.searchPaths = androidlib.options.sdk.searchPaths;

		androidlib.options.adb.port = null;
		androidlib.options.sdk.searchPaths = null;

		log(`Starting mock server on port ${port}`);
		this.mockServer = new MockAdbServer(port);
		this.mockServer.start();
	});

	afterEach(async function () {
		this.timeout(10000);
		this.slow(2000);

		log('Stopping mock server');
		this.mockServer.stop();

		const adb = await androidlib.adb.findAdb();
		if (adb) {
			const args = [ 'kill-server' ];
			const { port } = androidlib.options.adb;
			if (port) {
				args.unshift('-P', port);
			}
			log(`Running: ${highlight(`${adb} ${args.join(' ')}`)}`);
			await run(adb, args);
		}

		androidlib.options.env.path = this.path;
		androidlib.options.adb.port = this.port;
		androidlib.options.sdk.searchPaths = this.searchPaths;
	});

	it('should get the adb version', async function () {
		this.timeout(10000);
		this.slow(2000);

		androidlib.options.adb.port = port;
		const version = await androidlib.adb.version();
		expect(version).to.equal('1.0.48');
	});

	it('should fail if adb is not found', async function () {
		this.timeout(10000);
		this.slow(2000);

		androidlib.options.env.path = path.join(__dirname, 'does_not_exist');
		androidlib.options.adb.port = 55555;
		androidlib.options.sdk.searchPaths = path.join(__dirname, 'does_not_exist');

		try {
			await androidlib.adb.version();
		} catch (e) {
			expect(e.message).to.equal('Unable to find and start adb');
			return;
		}

		throw new Error('Expected exception');
	});

	it('should connect to adb and get the version', async function () {
		this.timeout(10000);
		this.slow(2000);

		let version;
		try {
			version = await androidlib.adb.version();
		} catch (e) {
			return;
		}
		expect(version).to.match(/^\d\d?(\.\d\d?){2}$/);
	});

	it('should get a list of connected devices', async function () {
		this.timeout(10000);
		this.slow(2000);

		try {
			const devices = await androidlib.devices.getDevices();
			expect(devices).to.be.an('array');
			for (const d of devices) {
				expect(d).to.be.instanceof(androidlib.Device);
			}
		} catch (e) {
			if (e.message !== 'Unable to find and start adb') {
				throw e;
			}
		}
	});

	it('should track devices', function (done) {
		this.timeout(20000);
		this.slow(18000);

		const handle = androidlib.devices.trackDevices();
		let counter = 0;

		const timer = setTimeout(() => {
			log('Device state hasn\'t changed, skipping test');
			handle.stop();
			done();
		}, 15000);

		handle.on('devices', devices => {
			log(devices);

			try {
				expect(devices).to.be.an('array');
				for (const d of devices) {
					expect(d).to.be.instanceof(androidlib.Device);
				}
				if (counter++ >= 2) {
					clearTimeout(timer);
					handle.stop();
					done();
				}
			} catch (e) {
				clearTimeout(timer);
				handle.stop();
				done();
			}
		});

		handle.on('error', err => {
			if (err.message !== 'Unable to find and start adb') {
				done(err);
			}
		});
	});
});
