import appc from 'node-appc';
import fs from 'fs';
import path from 'path';
import XMLSchema from 'xml-schema';
import { manifest } from './AndroidManifestSchemas';

const xmlSchema = new XMLSchema(manifest);

/**
 * Provides methods to process the AndroidManifest.xml file.
 */
export default class AndroidManifest {
	/**
	 * Creates an Android Manifest object.
	 *
	 * @param {String} [file] - An optional AndroidManifest.xml file path.
	 */
	constructor(file) {
		this.manifest = {};

		if (file || typeof file === 'string') {
			this.load(file);
		}
	}

	/**
	 * Loads a manifest file and parses it.
	 *
	 * @param {String} file - The path of the AndroidManifest.xml file.
	 * @returns {AndroidManifest}
	 * @access public
	 */
	load(file) {
		if (typeof file !== 'string' || !file) {
			throw new TypeError('Expected file to be a string');
		}

		file = appc.path.expand(file);

		let stat;
		try {
			stat = fs.statSync(file);
		} catch (e) {
			throw new Error('File does not exist');
		}

		if (stat.isDirectory()) {
			throw new Error('Specified file must a file, not be a directory');
		}

		return this.parse(fs.readFileSync(file).toString());
	}

	/**
	 * Parses the manifest from a string.
	 *
	 * @param {String} content - The content of the manifest.
	 * @returns {AndroidManifest}
	 * @access public
	 */
	parse(content) {
		if (typeof content !== 'string' || !content) {
			throw new TypeError('Expected content to be a string');
		}

		try {
			this.manifest = xmlSchema.parse(content);
		} catch (e) {
			throw e instanceof Error ? e : new Error(e);
		}

		return this;
	}

	/**
	 * Merges the source AndroidManifest object into the current AndroidManifest context.
	 *
	 * @param {AndroidManifest} src - The source AndroidManifest object.
	 * @returns {AndroidManifest}
	 * @access public
	 */
	merge(src) {
		if (src instanceof AndroidManifest) {
			src = src.manifest;
		} else if (src === null || typeof src !== 'object' || Array.isArray(src)) {
			throw new TypeError('Expected source to be an AndroidManifest object or plain object');
		}

		(function mix(dest, src, schema) {
			for (const key of Object.keys(src)) {
				if (src[key] === undefined) {
					continue;
				} else if (schema.attributes && schema.attributes[key]) {
					dest[key] = src[key];
				} else if (schema.fields && schema.fields[key]) {
					if (Array.isArray(src[key])) {
						if (!Array.isArray(dest[key])) {
							dest[key] = [];
						}
						for (const el of src[key]) {
							let found = false;
							const name = el['android:name'];
							if (name) {
								for (let i = 0; i < dest[key].length; i++) {
									if (dest[key][i]['android:name'] === name) {
										dest[key][i] = el;
										found = true;
										break;
									}
								}
							}
							if (!found) {
								dest[key].push(el);
							}
						}
					} else if (src[key] !== null && typeof src[key] === 'object') {
						if (dest[key] === null || typeof dest[key] !== 'object' || Array.isArray(dest[key])) {
							dest[key] = {};
						}
						mix(dest[key], src[key], schema.fields[key]);
					} else {
						dest[key] = src[key];
					}
				} else {
					throw new Error(`Source object contains unknown tag "${key}"`);
				}
			}
		}(this.manifest, src, manifest));

		return this;
	}

	/**
	 * Serializes the manifest to a string.
	 *
	 * @returns {String}
	 * @access public
	 */
	toString() {
		return xmlSchema.generate(this.manifest, {
			pretty: true,
			version: '1.0',
			encoding: 'utf-8',
			standalone: null
		});
	}
}
