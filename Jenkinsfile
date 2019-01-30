#! groovy
library 'pipeline-library'
// TODO: Could we make this an array and test across multiple major versions
def nodeVersion = '8.11.4'

def unitTests(os, nodeVersion) {
  return {
    node(os) {
      nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
        stage('Test') {
          timeout(15) {
            unstash 'sources'
            // Install yarn if not installed
            if('windows'.equals(os)) {
              if (bat(returnStatus: true, script: 'where yarn') != 0) {
                bat 'npm install -g yarn'
              }
              bat 'yarn install'
            } else {
              if (sh(returnStatus: true, script: 'which yarn') != 0) {
                sh 'npm install -g yarn'
              }
              sh 'yarn install'
           }
           fingerprint 'package.json'
            try {
              if('windows'.equals(os)) {
                bat 'yarn run coverage'
              } else {
                sh 'yarn run coverage'
              }
            } finally {
              // record results even if tests/coverage 'fails'
              junit 'junit.xml'
            }
          } // timeout
        } // test
      } // nodejs
    }  // node
  }
}

timestamps {
  def isMaster = false
  def packageVersion

  node('osx || linux') {
    stage('Checkout') {
      // checkout scm
      // Hack for JENKINS-37658 - see https://support.cloudbees.com/hc/en-us/articles/226122247-How-to-Customize-Checkout-for-Pipeline-Multibranch
      // do a git clean before checking out
      checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        extensions: scm.extensions + [[$class: 'CleanBeforeCheckout']],
        userRemoteConfigs: scm.userRemoteConfigs
      ])

      isMaster = env.BRANCH_NAME.equals('master')
      packageVersion = jsonParse(readFile('package.json'))['version']
      currentBuild.displayName = "#${packageVersion}-${currentBuild.number}"
      stash allowEmpty: true, name: 'sources', useDefaultExcludes: false
    }
  }

  stage('Test') {
    parallel(
      'Linux unit tests': unitTests('linux', nodeVersion),
      'OSX unit tests': unitTests('osx', nodeVersion),
      'Windows unit tests': unitTests('windows', nodeVersion),
      failFast: false
	)
  } // Test

} // timestamps
