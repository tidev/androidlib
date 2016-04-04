import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import which from 'which';
import * as net from 'net';

export const isWindows = process.platform === 'win32';
export const exe = isWindows ? '.exe' : '';
export const cmd = isWindows ? '.cmd' : '';
export const bat = isWindows ? '.bat' : '';

const homeDirRegExp = /^(~)([\\/].*)?$/;
const winEnvVarRegExp = /(%([^%]*)%)/g;

/**
 * Returns a list of search directory according to platform.
 *
 * @returns {String}
 */
export function getSearchPaths() {
	let searchDirs;

	if (isWindows) {
		searchDirs = ['%SystemDrive%', '%ProgramFiles%', '%ProgramFiles(x86)%', '%ProgramW6432%'];
	} else {
		searchDirs = ['/Applications', '/opt', '/opt/local', '/usr', '/usr/local'];
	}

	return searchDirs;
}

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
	if (isWindows) {
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
