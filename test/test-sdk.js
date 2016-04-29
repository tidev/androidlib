import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import * as sdk from '../src/sdk';

const win = process.platform === 'win32' ? '-win' : '';

describe('SDK detect', () => {
	it('should detect installed SDK', done => {
		const sdkPath = path.resolve(`./test/mocks/mockSDKs/mock-android-sdk${win}`);
		sdk
			.detect({ sdkPath: sdkPath })
			.then(result => {
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('sdks', 'linux64bit');

				const sdks = result.sdks;
				expect(sdks).to.be.an.Array;

				const sdk = sdks[0];
				expect(sdk).to.have.keys('path', 'executables', 'dx', 'proguard', 'tools', 'platformTools', 'buildTools', 'targets');

				expect(sdk.path).to.be.a.String;
				expect(sdk.path).to.have.string('mock-android-sdk');

				expect(sdk.dx).to.be.a.String;
				expect(sdk.dx).to.not.equal('');

				expect(sdk.proguard).to.be.a.String;
				expect(sdk.proguard).to.not.equal('');
				//
				expect(sdk.executables).to.be.an.Object;
				for (let name of Object.keys(sdk.executables)) {
					expect(sdk.executables[name]).to.be.a.String;
					expect(sdk.executables[name]).to.not.equal('');
					expect(() => fs.statSync(sdk.executables[name])).to.not.throw(Error);
				}

				const tools = sdk.tools;
				expect(tools).to.be.an.Object;
				expect(tools).to.have.keys('path', 'version');
				expect(tools.version).to.equal('25.0.10');

				const platformTools = sdk.platformTools;
				expect(platformTools).to.be.an.Object;
				expect(platformTools).to.have.keys('path', 'version');
				expect(platformTools.version).to.equal('23.1');

				const buildTools = sdk.buildTools;
				expect(buildTools).to.be.an.Object;
				expect(buildTools).to.have.keys('path', 'version');
				expect(buildTools.version).to.equal('24');

				done();
			})
			.catch(done);
	});
});
