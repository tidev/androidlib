library 'pipeline-library'

timestamps {
	node('osx && android-sdk && android-ndk && git && npm-publish') { // linux seems to fail on wait for emulators for some reason
		def packageVersion = ''
		def isMaster = false
		stage('Checkout') {
			checkout scm

			isMaster = env.BRANCH_NAME.equals('master')
			packageVersion = jsonParse(readFile('package.json'))['version']
			currentBuild.displayName = "#${packageVersion}-${currentBuild.number}"
		}

		nodejs(nodeJSInstallationName: 'node 6.9.5') {
			ansiColor('xterm') {
				stage('Security') {
					// Clean up and install only production dependencies
					sh 'rm -rf node_modules/'
					sh 'npm install --production'

					// Scan for NSP and RetireJS warnings
					sh 'npm install nsp'
					sh 'node ./node_modules/.bin/nsp check --output summary --warn-only'
					sh 'npm uninstall nsp'
					sh 'npm prune'

					sh 'npm install retire'
					sh 'node ./node_modules/.bin/retire --exitwith 0'
					sh 'npm uninstall retire'
					sh 'npm prune'

					step([$class: 'WarningsPublisher', canComputeNew: false, canResolveRelativePaths: false, consoleParsers: [[parserName: 'Node Security Project Vulnerabilities'], [parserName: 'RetireJS']], defaultEncoding: '', excludePattern: '', healthy: '', includePattern: '', messagesPattern: '', unHealthy: ''])
				} // stage

				timeout(10) {
					stage('Build') {
						sh 'npm install'
						fingerprint 'package.json'
						try {
							withEnv(["PATH+ANDROID=${env.ANDROID_SDK}/platform-tools:${env.ANDROID_SDK}/tools"]) {
								sh 'echo no | android create avd --force -n test -t android-23 --abi x86_64'
								sh 'emulator -avd test -no-skin -no-boot-anim -no-window &'
								sh './wait_for_emulator'
								sh 'adb shell input keyevent 82 &'
							} // withEnv
							sh 'npm test' // ASSUMES ANDROID_SDK, ANDROID_NDK, ANDROID_HOME are all set
						} catch (e) {
							throw e
						} finally {
							// kill the emulator
							sh 'killall -9 emulator64-x86'
							// Remove our test avd/emulator
							sh 'rm -rf ~/.android/avd/test.avd'
							sh 'rm -rf ~/.android/avd/test.ini'
							// record results even if tests/coverage 'fails'
							if (fileExists('junit_report.xml')) {
								junit 'junit_report.xml'
							}
							if (fileExists('coverage/cobertura-coverage.xml')) {
								step([$class: 'CoberturaPublisher', autoUpdateHealth: false, autoUpdateStability: false, coberturaReportFile: 'coverage/cobertura-coverage.xml', failUnhealthy: false, failUnstable: false, maxNumberOfBuilds: 0, onlyStable: false, sourceEncoding: 'ASCII', zoomCoverageChart: false])
							}
						}
					} // stage

					stage('Publish') {
						if (isMaster) {
							sh 'npm publish'
							// Only push git tag if npm publish succeeded
							pushGitTag(name: packageVersion, force: true, message: "See ${env.BUILD_URL} for more information.")
							// updateJIRA('CLI', packageVersion, scm)
						}
					} // publish step
				} // timeout
			} // ansiColor
		} //nodejs
	} // node
} // timestamps
