import fs from 'fs';

import { isFile } from 'appcd-fs';

/**
 * Cached regex for matching key/values in properties files.
 * @type {RegExp}
 */
const pkgPropRegExp = /^([^=]*)=\s*(.+)$/;

/**
 * Reads and parses the specified properties file into an object.
 *
 * @param {String} file - The properties file to parse.
 * @returns {Object?}
 * @access private
 */
export function readPropertiesFile(file) {
	if (!isFile(file)) {
		return null;
	}

	const props = {};
	for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
		const m = line.match(pkgPropRegExp);
		if (m) {
			props[m[1].trim()] = m[2].trim();
		}
	}
	return props;
}
