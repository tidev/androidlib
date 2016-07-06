import androidlib from '../src/index';
import { DOMParser } from 'xmldom';
import fs from 'fs';
import path from 'path';

const AndroidManifest = androidlib.AndroidManifest;
const mocksPath = path.resolve('./test/mocks/AndroidManifest');

describe('AndroidManifest', () => {
	describe('Constructor', () => {
		it('should create empty object', () => {
			new AndroidManifest();
		});

		it('should error if XML file is not a valid string', () => {
			expect(() => {
				new AndroidManifest(function () {});
			}).to.throw(TypeError, 'Expected file to be a string');

			expect(() => {
				new AndroidManifest('');
			}).to.throw(TypeError, 'Expected file to be a string');
		});

		it('should error if XML file does not exist', () => {
			expect(() => {
				new AndroidManifest(path.resolve('./test/doesnotexist'));
			}).to.throw(Error, 'File does not exist');
		});

		it('should error if XML file is a directory', () => {
			expect(() => {
				new AndroidManifest(path.resolve('./test/mocks/AndroidManifest'));
			}).to.throw(Error, 'Specified file must a file, not be a directory');
		});
	});

	describe('parse()', () => {
		it('should error if content is not a string', () => {
			expect(() => {
				new AndroidManifest().parse(null);
			}).to.throw(TypeError, 'Expected content to be a string');

			expect(() => {
				new AndroidManifest().parse(123);
			}).to.throw(TypeError, 'Expected content to be a string');
		});

		it('should error when parsing bad XML', () => {
			expect(() => {
				new AndroidManifest().parse('foo');
			}).to.throw(Error, 'Invalid XML');
		});

		it('should error when parsing bad XML root', () => {
			expect(() => {
				new AndroidManifest().parse('<?xml version="1.0" encoding="utf-8"?><foo/>');
			}).to.throw(Error, 'Tag name doesn\'t match the schema: manifest != foo');
		});

		it('should parse minimal manifest', () => {
			const am = new AndroidManifest().parse('<?xml version="1.0" encoding="utf-8"?><manifest/>');
			expect(am.manifest).to.be.an.Object;
		});
	});

	describe('Tags', () => {
		const tags = [
			'activity',
			'application',
			'compatible-screens',
			'instrumentation',
			'intent-filter',
			'permission',
			'permission-group',
			'permission-tree',
			'provider',
			'supports-gl-texture',
			'supports-screens',
			'uses-configuration',
			'uses-feature',
			'uses-library',
			'uses-permission',
			'uses-sdk'
		];

		for (const tag of tags) {
			it(`<${tag}>`, () => {
				const am = new AndroidManifest(`${mocksPath}/${tag}.xml`);
				// console.log('\n' + JSON.stringify(scrubObject(am.manifest), null, '\t') + '\n');
				// console.log(am.toString().replace(/\t/g, '  ') + '\n');
				expect(scrubObject(am.manifest)).to.deep.equal(require(`${mocksPath}/${tag}.json`));
				expect(am.toString()).to.equal(fs.readFileSync(`${mocksPath}/${tag}.expected.xml`).toString().trim());
			});
		}
	});

	describe('merge()', () => {
		it('should merge attributes', () => {
			const am = new AndroidManifest(`${mocksPath}/merge-attr-a.xml`);
			const am2 = new AndroidManifest(`${mocksPath}/merge-attr-b.xml`);
			am.merge(am2);
			expect(scrubObject(am.manifest)).to.deep.equal(require(`${mocksPath}/merge-attr.json`));
			expect(am.toString()).to.equal(fs.readFileSync(`${mocksPath}/merge-attr.expected.xml`).toString().trim());
		});

		it('should deep merge', () => {
			const am = new AndroidManifest(`${mocksPath}/merge-deep-a.xml`);
			const am2 = new AndroidManifest(`${mocksPath}/merge-deep-b.xml`);
			const am3 = new AndroidManifest(`${mocksPath}/merge-deep-c.xml`);
			am.merge(am2).merge(am3);
			expect(scrubObject(am.manifest)).to.deep.equal(require(`${mocksPath}/merge-deep.json`));
			expect(am.toString()).to.equal(fs.readFileSync(`${mocksPath}/merge-deep.expected.xml`).toString().trim());
		});

		it('should merge an object', () => {
			const am = new AndroidManifest(`${mocksPath}/merge-object.xml`);
			am.merge({
				'android:versionName': '1.0',
				'application': {
					'android:debuggable': true,
					'uses-library': [
						{ 'android:name': 'foo', 'android:required': true }
					]
				}
			});
			expect(scrubObject(am.manifest)).to.deep.equal(require(`${mocksPath}/merge-object.json`));
			expect(am.toString()).to.equal(fs.readFileSync(`${mocksPath}/merge-object.expected.xml`).toString().trim());
		});

		it('should error if source is not an object', () => {
			expect(() => {
				new AndroidManifest().merge(null);
			}).to.throw(TypeError, 'Expected source to be an AndroidManifest object or plain object');

			expect(() => {
				new AndroidManifest().merge(123);
			}).to.throw(TypeError, 'Expected source to be an AndroidManifest object or plain object');
		});

		it('should fail to merge with unknown tag', () => {
			expect(() => {
				const am = new AndroidManifest(`${mocksPath}/merge-object.xml`);
				am.merge({
					'application': {
						'foo': 'bar'
					}
				});
			}).to.throw(Error, 'Source object contains unknown tag "foo"');
		});
	});
});

function scrubObject(src) {
	const dest = {};
	for (const key of Object.keys(src)) {
		if (src[key] === undefined || src[key] === null) {
			continue;
		} else if (Array.isArray(src[key])) {
			dest[key] = [];
			for (const el of src[key]) {
				if (el !== undefined && el !== null) {
					dest[key].push(typeof el === 'object' ? scrubObject(el) : el);
				}
			}
		} else if (typeof src[key] === 'object') {
			dest[key] = scrubObject(src[key]);
		} else {
			dest[key] = src[key];
		}
	}
	return dest;
}
