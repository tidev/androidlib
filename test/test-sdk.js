import * as sdk from '../src/sdk';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

describe('detect', () => {
	it('should detect installed SDK', function (done) {
		this.timeout(5000);
		this.slow(4000);

		sdk
			.detect()
			.then(result => {
				expect(result).to.be.an.Object;
				expect(result).to.have.keys('sdk');
				expect(result.sdk).to.be.an.Object;

				const sdk = result.sdk;
				expect(sdk).to.be.an.Object;
				expect(sdk).to.have.keys('path', 'executables', 'dx', 'proguard', 'tools', 'platformTools', 'buildTools');

				expect(sdk.path).to.be.a.String;
				expect(sdk.path).to.not.equal('');

				expect(sdk.dx).to.be.a.String;
				expect(sdk.dx).to.not.equal('');

				expect(sdk.proguard).to.be.a.String;
				expect(sdk.proguard).to.not.equal('');

				expect(sdk.executables).to.be.an.Object;
				Object.keys(sdk.executables).forEach(name => {
					expect(sdk.executables[name]).to.be.a.String;
					expect(sdk.executables[name]).to.not.equal('');
					expect(() => fs.statSync(sdk.executables[name])).to.not.throw(Error);
				});

				const tools = sdk.tools;
				expect(tools).to.be.an.Object;
				expect(tools).to.have.keys('path', 'supported', 'version');

				const platformTools = sdk.platformTools;
				expect(platformTools).to.be.an.Object;
				expect(platformTools).to.have.keys('path', 'supported', 'version');

				const buildTools = sdk.buildTools;
				expect(buildTools).to.be.an.Object;
				expect(buildTools).to.have.keys('path', 'supported', 'version', 'tooNew', 'maxSupported');

				done();
			})
			.catch(err => console.error);
	});

	//TODO add more test
});
