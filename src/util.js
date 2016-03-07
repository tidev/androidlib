import 'babel-polyfill';
import 'source-map-support/register';
import { spawn } from 'child_process';
import path from 'path';
import which from 'which';
import * as net from 'net';

export const isWindows = process.platform === 'win32';
export const homeRegExp = /^(~)([\\/].*)?$/;
export const winEnvVarRegExp = /(%([^%]*)%)/g;
export const exe = isWindows ? '.exe' : '';
export const cmd = isWindows ? '.cmd' : '';
export const bat = isWindows ? '.bat' : '';
export const ndkBuild = 'ndk-build' + cmd;

/**
 * Returns a list of search directory according to platform
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
		which(executable, function (err, file) {
			if (err) {
				reject(err);
			} else {
				resolve(file);
			}
		});
	});
}

/**
 * Resolves the specified directory.
 *
 * @param {String} dir - The directory path to resolve.
 * @returns {String}
 */
export function resolveDir(dir) {
	return path.resolve(
		dir.replace(homeRegExp, (match, tilde, dir) => {
			return process.env[isWindows ? 'USERPROFILE' : 'HOME'] + (dir || path.sep);
		})
		.replace(winEnvVarRegExp, (match, token, name) => {
			return isWindows && process.env[name] || token;
		}));
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


export function findport(p) {
	return new Promise((resolve, reject) => {
		let socket = net.connect({ port: p }, function () {
			socket.end();
			console.log('[PORT TAKEN] : ', p);
			resolve();
		});

		socket.on('end', function (err) {
			if (socket) {
				socket.end();
				socket = null;
			}
		});

		socket.on('error', function (err) {
			// port available!
			if ('ECONNREFUSED' === err.errno) {
				if (socket) {
					socket.end();
					socket = null;
				}
				console.log('[PORT FOUND] : ', p);
				resolve(p);
			}
		});
	});
}
