import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import { ndk } from '../src/index';

const win = process.platform === 'win32' ? '-win' : '';

describe('NDK detect', () => {
	before(function () {
		this.androidNDKEnv = process.env.ANDROID_NDK;
		process.env.ANDROID_NDK = '';
	});

	after(function () {
		process.env.ANDROID_NDK = this.androidNDKEnv;
	});

	it('should detect NDK version r9d 64-bit', function (done) {
		const ndkPath = path.resolve(`./test/mocks/mockNDKs/mock-android-ndk-r9d${win}`);
		ndk.detect({ bypassCache: true, ndkPath, searchPaths: null })
			.then(ndks => {
				expect(ndks).to.be.an.Array;
				expect(ndks).to.have.lengthOf(1);

				const ndk = ndks[0];
				expect(ndk).to.have.keys('path', 'name', 'version', 'arch', 'executables');

				expect(ndk.path).to.be.a.String;
				expect(ndk.path).to.equal(ndkPath);

				expect(ndk.name).to.be.a.String;
				expect(ndk.name).to.equal('r9d');

				expect(ndk.version).to.be.a.String;
				expect(ndk.version).to.equal('9.3');

				expect(ndk.arch).to.be.a.String;
				expect(ndk.arch).to.equal('64-bit');

				expect(ndk.executables).to.be.an.Object;
				for (const name of Object.keys(ndk.executables)) {
					expect(ndk.executables[name]).to.be.a.String;
					expect(ndk.executables[name]).to.not.equal('');
					expect(() => fs.statSync(ndk.executables[name])).to.not.throw(Error);
				}

				done();
			})
			.catch(done);
	});

	it('should detect NDK version r11b 64-bit', done => {
		const ndkPath = path.resolve(`./test/mocks/mockNDKs/mock-android-ndk-r11b${win}`);
		ndk.detect({ bypassCache: true, ndkPath, searchPaths: null })
			.then(ndks => {
				expect(ndks).to.be.an.Array;
				expect(ndks).to.have.lengthOf(1);

				const ndk = ndks[0];
				expect(ndk).to.have.keys('path', 'name', 'version', 'arch', 'executables');

				expect(ndk.path).to.be.a.String;
				expect(ndk.path).to.equal(ndkPath);

				expect(ndk.name).to.be.a.String;
				expect(ndk.name).to.equal('r11b');

				expect(ndk.version).to.be.a.String;
				expect(ndk.version).to.equal('11.1.2683735');

				expect(ndk.arch).to.be.a.String;
				expect(ndk.arch).to.equal('64-bit');

				expect(ndk.executables).to.be.an.Object;
				for (const name of Object.keys(ndk.executables)) {
					expect(ndk.executables[name]).to.be.a.String;
					expect(ndk.executables[name]).to.not.equal('');
					expect(() => fs.statSync(ndk.executables[name])).to.not.throw(Error);
				}

				done();
			})
			.catch(done);
	});
});
