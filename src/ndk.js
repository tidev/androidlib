import fs from 'fs';
import path from 'path';

import { cmd } from 'appcd-subprocess';
import { expandPath } from 'appcd-path';
import { isDir, isFile } from 'appcd-fs';
import { readPropertiesFile } from './util';

/**
 * Directories to scan for Android NDKs.
 * @type {Object}
 */
export const ndkLocations = {
	darwin: [
		'~/Library/Android/sdk/ndk-bundle',
		'~',
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local'
	],
	linux: [
		'~/Android/sdk/ndk-bundle',
		'~',
		'/opt',
		'/opt/local',
		'/usr',
		'/usr/local'
	],
	win32: [
		'%LOCALAPPDATA%\\Android\\Sdk\\ndk-bundle',
		'~',
		'%SystemDrive%',
		'%ProgramFiles%',
		'%ProgramFiles(x86)%',
		'%CommonProgramFiles%'
	]
};

/**
 * A cached regex for matching the NDK architecture.
 * @type {RegExp}
 */
const archRegExp = /\w-x86_64[/\\]/m;

/**
 * A cached regex for matching the NDK release version.
 * @type {RegExp}
 */
const releaseRegExp = /^(r(\d+)([A-Za-z])?)(?:\s+\(([^)]+)\))?$/;

/**
 * A cached regex for matching the NDK version.
 * @type {RegExp}
 */
const versionRegExp = /^(\d+)(?:\.(\d+))?/;

/**
 * Detects and organizes Android NDK information.
 */
export class NDK {
	/**
	 * Checks if the specified directory is an Android NDK.
	 *
	 * @param {String} dir - The directory to check for an Android NDK.
	 * @access public
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = expandPath(dir);
		if (!isDir(dir)) {
			throw new Error('Directory does not exist');
		}

		for (const name of [ 'build', 'platforms' ]) {
			if (!isDir(path.join(dir, name))) {
				throw new Error(`Directory does not contain the "${name}" directory`);
			}
		}

		this.path = dir;
		this.name = path.basename(dir);
		this.version = null;
		this.arch = '32-bit';
		this.executables = {
			'ndk-build': path.join(dir, `ndk-build${cmd}`),
			'ndk-which': path.join(dir, 'ndk-which')
		};

		for (const name of Object.keys(this.executables)) {
			if (!isFile(this.executables[name])) {
				throw new Error(`Directory does not contain the "${name}" executable`);
			}
		}

		// get the archtecture
		if (archRegExp.test(fs.readFileSync(this.executables['ndk-which'], 'utf8'))) {
			this.arch = '64-bit';
		}

		// get the version
		const sourceProps = readPropertiesFile(path.join(dir, 'source.properties'));
		if (sourceProps) {
			this.version = sourceProps['Pkg.Revision'];
			if (this.version) {
				const m = this.version.match(versionRegExp);
				if (m) {
					if (!m[2]) {
						this.version = `${m[1]}.0`;
					}
					this.name = `r${m[1]}${m[2] ? String.fromCharCode('a'.charCodeAt() + ~~m[2]) : ''}`;
				}
			}
		}

		if (!this.version) {
			for (const name of fs.readdirSync(dir)) {
				if (name.toLowerCase() === 'release.txt') {
					const release = fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/).shift().trim();
					// release comes back in the format "r10e (64-bit)", so we need to extract a
					// meaningful version number from that
					const m = release.match(releaseRegExp);
					if (m) {
						this.name = m[1];
						const minor = (m[3] ? m[3].toLowerCase() : 'a').charCodeAt() - 'a'.charCodeAt();
						this.version = `${m[2]}.${minor}`;
						if (m[4] && m[4].toLowerCase() === '64-bit') {
							this.arch = '64-bit';
						}
					}
					break;
				}
			}
		}
	}
}
