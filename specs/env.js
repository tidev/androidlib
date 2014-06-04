/**
 * env specs
 */
var should = require('should'),
	fs = require('fs'),
	env = require('../lib/env');

describe("env", function(){

	it("should be able to find SDK and NDK", function(done){
		var options = {};
		var android = env.find(options,done);
		should(options.sdk).be.ok;
		should(android).be.an.object;
		should(android.sdkPath).be.a.string;
		should(android.ndkPath).be.a.string;
		should(android.jar).be.a.string;
		fs.existsSync(android.sdkPath).should.be.true;
		fs.existsSync(android.ndkPath).should.be.true;
		fs.existsSync(android.jar).should.be.true;
		done();
	});
	
});