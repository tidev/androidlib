import appcdLogger from 'appcd-logger';
import Connection from '../dist/connection';
import MockAdbServer from './mocks/adb-server';

import { sleep } from 'appcd-util';

const port = 9999;

const { log } = appcdLogger('test:androidlib:connection');

describe('Connection', () => {
	before(async function () {
		this.mockServer = new MockAdbServer(port);
		await this.mockServer.start();
	});

	afterEach(async function () {
		if (this.conn) {
			log('Closing connection from previous test...');
			try {
				this.conn.end();
			} catch (e) {
				// squelch
			}
			this.conn = null;
			await sleep(500);
		}
	});

	after(function () {
		return this.mockServer.stop();
	});

	it('should error if port is not valid', () => {
		expect(() => {
			new Connection('foo');
		}).to.throw(TypeError, 'Expected port to be a number');

		expect(() => {
			new Connection(-1);
		}).to.throw(Error, 'Port must be between 1 and 65535');

		expect(() => {
			new Connection(1e6);
		}).to.throw(Error, 'Port must be between 1 and 65535');
	});

	it('should error if command is not a string', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();

		try {
			await this.conn.exec(123);
		} catch (err) {
			expect(err.message).to.equal('Expected command to be a string');
			return;
		}

		throw new Error('Expected error');
	});

	it('should fail to execute bad command', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();

		try {
			await this.conn.exec('host:fake');
		} catch (err) {
			expect(err).to.be.instanceof(Error);
			expect(err.message).to.equal('unknown host service');
			return;
		}

		throw new Error('Expected error');
	});

	it('should execute host:version', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();
		const data = await this.conn.exec('host:version');
		expect(data).to.not.be.null;
		expect(data.toString()).to.equal('0030');
	});

	it('should execute host:devices with no devices', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();
		const data = await this.conn.exec('host:nodevices');
		expect(data).to.be.undefined;
	});

	it('should execute host:devices with devices', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();
		const data = await this.conn.exec('host:twodevices');
		expect(data).to.not.be.null;
		expect(data.toString()).to.equal('emulator-5556\tdevice\nemulator-5554\tdevice\n');
	});

	it('should execute shell:ps', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();
		const data = await this.conn.exec('shell:ps', { noLength: true });
		expect(data).to.not.be.null;
	});

	it('should execute multiple commands over same connection but different sockets', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();

		let data = await this.conn.exec('shell:ps', { noLength: true });
		expect(data).to.not.be.null;

		data = await this.conn.exec('shell:ps', { noLength: true });
		expect(data).to.not.be.null;
	});

	it('should execute multiple commands over same connection with same socket', async function () {
		this.conn = new Connection(port);
		await this.conn.connect();
		await this.conn.exec('host:transport:emulator-5554');
		const data = await this.conn.exec('shell:ps', { noLength: true });
		expect(data).to.not.be.null;
	});
});
