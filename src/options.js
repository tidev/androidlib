/**
 * A list of options that can be changed by the parent program.
 * @type {Object}
 */
const options = {
	adb: {
		install: {
			timeout: null
		},
		port: null,
		start: {
			retryInterval: null,
			timeout: null
		}
	},
	avd: {
		path: null
	},
	emulator: {
		start: {
			timeout: null
		}
	},
	env: {
		path: null
	},
	executables: {
		adb: null
	},
	ndk: {
		searchPaths: null
	},
	sdk: {
		searchPaths: null
	}
};

export default options;
