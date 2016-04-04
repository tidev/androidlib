import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import * as ndk from '../src/ndk';

describe('NDK detect', () => {
	it('should detect installed NDK', done => {
		ndk
			.detect()
			.then(result => {
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('ndk');
				expect(result.ndk).to.be.an.Object;

				const ndk = result.ndk;
				expect(ndk).to.be.an.Object;
				expect(ndk).to.have.keys('path', 'executables', 'version');
				expect(ndk.path).to.be.a.String;
				expect(ndk.path).to.not.equal('');
				expect(ndk.version).to.be.a.String;
				expect(ndk.version).to.not.equal('');
				expect(ndk.executables).to.be.an.Object;
				for (let name of Object.keys(ndk.executables)) {
					expect(ndk.executables[name]).to.be.a.String;
					expect(ndk.executables[name]).to.not.equal('');
					expect(() => fs.statSync(ndk.executables[name])).to.not.throw(Error);
				}

				done();
			})
			.catch(done);
	});

	//TODO add more test
});
