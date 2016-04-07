import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import * as sdk from '../src/sdk';

describe('SDK detect', () => {
	it('should detect installed SDK', done => {
		sdk
			.detect()
			.then(result => {
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('sdks', 'linux64bit');
				expect(result.sdk).to.be.an.Object;

				// const sdk = result.sdks;
				// expect(sdk).to.be.an.Array;
				// expect(sdk).to.have.keys('path', 'executables', 'dx', 'proguard', 'tools', 'platformTools', 'buildTools');

				// expect(sdk.path).to.be.a.String;
				// expect(sdk.path).to.not.equal('');
				//
				// expect(sdk.dx).to.be.a.String;
				// expect(sdk.dx).to.not.equal('');
				//
				// expect(sdk.proguard).to.be.a.String;
				// expect(sdk.proguard).to.not.equal('');
				//
				// expect(sdk.executables).to.be.an.Object;
				// for (let name of Object.keys(sdk.executables)) {
				// 	expect(sdk.executables[name]).to.be.a.String;
				// 	expect(sdk.executables[name]).to.not.equal('');
				// 	expect(() => fs.statSync(sdk.executables[name])).to.not.throw(Error);
				// }
				//
				// const tools = sdk.tools;
				// expect(tools).to.be.an.Object;
				// expect(tools).to.have.keys('path', 'version');
				//
				// const platformTools = sdk.platformTools;
				// expect(platformTools).to.be.an.Object;
				// expect(platformTools).to.have.keys('path', 'version');
				//
				// const buildTools = sdk.buildTools;
				// expect(buildTools).to.be.an.Object;
				// expect(buildTools).to.have.keys('path', 'version');

				done();
			})
			.catch(done);
	});

	//TODO add more test
});
