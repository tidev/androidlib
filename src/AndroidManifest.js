import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { DOMParser } from 'xmldom';

import * as util from './util';

const androidAttrPrefixRegExp = /^android\:/;
const defaultDOMParserArgs = { errorHandler: function(){} };

const tags = {
	// according to http://developer.android.com/guide/topics/manifest/meta-data-element.html,
	// <meta-data> is not intended to be a direct descendent of <application> but it is required
	// that we support it so that we can pass a Google Maps API key to their library
	'application': /^(activity|activity-alias|meta-data|provider|receiver|service|uses\-library)$/
};

const tagAttrs = {
	'application': /^(allowTaskReparenting|allowBackup|backupAgent|debuggable|description|enabled|hasCode|hardwareAccelerated|icon|killAfterRestore|largeHeap|label|logo|manageSpaceActivity|name|permission|persistent|process|restoreAnyVersion|requiredAccountType|restrictedAccountType|supportsRtl|taskAffinity|testOnly|theme|uiOptions|vmSafeMode)$/,
	'activity': /^(allowTaskReparenting|alwaysRetainTaskState|clearTaskOnLaunch|configChanges|enabled|excludeFromRecents|exported|finishOnTaskLaunch|hardwareAccelerated|icon|label|launchMode|multiprocess|name|noHistory|parentActivityName|permission|process|screenOrientation|stateNotNeeded|taskAffinity|theme|uiOptions|windowSoftInputMode)$/,
	'activity-alias': /^(enabled|exported|icon|label|name|permission|targetActivity)$/,
	'data': /^(host|mimeType|path|pathPattern|pathPrefix|port|scheme)$/,
	'intent-filter': /^(icon|label|priority)$/,
	'meta-data': /^(name|resource|value)$/,
	'path-permission': /^(path|pathPrefix|pathPattern|permission|readPermissions|writePermissions)$/,
	'provider': /^(authorities|enabled|exported|grantUriPermissions|icon|initOrder|label|multiprocess|name|permission|process|readPermission|syncable|writePermission)$/,
	'receiver': /^(enabled|exported|icon|label|name|permission|process)$/,
	'service': /^(enabled|exported|icon|isolatedProcess|label|name|permission|process)$/,
	'uses-library': /^(name|required)$/,
	'uses-sdk': /^(name|required)$/
};


/**
 * Provides methods to process the AndroidManifest.xml file.
 *
 * @class
 * @constructor
 */
export default class AndroidManifest {
	/**
	 * Creates an Android Manifest object.
	 *
	 * @param {String} file - The path of the AndroidManifest.xml file.
	 */
	constructor(file) {
		file = util.expandPath(file);
		if (!util.existsSync(file)) {
			throw new Error('AndroidManifest.xml file does not exist.');
		}

		this.load(file);
	}

	/**
	 * Parses Android Manifest from file.
	 *
	 * @param {String} file - The path of the AndroidManifest.xml file.
	 * @returns {AndroidManifest}
	 * @access public
	 */
	load(file) {
		if (typeof file !== 'string' || !file) {
			throw new TypeError('Expected file to be a string.');
		}

		if (!fs.existsSync(file)) {
			throw new Error('AndroidManifest.xml file does not exist.');
		}

		this.toJS((new DOMParser(defaultDOMParserArgs).parseFromString(fs.readFileSync(file).toString(), 'text/xml')).documentElement);
		return this;
	}

	/**
	 * Parses Android Manifest from string.
	 *
	 * @param {String} str - The content of the manifest.
	 * @returns {AndroidManifest}
	 * @access public
	 */
	parse(str) {
		if (typeof str !== 'string' || !str) {
			throw new TypeError('Expected the content to be a string.');
		}

		this.toJS((new DOMParser(defaultDOMParserArgs).parseFromString(str, 'text/xml')).documentElement);
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
		if (!src) return this;

		if (!(src instanceof AndroidManifest)) {
			throw new Error('Failed to merge, source must be an AndroidManifest object.');
		}

		Object.keys(src).forEach(tag => {
			const tmp = {};
			switch (tag) {
				case '__attr__':
					for (let key of Object.keys(src.__attr__)) {
						this.__attr__[key] = src.__attr__[key];
					}
					break;

				case 'application':
					this[tag] || (this[tag] = {});
					for (let subtag of Object.keys(src[tag])) {
						switch (subtag) {
							case 'activity':
							case 'activity-alias':
							case 'meta-data':
							case 'receiver':
							case 'service':
							case 'provider':
							case 'uses-library':
								this[tag][subtag] || (this[tag][subtag] = {});
								for (let key of Object.keys(src[tag][subtag])) {
									this[tag][subtag][key] = src[tag][subtag][key];
								}
								break;
							default:
								if (tagAttrs.application.test(subtag)) {
									this[tag][subtag] = src[tag][subtag];
								}
						}
					}
					break;

				case 'compatible-screens':
					Array.isArray(this[tag]) || (this[tag] = []);
					for (let s of this[tag]) {
						tmp[s.screenSize + '|' + s.screenDensity] = 1;
					}

					for (let s of src[tag]) {
						const n = s.screenSize + '|' + s.screenDensity;
						if (!tmp[n]) {
							tmp[n] = 1;
							this[tag].push(s);
						}
					}
					break;

				case 'instrumentation':
				case 'permission':
				case 'permission-group':
				case 'permission-tree':
				case 'uses-feature':
				case 'uses-library':
					this[tag] || (this[tag] = {});
					for (let name of Object.keys(src[tag])) {
						this[tag][name] = src[tag][name];
					}
					break;

				case 'supports-screens':
				case 'uses-sdk':
					this[tag] || (this[tag] = {});
					for (let attr of Object.keys(src[tag])) {
						this[tag][attr] = src[tag][attr];
					}
					break;

				case 'uses-configuration':
					Array.isArray(this[tag]) || (this[tag] = []);
					for (let s of this[tag]) {
						tmp[s.reqFiveWayNav + '|' + s.reqTouchScreen + '|' + s.reqKeyboardType] = 1;
					}

					for (let s of src[tag]) {
						const n = s.reqFiveWayNav + '|' + s.reqTouchScreen + '|' + s.reqKeyboardType;
						if (!tmp[n]) {
							tmp[n] = 1;
							this[tag].push(s);
						}
					}
					break;

				case 'supports-gl-texture':
				case 'uses-permission':
					Array.isArray(this[tag]) || (this[tag] = []);
					for (let s of src[tag]) {
						if (this[tag].indexOf(s) === -1) {
							this[tag].push(s);
						}
					}
					break;
			}
		});

		return this;
	}

	/**
	 * Converts the Android Manifest content into the specified format.
	 *
	 * @param {String} fmt - The file format to be converted to.
	 * @returns {String}
	 * @access public
	 */
	toString(fmt) {
		if (fmt === 'xml') {
			let dom = new DOMParser(defaultDOMParserArgs).parseFromString('<manifest>', 'text/xml');

			dom.create = (tag, attrs, parent) => {
				let node = dom.createElement(tag);
				let i = 0;
				let p = parent;

				if (attrs) {
					for (let attr of Object.keys(attrs)) {
						if (attr === 'nodeValue') {
							node.appendChild(dom.createTextNode(''+attrs[attr]));
						} else {
							attrs[attr] !== undefined && node.setAttribute(attr, ''+attrs[attr]);
						}
					}
				}

				if (p) {
					while (p.parentNode) {
						i++;
						p = p.parentNode;
					}
					parent.appendChild(dom.createTextNode('\r\n' + new Array(i+1).join('\t')));
				}

				parent && parent.appendChild(node);
				return node;
			};

			for (let key of Object.keys(this)) {
				this.toXml(dom, key, this[key]);
			}

			dom.documentElement.appendChild(dom.createTextNode('\r\n'));
			return '<?xml version="1.0" encoding="UTF-8"?>\r\n' + dom.documentElement.toString();

		} else if (fmt === 'pretty-json') {
			return JSON.stringify(this, null, '\t');

		} else if (fmt === 'json') {
			return JSON.stringify(this);
		}

		return Object.prototype.toString.call(this);
	}

	/**
	 * Saves Android Manifest file.
	 *
	 * @param {String} file - The absolute path of the file to be saved.
	 * @returns {AndroidManifest}
	 * @access public
	 */
	save(file) {
		if (typeof file !== 'string' || !file) {
			throw new TypeError('Expected file to be a string.');
		}

		mkdirp.sync(path.dirname(file));
		fs.writeFileSync(file, this.toString('xml'));

		return this;
	}

	/**
	 * Creates and XML node with the specifed node name and value.
	 *
	 * @param {Object} dom - An XMLDocument.
	 * @param {String} name - The node name.
	 * @param {String} value - The node value.
	 * @access private
	 */
	toXml(dom, name, value) {
		const parent = dom.documentElement;
		let node;

		switch (name) {
			case '__attr__':
				for (let attr of Object.keys(value)) {
					parent.setAttribute(attr, value[attr]);
				}
				break;

			case 'application':
				node = dom.create(name, null, parent);
				for (let attr of Object.keys(value)) {
					let tag = attr;
					let children = 0;
					if (tags.application.test(tag)) {
						if (tag === 'provider') {
							for (let name of Object.keys(value[tag])) {
								let providerNode = dom.create(tag, null, node);
								for (let attr of Object.keys(value[tag][name])) {
									let val = value[tag][name][attr];
									if (tagAttrs.provider.test(attr)) {
										providerNode.setAttribute('android:' + attr, val);
									} else if ((attr === 'grant-uri-permission' || attr === 'path-permission') && Array.isArray(val)) {
										val.forEach(perm => {
											var childNode = dom.create(attr, null, providerNode);

											for (let attr of Object.keys(perm)) {
												childNode.setAttribute('android:' + attr, perm[attr]);
											}
											children++;
										});
									} else if (attr === 'meta-data') {
										for (let name of Object.keys(val)) {
											let metaDataNode = dom.create('meta-data', null, providerNode);
											for (let attr of Object.keys(val[name])) {
												if (tagAttrs['meta-data'].test(attr)) {
													metaDataNode.setAttribute('android:' + attr, val[name][attr]);
												}
											}
											children++;
										}
									}
								}
								children && providerNode.appendChild(dom.createTextNode('\r\n' + new Array(3).join('\t')));
							}
						} else if (tag === 'meta-data') {
							for (let name of Object.keys(value['meta-data'])) {
								let metaDataNode = dom.create('meta-data', null, node);
								for (let attr of Object.keys(value['meta-data'][name])) {
									if (tagAttrs['meta-data'].test(attr)) {
										metaDataNode.setAttribute('android:' + attr, value['meta-data'][name][attr]);
									}
								}
								children++;
							}
						} else if (tag === 'uses-library') {
							for (let name of Object.keys(value['uses-library'])) {
								let usesLibraryNode = dom.create('uses-library', null, node);
								for (let attr of Object.keys(value['uses-library'][name])) {
									if (tagAttrs['uses-library'].test(attr)) {
										usesLibraryNode.setAttribute('android:' + attr, value['uses-library'][name][attr]);
									}
								}
							}
						} else {
							// activity, activity-alias, receiver, service
							for (let name of Object.keys(value[tag])) {
								let childNode = dom.create(tag, null, node);
								let children = 0;
								for (let attr of Object.keys(value[tag][name])) {
									let val = value[tag][name][attr];

									if (tagAttrs[tag].test(attr)) {
										if (/^(configChanges|windowSoftInputMode)$/.test(attr) && Array.isArray(val)) {
											val = val.join('|');
										}
										childNode.setAttribute('android:' + attr, val);
									} else if (attr === 'intent-filter' && Array.isArray(val)) {
										for (let intentFilter of val) {
											let intentFilterNode = dom.create('intent-filter', null, childNode);
											for (let attr of Object.keys(intentFilter)) {
												if (tagAttrs['intent-filter'].test(attr)) {
													intentFilterNode.setAttribute('android:' + attr, intentFilter[attr]);
												} else if ((attr === 'action' || attr === 'category') && Array.isArray(intentFilter[attr])) {
													for (let name of intentFilter[attr]) {
														dom.create(attr, { 'android:name': name }, intentFilterNode);
													}
												} else if (attr === 'data' && Array.isArray(intentFilter.data)) {
													for (let obj of intentFilter[attr]) {
														let dataNode = dom.create('data', null, intentFilterNode);
														for (let key of Object.keys(obj)) {
															if (tagAttrs.data.test(key)) {
																dataNode.setAttribute('android:' + key, obj[key]);
															}
														}
													}
												}
											}
											intentFilterNode.appendChild(dom.createTextNode('\r\n' + new Array(4).join('\t')));
											children++;
										}
									} else if (attr === 'meta-data') {
										for (let key of Object.keys(val)) {
											let metaDataNode = dom.create('meta-data', null, childNode);
											for (let attr of Object.keys(val[key])) {
												if (tagAttrs['meta-data'].test(attr)) {
													metaDataNode.setAttribute('android:' + attr, val[key][attr]);
												}
											}
											children++;
										}
									}
								}
								children && childNode.appendChild(dom.createTextNode('\r\n' + new Array(3).join('\t')));
							}
						}

					} else if (tagAttrs.application.test(attr)) {
						node.setAttribute('android:' + attr, value[attr]);
					}
				}
				break;

			case 'compatible-screens':
				node = dom.create(name, null, parent);
				if (Array.isArray(value)) {
					for (let screen of value) {
						let screenNode = dom.create('screen', null, node);
						for (let key of Object.keys(screen)) {
							screenNode.setAttribute('android:' + key, screen[key]);
						}
					}
				}
				break;

			case 'instrumentation':
			case 'permission':
			case 'permission-group':
			case 'permission-tree':
			case 'uses-feature':
				for (let key of Object.keys(value)) {
					let childNode = dom.create(name, null, parent);
					for (let attr of Object.keys(value[key])) {
						childNode.setAttribute('android:' + attr, value[key][attr]);
					}
				}
				break;

			case 'supports-gl-texture':
			case 'uses-permission':
				if (Array.isArray(value)) {
					for (let n of value) {
						dom.create(name, { 'android:name': n }, parent);
					}
				}
				break;

			case 'supports-screens':
			case 'uses-sdk':
				node = dom.create(name, null, parent);
				for (let attr of Object.keys(value)) {
					node.setAttribute('android:' + attr, value[attr]);
				}
				break;

			case 'uses-configuration':
				for (let uses of value) {
					let usesNode = dom.create('uses-configuration', null, parent);
					for (let attr of Object.keys(uses)) {
						usesNode.setAttribute('android:' + attr, uses[attr]);
					}
				}
				break;

			default:
				node = dom.create(name, null, parent);
				node.appendChild(dom.createTextNode(value));
				return;
		}

		if (node) {
			let children = 0;
			this.forEachElement(node, () => {
				children++;
			});
			children && node.appendChild(dom.createTextNode('\r\n' + new Array(2).join('\t')));
		}
	}

	/**
	 * Initialize an object that contains all the attributes of the XML node.
	 *
	 * @param {Object} node - An XML node.
	 * @param {Object} obj - The obj to assign the node attributes to.
	 * @returns {Object}
	 * @access private
	 */
	initAttr(node, obj) {
		this.forEachAttr(node, attr => {
			obj.__attr__ || (obj.__attr__ = {});
			if (attr.name === 'android:versionName') {
				obj.__attr__[attr.name] = attr.value;
			} else {
				obj.__attr__[attr.name] = this.xmlParse(attr.value);
			}
		});
		return obj;
	}

	/**
	 * Convert a XML node to a JS object.
	 *
	 * @param {Object} node - An XML node.
	 * @returns
	 * @access private
	 */
	attrsToObj(node) {
		const a = {};
		this.forEachAttr(node, attr => {
			a[attr.name.replace(androidAttrPrefixRegExp, '')] = this.xmlParse(attr.value);
		});
		return a;
	}

	/**
	 * Initializes an object with the specified node attributes.
	 *
	 * @param {Object} node - An XML node.
	 * @param {Object} obj - The obj to assign the node attributes to.
	 * @returns {Object}
	 * @access private
	 */
	initObjectByName(node, obj) {
		const tmp = obj[node.tagName] || (obj[node.tagName] = {});
		const a = this.attrsToObj(node);
		if (a.name) {
			tmp[a.name] = a;
			return a;
		}
	}

	/**
	 * Convert the Anddrod Manifest XML document a JS object.
	 *
	 * @param {Object} doc -  An XML node.
	 * @access private
	 */
	toJS(doc) {
		this.initAttr(doc, this);

		this.forEachElement(doc, node => {
			let app;
			let it;
			let intentFilter;
			let name;
			let provider;
			let a;
			let tmp;

			switch (node.tagName) {
				case 'application':
					// application object
					app = this[node.tagName] = this.attrsToObj(node);

					this.forEachElement(node, node => {
						switch (node.tagName) {
							case 'activity':
							case 'activity-alias':
							case 'receiver':
							case 'service':
								it = this.initObjectByName(node, app);
								if (it) {
									if (node.tagName === 'activity') {
										it.configChanges && (it.configChanges = it.configChanges.split('|'));
										it.windowSoftInputMode && (it.windowSoftInputMode = it.windowSoftInputMode.split('|'));
									}

									this.forEachElement(node, node => {
										switch (node.tagName) {
											case 'intent-filter':
												Array.isArray(it['intent-filter']) || (it['intent-filter'] = []);
												intentFilter = this.attrsToObj(node);
												it['intent-filter'].push(intentFilter);

												this.forEachElement(node, node => {
													switch (node.tagName) {
														case 'action':
														case 'category':
															Array.isArray(intentFilter[node.tagName]) || (intentFilter[node.tagName] = []);
															name = node.getAttribute('android:name');
															if (name && intentFilter[node.tagName].indexOf(name) === -1) {
																intentFilter[node.tagName].push(name);
															}
															break;

														case 'data':
															Array.isArray(intentFilter[node.tagName]) || (intentFilter[node.tagName] = []);
															intentFilter[node.tagName].push(this.attrsToObj(node));
															break;
													}
												});
												break;

											case 'meta-data':
												Object.prototype.toString.call(it['meta-data']) === '[object Object]' || (it['meta-data'] = {});
												this.initObjectByName(node, it);
												break;
										}
									});
								}
								break;

							case 'meta-data':
								Object.prototype.toString.call(app['meta-data']) === '[object Object]' || (app['meta-data'] = {});
								this.initObjectByName(node, app);
								break;

							case 'provider':
								provider = this.initObjectByName(node, app);
								provider && this.forEachElement(node, node => {
									switch (node.tagName) {
										case 'grant-uri-permission':
										case 'path-permission':
											Array.isArray(provider[node.tagName]) || (provider[node.tagName] = []);
											provider[node.tagName].push(this.attrsToObj(node));
											break;

										case 'meta-data':
											Object.prototype.toString.call(provider['meta-data']) === '[object Object]' || (provider['meta-data'] = {});
											this.initObjectByName(node, provider);
											break;
									}
								});
								break;

							case 'uses-library':
								Object.prototype.toString.call(app['uses-library']) === '[object Object]' || (app['uses-library'] = {});
								a = this.attrsToObj(node);
								a.name && (app['uses-library'][a.name] = a);
								break;
						}
					});
					break;

				case 'compatible-screens':
					// array of screen objects
					tmp = this[node.tagName] || (this[node.tagName] = []);
					this.initAttr(node, tmp);
					this.forEachElement(node, node => {
						node.tagName === 'screen' && tmp.push(this.attrsToObj(node));
					});
					break;

				case 'uses-feature':
					// array of features that if it has a name, must be unique
					tmp = this[node.tagName] || (this[node.tagName] = []);
					a = this.attrsToObj(node);

					// remove old one to prevent dupe
					if (a.name) {
						for (let i = 0; i < tmp.length; i++) {
							if (tmp[i].name && tmp[i].name == a.name) {
								tmp.splice(i--, 1);
							}
						}
					}
					tmp.push(a);
					break;

				case 'instrumentation':
				case 'permission':
				case 'permission-group':
				case 'permission-tree':
				case 'uses-library':
					// object with objects keyed by name
					this.initObjectByName(node, this);
					break;

				case 'supports-screens':
				case 'uses-sdk':
					// single instance tags
					tmp = this[node.tagName] = {};
					this.forEachAttr(node, attr => {
						tmp[attr.name.replace(androidAttrPrefixRegExp, '')] = this.xmlParse(attr.value);
					});
					break;

				case 'uses-configuration':
					// array of objects
					Array.isArray(this[node.tagName]) || (this[node.tagName] = []);
					this[node.tagName].push(this.attrsToObj(node));
					break;

				case 'supports-gl-texture':
				case 'uses-permission':
					// array of names
					a = node.getAttribute('android:name');
					if (a) {
						Array.isArray(this[node.tagName]) || (this[node.tagName] = []);
						this[node.tagName].push(a.replace(androidAttrPrefixRegExp, ''));
					}
					break;
			}
		});
	}

	/**
	 * Loops through all child element nodes for a given XML node skipping all
	 * non-element nodes (i.e. text, comment, etc) and calls the specified function
	 * for each element node found.
	 *
	 * @param {Object} node - An XML node.
	 * @param {Function} fn - The function to call for each element node found.
	 * @access private
	 */
	forEachElement(node, fn) {
		let child = node.firstChild;
		while (child) {
			if (child.nodeType === 1) {
				fn(child);
			}
			child = child.nextSibling;
		}
	}

	/**
	 * Loops through all attributes for a given DOM node and calls a function for
	 * each attribute.
	 *
	 * @param {Object} node - An XML node.
	 * @param {Function} fn - The function to call for each attribute.
	 * @access private
	 */
	forEachAttr(node, fn) {
		for (let i = 0, len = node.attributes.length; i < len; i++) {
			fn(node.attributes.item(i));
		}
	}

	/**
	 * Parses a XML value and converts the value to a JS value if it detects it as a
	 * boolean, null, or a number.
	 *
	 * @param {String} value - The value of the XML node.
	 * @returns {String|Number|Boolean|Null} The parsed value.
	 * @access private
	 */
	xmlParse(value) {
		const num = value && String(value).indexOf('0x') === 0 ? value : Number(value);
		if (value === '' || typeof value !== 'string' || isNaN(num)) {
			value = value === undefined ? '' : value.toString().trim();
			value === 'null' && (value = null);
			value === 'true' && (value = true);
			value === 'false' && (value = false);
			return value;
		}
		return num;
	}

	/**
	 * Gets and parses an attribute of an XML node. If attribute does not exist, it
	 * returns an empty string.
	 *
	 * @param {Object} node - An XML node.
	 * @param {String} attr - The name of the attribute to get.
	 * @returns {String|Number|Boolean|Null} The value of the attribute or empty.
	 *          string if attribute does not exist.
	 * @access private
	 */
	getAttr(node, attr) {
		return node && this.xmlParse(node.getAttribute(attr));
	}

	/**
	 * Determines if the specified XML node has a child data node and returns it.
	 *
	 * @param {Object} node - An XML node.
	 * @returns {String} The value of the XML node.
	 * @access private
	 */
	getValue(node) {
		return node && node.firstChild ? this.xmlParse(node.firstChild.data) : '';
	}
}
