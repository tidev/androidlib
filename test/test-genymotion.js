// import _ from 'lodash';
import appc from 'node-appc';
// import del from 'del';
// import fs from 'fs-extra';
// import { GawkNull, GawkObject } from 'gawk';
import androidlib from '../src/index';
import path from 'path';
import temp from 'temp';

const genymotion = androidlib.genymotion;
const exe = appc.subprocess.exe;

// in our tests, we need to wipe the PATH environment variable so that JDKs
// other than our mocks are found, but on Windows, we need to leave
// C:\Windows\System32 in the path so that we can query the Windows registry
const tempPATH = process.platform !== 'win32' ? '' : (function () {
	const windowsDir = appc.path.expand('%SystemRoot%');
	return process.env.PATH
		.split(path.delimiter)
		.filter(p => p.indexOf(windowsDir) === 0)
		.join(path.delimiter);
}());

temp.track();

describe('genymotion', () => {
	beforeEach(function () {
		this.PATH        = process.env.PATH;
		process.env.PATH = tempPATH;
		this.watcher     = null;
	});

	afterEach(function () {
		process.env.PATH = this.PATH;
		this.watcher && this.watcher.stop();
		genymotion.resetCache();
	});

	describe('Genymotion', () => {
		it('should throw error if dir is not a string', () => {
			expect(() => {
				new genymotion.Genymotion();
			}).to.throw(TypeError, 'Expected directory to be a valid string');

			expect(() => {
				new genymotion.Genymotion(123);
			}).to.throw(TypeError, 'Expected directory to be a valid string');
		});

		it('should throw error if directory does not exist', () => {
			expect(() => {
				new genymotion.Genymotion('/does/not/exist');
			}).to.throw(Error, 'Directory does not exist');
		});

		it('should throw error if directory does not contain Genymotion', () => {
			expect(() => {
				new genymotion.Genymotion(path.join(__dirname, 'empty'));
			}).to.throw(Error, 'Directory does not exist');
		});
	});

	describe('detect()', () => {
		it('should detect Genymotion using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			process.env.PATH = this.PATH;

			genymotion
				.detect()
				.then(results => {
					if (results !== null) {
						validateResults(results);
					}

					// one more time
					return genymotion.detect()
						.then(results => {
							if (results !== null) {
								validateResults(results);
							}
							done();
						});
				})
				.catch(done);
		});

		it('should detect Genymotion using a mock', done => {
			const mockDir = path.join(__dirname, 'mocks', 'genymotion', 'good');
			const vboxDir = path.join(__dirname, 'mocks', 'genymotion', 'virtualbox');

			process.env.PATH = vboxDir;

			genymotion
				.detect({
					force: true,
					ignorePlatformPaths: true,
					paths: [
						mockDir,
						'/doesnotexist'
					]
				})
				.then(results => {
					validateResults(results, {
						path: mockDir,
						home: results.home,
						executables: {
							genymotion: path.join(mockDir, `genymotion${exe}`),
							player: process.platform === 'darwin' ? path.join(mockDir, 'player.app', 'Contents', 'MacOS', 'player') : path.join(mockDir, `player${exe}`)
						},
						virtualbox: {
							vboxmanage: path.join(vboxDir, `vboxmanage${exe}`),
							version: '1.2.3r456789'
						}
					});
					done();
				})
				.catch(done);
		});
	});

	describe('watch()', () => {
		it.skip('should watch using defaults', function (done) {
			this.timeout(10000);
			this.slow(5000);

			this.watcher = genymotion
				.watch()
				.on('results', results => {
					try {
						this.watcher.stop();
						if (results !== null) {
							validateResults(results);
						}
						done();
					} catch (e) {
						done(e);
					}
				})
				.on('error', done);
		});
	});
});

function validateResults(results, expected) {
	expect(results).to.be.an.Object;
	expect(results).to.have.keys('path', 'executables', 'home', 'virtualbox');
	expect(results.path).to.be.a.String;
	expect(appc.fs.existsSync(results.path)).to.be.true;
	expect(results.executables).to.be.an.Object;
	expect(results.executables).to.have.keys('genymotion', 'player');
	expect(appc.fs.existsSync(results.executables.genymotion)).to.be.true;
	expect(appc.fs.existsSync(results.executables.player)).to.be.true;
	if (results.home !== null) {
		expect(results.home).to.be.a.String;
		expect(appc.fs.existsSync(results.home)).to.be.true;
	}
	if (results.virtualbox !== null) {
		expect(results.virtualbox).to.be.an.Object;
		expect(results.virtualbox).to.have.keys('vboxmanage', 'version');
		expect(results.virtualbox.vboxmanage).to.be.a.String;
		expect(appc.fs.existsSync(results.virtualbox.vboxmanage)).to.be.true;
		expect(results.virtualbox.version).to.be.a.String;
		expect(results.virtualbox.version).to.not.be.empty;
	}
	if (expected) {
		expect(results).to.deep.equal(expected);
	}
}
