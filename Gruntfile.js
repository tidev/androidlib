module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		mocha_istanbul: {
			coverage: {
				src: [ 'specs/*.js' ],
				options: {
					timeout: 3500,
					reporter: 'mocha-jenkins-reporter',
					reportFormats: [ 'lcov', 'cobertura' ],
					ignoreLeaks: false,
					globals: [
						'requestSSLInitializing',
						'requestSSLInsideHook',
						'requestSSLInitialized'
					]
				}
			}
		},
		clean: {
			test: [ 'tmp', 'coverage', 'junit_report.xml' ]
		},
		appcJs: {
			options: {
				force: false
			},
			src: [ 'Gruntfile.js', 'index.js', 'lib/**/*.js', 'spec/**/*.js', 'bin/*' ]
		}
	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-appc-js');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-mocha-istanbul');

	grunt.registerTask('lint', [ 'appcJs' ]);
	grunt.registerTask('test', [ 'lint', 'clean:test', 'mocha_istanbul:coverage' ]);
	grunt.registerTask('default', [ 'test' ]);

};
