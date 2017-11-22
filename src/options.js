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
	},
	genymotion: {
		executables: {
			genymotion: null,
			player: null
		},
		searchPaths: null
	},
	ndk: {
		searchPaths: null
	},
	sdk: {
		searchPaths: null
	},
	virtualbox: {
		configFile: null,
		executables: {
			vboxmanage: null,
		},
		searchPaths: null
	}
};

export default options;
