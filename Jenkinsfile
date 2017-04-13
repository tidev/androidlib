library 'pipeline-library'

timestamps {
  node('(osx || linux) && android-sdk && android-ndk') {
    def packageVersion = ''
    def isPR = false
    stage('Checkout') {
      checkout scm

      isPR = env.BRANCH_NAME.startsWith('PR-')
      packageVersion = jsonParse(readFile('package.json'))['version']
      currentBuild.displayName = "#${packageVersion}-${currentBuild.number}"
    }

    nodejs(nodeJSInstallationName: 'node 4.7.3') {
      ansiColor('xterm') {
        timeout(10) {
          stage('Build') {
            sh 'npm install'
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
              sh 'killall -9 emulator64-x86'
            }
            junit 'junit_report.xml'
            fingerprint 'package.json'
            // Don't tag PRs
            if (!isPR) {
              pushGitTag(name: packageVersion, message: "See ${env.BUILD_URL} for more information.", force: true)
            }
          } // stage
        } // timeout

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
      } // ansiColor
    } //nodejs
  } // node
} // timestamps
