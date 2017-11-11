import Connection from '../dist/connection';
import MockAdbServer from './fixtures/adb-server';

const port = 9999;

describe('Connection', () => {
	before(function () {
		this.mockServer = new MockAdbServer(port);
		this.mockServer.start();
	});

	after(function () {
		this.mockServer.stop();
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

	it('should error if command is not a string', () => {
		const conn = new Connection(port);
		return conn.exec(123)
			.then(() => {
				throw new Error('Expected error');
			}, err => {
				expect(err.message).to.equal('Expected command to be a string');
			});
	});

	it('should fail to execute bad command', () => {
		const conn = new Connection(port);
		return conn.exec('host:fake')
			.then(() => {
				throw new Error('Expected error');
			}, err => {
				expect(err).to.be.instanceof(Error);
				expect(err.message).to.equal('unknown host service');
			});
	});

	it('should execute host:version', () => {
		const conn = new Connection(port);
		return conn.exec('host:version')
			.then(data => {
				expect(data).to.not.be.null;
				expect(data.toString()).to.equal('0030');
			});
	});

	it('should execute host:devices with no devices', () => {
		const conn = new Connection(port);
		return conn.exec('host:nodevices')
			.then(data => {
				expect(data).to.be.undefined;
			});
	});

	it('should execute host:devices with devices', () => {
		const conn = new Connection(port);
		return conn.exec('host:twodevices')
			.then(data => {
				expect(data).to.not.be.null;
				expect(data.toString()).to.equal('emulator-5556\tdevice\nemulator-5554\tdevice\n');
			});
	});

	it('should execute shell:ps', () => {
		const conn = new Connection(port);
		return conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
			.then(data => {
				expect(data).to.not.be.null;
			});
	});

	it('should execute multiple commands over same connection but different sockets', () => {
		const conn = new Connection(port);
		return conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
			.then(data => {
				expect(data).to.not.be.null;

				return conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
					.then(data => {
						expect(data).to.not.be.null;
					});
			});
	});

	it('should execute multiple commands over same connection with same socket', () => {
		const conn = new Connection(port);
		return conn.exec('host:transport:emulator-5554')
			.then(() => {
				return conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
					.then(data => {
						expect(data).to.not.be.null;
					});
			});
	});
});
