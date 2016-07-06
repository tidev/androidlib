import fs from 'fs';
import path from 'path';

/**
 * A pre-baked map of all paths in the PATH environment variable so we can
 * quickly check if a specific NDK is the default.
 * @type {Object}
 */
export const systemPaths = {};

for (let p of process.env.PATH.split(path.delimiter)) {
	try {
		if (p = fs.realpathSync(p)) {
			systemPaths[p] = 1;
		}
	} catch (e) {
		// squeltch
	}
}
