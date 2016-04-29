import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import * as ndk from '../src/ndk';

const win = process.platform === 'win32' ? '-win' : '';

describe('NDK detect', () => {
	it('should detect installed NDK version r9d', done => {
		const ndkPath = path.resolve(`./test/mocks/mockNDKs/mock-android-ndk-r9d${win}`);
		ndk.detect({ ndkPath: ndkPath })
			.then(result => {
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('ndks');

				const ndks = result.ndks;
				expect(ndks).to.be.an.Array;

				const ndk = ndks[0];
				expect(ndk).to.have.keys('path', 'executables', 'version');
				expect(ndk.path).to.be.a.String;
				expect(ndk.path).to.have.string('mock-android-ndk-r9d');
				expect(ndk.version).to.be.a.String;
				expect(ndk.version).to.equal('r9d (64-bit)');
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

	it('should detect installed NDK version r11b', done => {
		const ndkPath = path.resolve(`./test/mocks/mockNDKs/mock-android-ndk-r11b${win}`);
		ndk.detect({ ndkPath: ndkPath })
			.then(result => {
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('ndks');

				const ndks = result.ndks;
				expect(ndks).to.be.an.Array;

				const ndk = ndks[0];
				expect(ndk).to.have.keys('path', 'executables', 'version');
				expect(ndk.path).to.be.a.String;
				expect(ndk.path).to.have.string('mock-android-ndk-r11b');
				expect(ndk.version).to.be.a.String;
				expect(ndk.version).to.equal('11.1.2683735');
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
