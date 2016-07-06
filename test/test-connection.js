import Connection from '../src/connection';
import MockAdbServer from './mocks/mockAdbServer';

const port = 9999;

describe('connection', () => {
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

	it('should error if command is not a string', function (done) {
		const conn = new Connection(port);
		conn.exec(123)
			.then(data => {
				done(new Error('Expected error'));
			})
			.catch(err => {
				expect(err.message).to.equal('Expected command to be a string');
				done();
			})
			.catch(err => done);
	});

	it('should fail to execute bad command', function (done) {
		const conn = new Connection(port);
		conn.exec('host:fake')
			.then(data => {
				done(new Error('Expected error'));
			})
			.catch(err => {
				expect(err).to.be.instanceof(Error);
				expect(err.message).to.equal('unknown host service');
				done();
			})
			.catch(err => done);
	});

	it('should execute host:version', function (done) {
		const conn = new Connection(port);
		conn.exec('host:version')
			.then(data => {
				expect(data).to.not.be.null;
				expect(data.toString()).to.equal('0030');
				done();
			})
			.catch(err => done);
	});

	it('should execute host:devices with no devices', function (done) {
		const conn = new Connection(port);
		conn.exec('host:nodevices')
			.then(data => {
				expect(data).to.be.undefined;
				done();
			})
			.catch(err => done);
	});

	it('should execute host:devices with devices', function (done) {
		const conn = new Connection(port);
		conn.exec('host:twodevices')
			.then(data => {
				expect(data).to.not.be.null;
				expect(data.toString()).to.equal('emulator-5556\tdevice\nemulator-5554\tdevice\n');
				done();
			})
			.catch(err => done);
	});

	it('should execute shell:ps', function (done) {
		const conn = new Connection(port);
		conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
			.then(data => {
				expect(data).to.not.be.null;
				done();
			})
			.catch(err => done);
	});

	it('should execute multiple commands over same connection but different sockets', function (done) {
		const conn = new Connection(port);
		conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
			.then(data => {
				expect(data).to.not.be.null;

				return conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
					.then(data => {
						expect(data).to.not.be.null;
						done();
					});
			})
			.catch(err => done);
	});

	it('should execute multiple commands over same connection with same socket', function (done) {
		const conn = new Connection(port);
		conn.exec('host:transport:emulator-5554')
			.then(() => {
				return conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
					.then(data => {
						expect(data).to.not.be.null;
						done();
					});
			})
			.catch(err => done);
	});
});

/*
function debug(conn) {
	conn.on('data', data => {
		console.log(data);
	});

	conn.on('end', data => {
		console.log('END:', data);
	});

	conn.on('close', data => {
		console.log('CLOSE:', data);
	});
}
*/
