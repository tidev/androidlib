import { expect } from 'chai';
import Connection from '../src/connection';
import MockAdbServer from './mocks/mockAdbServer';

let mockServer;

describe('connection', () => {
	before(done => {
		mockServer = new MockAdbServer();
		mockServer.start();
		done();
	});

	after(done => {
		mockServer && mockServer.stop();
		done();
	});

	it('should fail exec fake command', done => {
		const conn = new Connection(mockServer);

		// conn.on('data', data => {
		// 	console.log(data);
		// });
		//
		// conn.on('end', data => {
		// 	console.log('END:', data);
		// });
		//
		// conn.on('close', data => {
		// 	console.log('CLOSE:', data);
		// });


		conn.exec('host:fake')
			.catch(err => {
				expect(err.toString()).to.have.string('unknown host service');
				done();
			});
	});

	it('should exec host:version', done => {
		const conn = new Connection(mockServer);

		// conn.on('data', data => {
		// 	console.log(data);
		// });
		//
		// conn.on('end', data => {
		// 	console.log('END:', data);
		// });
		//
		// conn.on('close', data => {
		// 	console.log('CLOSE:', data);
		// });

		conn.exec('host:version')
			.then(data => {
				expect(data).to.not.be.null;
				expect(data.toString()).to.equal('0030');
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('should exec host:devices with no devices', done => {
		const conn = new Connection(mockServer);

		// conn.on('data', data => {
		// 	console.log(data);
		// });
		//
		// conn.on('end', data => {
		// 	console.log('END:', data);
		// });
		//
		// conn.on('close', data => {
		// 	console.log('CLOSE:', data);
		// });

		conn.exec('host:nodevices')
			.then(data => {
				expect(data).to.be.undefined;
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('should exec host:devices with devices', done => {
		// const output = `OKAY002cemulator-5556\tdevice\nemulator-5554\tdevice\n`; //[OKAY][LEN][DATA]
		const conn = new Connection(mockServer);

		// conn.on('data', data => {
		// 	console.log(data);
		// });
		//
		// conn.on('end', data => {
		// 	console.log('END:', data);
		// });
		//
		// conn.on('close', data => {
		// 	console.log('CLOSE:', data);
		// });

		conn.exec('host:twodevices')
			.then(data => {
				expect(data).to.not.be.null;
				expect(data.toString()).to.equal('emulator-5556\tdevice\nemulator-5554\tdevice\n');
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('should shell:ps', done => {
		const conn = new Connection(mockServer);
		// conn.on('data', data => {
		// 	console.log(data);
		// });
		//
		// conn.on('end', data => {
		// 	console.log('END:', data);
		// });
		//
		// conn.on('close', data => {
		// 	console.log('CLOSE:', data);
		// });

		conn.exec('shell:ps', { bufferUntilClose: true, noLength: true })
			.then(data => {
				expect(data).to.not.be.null;
				done();
			})
			.catch(err => {
				done(err);
			});
	});
});
