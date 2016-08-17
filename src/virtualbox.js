import appc from 'node-appc';
import debug from 'debug';
import fs from 'fs';
import path from 'path';

const log = debug('androidlib:virtualbox');

const platformPaths = {
	darwin: [
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local',
		'~'
	],
	linux: [
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local',
		'~'
	],
	win32: [
		'%SystemDrive%',
		'%ProgramFiles%',
		'%ProgramFiles(x86)%',
		'~'
	]
};

const engine = new appc.detect.Engine({
	depth:     1,
	exe:       `vboxmanage${appc.subprocess.exe}`,
	multiple:  false,
	checkDir:  checkDir,
	paths:     platformPaths[process.platform],
	registryKeys: {
		root: 'HKLM',
		key: 'Software\\Oracle\\VirtualBox',
		name: 'InstallDir'
	},
	registryPollInterval: 15000
});

/**
 * Resets the internal detection result cache. This is intended for testing
 * purposes.
 *
 * @param {Boolean} [reinit=false] - When true, the detect will re-initialize
 * during the next detect call.
 */
export function resetCache(reinit) {
	engine.cache = {};
	if (reinit) {
		engine.initialized = false;
	}
}

/**
 * VirtualBox information object.
 */
export class VirtualBox extends appc.gawk.GawkObject {
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = appc.path.expand(dir);
		if (!appc.fs.isDir(dir)) {
			throw new Error('Directory does not exist or is actually a file');
		}

		const vboxmanage = path.join(dir, `vboxmanage${appc.subprocess.exe}`);
		if (!appc.fs.isFile(vboxmanage)) {
			throw new Error('Directory does not contain vboxmanage executable');
		}

		super({
			path:       dir,
			executables: {
				vboxmanage,
			},
			version:    null
		});
	}

	/**
	 * Fetches the VirtualBox version.
	 *
	 * @returns {Promise}
	 */
	init() {
		return appc.subprocess.run(this.get(['executables', 'vboxmanage']).toJS(), ['-version'])
			.then(({ stdout }) => {
				this.set('version', stdout.split('\n')[0].trim());
				return this;
			})
			.catch(err => {
				log('Failed to get VirtualBox version:', err);
				return Promise.resolve();
			});
	}
}

/**
 * Detects installed VirtualBox.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - When true, bypasses cache and
 * re-detects the Android NDKs.
 * @param {Boolan} [opts.gawk] - If true, returns the raw internal GawkArray,
 * otherwise returns a JavaScript array.
 * @param {Array} [opts.paths] - One or more paths to known Android NDKs.
 * @returns {Promise} Resolves an array or GawkArray containing the values.
 */
export function detect(opts = {}) {
	return new Promise((resolve, reject) => {
		engine
			.detect(opts)
			.on('results', resolve)
			.on('error', reject);
	});
}

/**
 * Detects installed VirtualBox and watches for changes.
 *
 * @param {Object} [opts] - An object with various params.
 * @param {Boolean} [opts.force=false] - When true, bypasses cache and
 * re-detects the Android NDKs.
 * @param {Boolan} [opts.gawk] - If true, returns the raw internal GawkArray,
 * otherwise returns a JavaScript array.
 * @param {Array} [opts.paths] - One or more paths to known Android NDKs.
 * @returns {Handle}
 */
export function watch(opts = {}) {
	opts.watch = true;
	opts.redetect = true;
	return engine
		.detect(opts);
}

/**
 * Determines if the specified directory contains a Android SDK and if so,
 * returns the SDK info.
 *
 * @param {String} dir - The directory to check.
 * @returns {Promise}
 */
function checkDir(dir) {
	return Promise.resolve()
		.then(() => new VirtualBox(dir))
		.then(vbox => vbox.init())
		.catch(err => {
			log('checkDir()', err, dir);
			return Promise.resolve();
		});
}
