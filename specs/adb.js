/**
 * adb specs
 */
var should = require('should'),
	fs = require('fs'),
	path = require('path'),
	spawn = require('child_process').spawn,
	adb = require('../lib/adb');

describe("adb", function(){
	it("should have launch", function(){
		should(adb.launch).be.a.function;
	});

	it("should be able to launch example app",function(done){
		this.timeout(30000);

		var project_dir = path.join(__dirname,'..','example'),
			cwd = process.cwd();
		
		process.chdir(project_dir);
		try {
			var child = spawn('ant',['debug']);
			child.on('error',done);
			child.stdout.on('data',function(buf){
				process.env.TRAVIS && console.log(String(buf).trim());
			});
			child.stderr.on('data',function(buf){
				console.error(String(buf).trim());
			});
			child.on('close',function(exitCode){
				if (exitCode!=0) {
					return done("exited with exitCode "+exitCode);
				}

				var apk = path.join(project_dir,'bin','TestApp-debug.apk');
				should(fs.existsSync(apk)).be.true;

				function callback (err){ 
					done(err);
				}

				function logger(label,message) {
					//console.log(label,' ',message);
				}

				//now launch
				var config = {
					callback: callback,
					logger: logger,
					apk: apk,
					appid: 'org.appcelerator.test',
					name: 'Main',
					auto_exit: true,
					arch: 'arm',
					sdk: '18'
				};

				adb.launch(config);
			});
		}
		finally {
			process.chdir(cwd);
		}
	});
});