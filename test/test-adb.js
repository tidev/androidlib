import { ADB } from '../src/index';

describe('ADB', () => {

	describe('version', () => {
		it.only('should get the adb version', done => {
			const adb = new ADB();
			adb.version()
				.then(version => {
					console.log(version);
					done();
				})
				.catch(done);
		});
	});

	describe('parseDevices', () => {
		it('should not fail with empty device list', done => {
			const adb = new ADB();
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
	});

});
