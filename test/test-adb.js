import androidlib from '../src/index';
import MockAdbServer from './mocks/mockAdbServer';

const port = 9999;

describe('ADB', () => {
	describe('version', () => {
		before(function () {
			this.mockServer = new MockAdbServer(port);
			this.mockServer.start();
		});

		after(function () {
			this.mockServer.stop();
		});

		it('should get the adb version', done => {
			const adb = new androidlib.ADB({ port });
			adb.version()
				.then(version => {
					expect(version).to.equal('1.0.48');
					done();
				})
				.catch(done);
		});
	});

/*	describe('parseDevices', () => {
		it('should not fail with empty device list', done => {
			const adb = new androidlib.ADB();
			adb.parseDevices('')
				.then(result => {
					expect(result).to.be.an.Array;
					expect(result).to.have.lengthOf(0);
					done();
				})
				.catch(done);
		});

		it('should parse the list of devices', done => {
			//TODO
			done();
		});
	});*/
});
