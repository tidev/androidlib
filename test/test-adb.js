import { expect } from 'chai';
import ADB from '../src/adb';

describe('ADB', () => {

	describe('parseDevices', () => {

		it('should not fail with empty device list', done => {
			const adb = new ADB();
			adb.parseDevices('')
				.then(result => {
					expect(result).eql([]);
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
