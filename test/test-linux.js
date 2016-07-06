import androidlib from '../src/index';

const _it = process.platform === 'linux' && process.arch === 'x64' ? it : it.skip;

describe('linux', () => {
	describe('detect()', () => {
		it('should detect environment', done => {
			androidlib.linux.detect()
				.then(results => {
					if (process.platform !== 'linux') {
						expect(results).to.be.null;
					} else {
						console.log(results);
					}
					done();
				})
				.catch(done);
		});
	});
});
