import autobind from 'autobind-decorator';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import which from 'which';

export const isWindows = process.platform === 'win32';
export const exe = isWindows ? '.exe' : '';
export const cmd = isWindows ? '.cmd' : '';
export const bat = isWindows ? '.bat' : '';
export const searchPaths = (function () {
	if (isWindows) {
		return ['%SystemDrive%', '%ProgramFiles%', '%ProgramFiles(x86)%', '%ProgramW6432%'];
	}

	let searchDirs = ['/opt', '/opt/local', '/usr', '/usr/local', '~'];
	if (process.platform === 'darwin') {
		searchDirs.push('/Applications', '~/Applications', '~/Library');
	}
	return searchDirs;
}());

const cacheStore = {};
const homeDirRegExp = /^~([\\|/].*)?$/;
const winEnvVarRegExp = /(%([^%]*)%)/g;

/**
 * Wraps `which()` with a promise.
 *
 * @param {String} executable - The executable to find.
 * @returns {Promise}
 */
export function findExecutable(executable) {
	return new Promise((resolve, reject) => {
		which(executable, (err, file) => {
			if (err) {
				reject(err);
			} else {
				resolve(file);
			}
		});
	});
}

/**
 * Resolves a path into an absolute path.
 *
 * @param {...String} segments - The path segments to join and resolve.
 * @returns {String}
 */
export function expandPath(...segments) {
	segments[0] = segments[0].replace(homeDirRegExp, (process.env.HOME || process.env.USERPROFILE) + '$1');
	if (process.platform === 'win32') {
		return path.resolve(path.join.apply(null, segments).replace(winEnvVarRegExp, (s, m, n) => {
			return process.env[n] || m;
		}));
	}
	return path.resolve.apply(null, segments);
}

/**
 * Runs a specified command and returns the result.
 *
 * @param {String} cmd - The command to run.
 * @param {Array} [args] - An array of arguments to pass into the command.
 * @returns {Promise}
 */
export function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args);
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', data => {
			stdout += data.toString();
		});

		child.stderr.on('data', data => {
			stderr += data.toString();
		});

		child.on('close', code => resolve({ code, stdout, stderr }));
	});
}

/**
 * Determines if a file or directory exists.
 *
 * @param {String} file - The full path to check if exists.
 * @returns {Boolean}
 */
export function existsSync(file) {
	try {
		fs.statSync(file);
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * Scan the directory for a specified file.
 *
 * @param {String} parent - The directory to start searching from.
 * @param {String} pattern - The name of the file to look for.
 * @param {Number} depth - Optional search depth, default 1 level.
 * @returns {String}
 */
export function scan(parent, pattern, depth) {
	try {
		const files = fs.readdirSync(parent);
		for (const name of files) {
			const file = path.join(parent, name);
			const stat = fs.statSync(file);
			let result;
			if (stat.isFile() && name === pattern) {
				return file;
			} else if (stat.isDirectory()) {
				if (depth === undefined) {
					result = scan(file, pattern);
				} else if (depth > 0){
					result = scan(file, pattern, depth - 1);
				}

				if (result) {
					return result;
				}
			}
		}
	} catch (err) {
		// skip
	}
}

/**
 * Helper function that handles the caching of a value and multiple requests.
 *
 * @param {String} name - The name of the module caching values.
 * @param {Boolean} bypassCache - When true, bypasses the cache and runs the
 * function.
 * @param {Function} fn - A function to call if value is not cached.
 * @returns {Promise}
 */
export function cache(name, bypassCache, fn) {
	const entry = cacheStore[name] || (cacheStore[name] = {
		pending: false,
		requests: [],
		value: null
	});

	if (entry && entry.value && !bypassCache) {
		return Promise.resolve(entry.value);
	}

	if (entry.pending) {
		return new Promise(resolve => {
			entry.requests.push(resolve);
		});
	}

	entry.pending = true;

	return fn().then(value => {
		entry.pending = false;
		entry.value = value;

		for (const resolve of entry.requests) {
			resolve(value);
		}
		entry.requests = [];

		return value;
	});
}

/**
 * Watches multiple directories for changes. Multiple Watcher instances share the same
 */
export class Watcher extends EventEmitter {
	/**
	 * A global map of paths to chokidar FSWatcher instances.
	 * @type {Object}
	 */
	static handles = {};

	/**
	 * Map of paths to wrapped listeners. Used during stop to remove listeners.
	 * @type {Object}
	 */
	wrappers = null;

	/**
	 * Internal flag to make sure we don't stop multiple times.
	 * @type {Boolean}
	 */
	stopped = false;

	/**
	 * Constructs the watcher.
	 *
	 * @param {Object} opts - Options to pass into chokidar.
	 * @param {Array} opts.searchPaths - An array of full-resolved paths to watch.
	 * @param {Function} [transform] - A function to transform an event.
	 */
	constructor(opts, transform) {
		super();

		if (typeof opts !== 'object' || opts === null) {
			throw new TypeError('Expected opts to be an object');
		}

		if (!Array.isArray(opts.searchPaths)) {
			throw new TypeError('Expected search paths to be an array');
		}

		this.opts = opts;
		this.transform = typeof transform === 'function' ? transform : null;
	}

	/**
	 * Starts watching for changes.
	 *
	 * @param {Function} listener - A function to call when changes are detected.
	 * @returns {Promise}
	 * @access public
	 */
	listen(listener) {
		if (this.stopped) {
			throw new Error('This watcher has been stopped');
		}

		if (typeof listener !== 'function') {
			throw new TypeError('Expected listener to be a function');
		}

		if (this.wrappers) {
			throw new Error('Expected listen() to only be called once');
		}
		this.wrappers = {};

		return Promise.all(this.opts.searchPaths.map(originalPath => new Promise((resolve, reject) => {
			let timer;

			// declare our wrapper that wraps the listener and store a reference
			// so we can remove it if we stop watching
			const wrapper = this.wrappers[originalPath] = (evt, path, details) => {
				if (!existsSync(originalPath) || path.indexOf(fs.realpathSync(originalPath)) === 0) {
					clearTimeout(timer);
					timer = setTimeout(() => {
						const info = { originalPath, evt, path, details };
						if (this.transform) {
							this.transform(listener, info);
						} else {
							listener(info);
						}
					}, this.opts.wait || 1000);
				}
			};

			const ready = () => {
				handle.listenerCount++;
				this.emit('ready', listener);
				handle.on('raw', wrapper);
				resolve(this);
			};

			let handle = Watcher.handles[originalPath];
			if (handle) {
				// we're already watching this path
				ready();
			} else {
				// start watching this path
				handle = Watcher.handles[originalPath] = chokidar.watch(originalPath, this.opts);
				handle.listenerCount = 0;
				handle.on('ready', ready);
			}
		})));
	}

	/**
	 * Stops watching and emitting filesystem changes to the search paths
	 * specified during construction.
	 *
	 * @access public
	 */
	@autobind
	stop() {
		if (this.stopped) {
			return;
		}
		this.stopped = true;

		for (const path of Object.keys(this.wrappers)) {
			const handle = Watcher.handles[path];
			if (handle) {
				handle.removeListener('raw', this.wrappers[path]);
				delete this.wrappers[path];

				if (--handle.listenerCount <= 0) {
					handle.close();
					delete Watcher.handles[path];
				}
			}
		}
	}
}
