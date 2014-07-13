/**
 * env specs
 */
var should = require('should'),
	fs = require('fs'),
	env = require('../lib/env');

describe("env", function(){

	it("should be able to find SDK and NDK", function(done){
		var options = {arch:'armv7',sdk:'18'};
		var android = env.find(options,done);
		should(options.sdk).be.ok;
		should(android).be.an.object;
		should(android.sdkPath).be.a.string;
		should(android.ndkPath).be.a.string;
		should(android.arch).be.a.string;
		should(android.archlib).be.a.string;
		should(android.jar).be.a.string;
		should(android.toolchain_platform_sdk).be.a.string;
		should(android.toolchain).be.a.string;
		should(android.toolchain_version).be.a.string;
		should(android.toolchain_dir).be.a.string;
		should(android.toolchain_llvm).be.a.string;
		should(android.toolchain_arch).be.a.string;
		should(android.toolchain_ar).be.a.string;
		should(android.toolchain_clang).be.a.string;
		should(android.toolchain_libstdcpp).be.a.string;
		should(android.toolchain_libstdcpplib).be.a.string;
		fs.existsSync(android.sdkPath).should.be.true;
		fs.existsSync(android.ndkPath).should.be.true;
		fs.existsSync(android.jar).should.be.true;
		fs.existsSync(android.toolchain).should.be.true;
		fs.existsSync(android.toolchain_llvm).should.be.true;
		fs.existsSync(android.toolchain_ar).should.be.true;
		fs.existsSync(android.toolchain_clang).should.be.true;
		fs.existsSync(android.toolchain_platform_sdk).should.be.true;
		fs.existsSync(android.toolchain_libstdcpp).should.be.true;
		fs.existsSync(android.toolchain_libstdcpplib).should.be.true;
		done();
	});
	
});
