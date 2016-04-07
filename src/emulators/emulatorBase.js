import { EventEmitter } from 'events';

import ADB from '../adb';
import * as sdk from '../sdk';
import * as util from '../util';

export default class EmulatorBase extends EventEmitter {

	/**
	 * Checks if the specified emulator has booted.
	 * Emits `message`, `error`, `timeout`,  `exit`, and `started` events.
	 *
	 * @param {Object} emulator - An emulator object.
	 * @param {Object} [opts] - Options for detecting the emulator.
	 * @returns {Promise}
	 * @access private
	 */
	checkBooted(opts = {}) {
		const retryTimeout = 5000;
		const bootTimeout = opts.bootTimeout || 240000;
		let timeTaken = 0;
		const wait = ms => new Promise(res => setTimeout(res, ms));
		const adb = new ADB(opts);
		let emuExisted = false;

		this.on('exit', data => emuExisted = true);

		const isBooted = (adbExe) => {
			if (emuExisted) {
				this.emit('message', `"${this.name}" is closed.`);
				return;
			}

			return wait(retryTimeout)
				.then(() => {
					if (timeTaken > bootTimeout) {
						this.emit('timeout', { type: 'emulator', waited: bootTimeout });
						return Promise.reject();
					}
					timeTaken += retryTimeout;
					this.emit('message', `Waiting for "${this.name}" to boot ...`);

					if (this.id) {
						return util.run(adbExe, ['-s', this.id, 'shell', 'getprop', 'sys.boot_completed']);
					} else {
						return adb
							.devices()
							.then(result => {
								result = result.filter(d => d && d.name === this.name).shift();
								if (result) {
									this.id = result.id;
									return util.run(adbExe, ['-s', result.id, 'shell', 'getprop', 'sys.boot_completed']);
								}
								return isBooted(adbExe);
							});
					}
				})
				.then(({ code, stdout, stderr }) => {
					if (stdout.trim() === '1') {
						this.emit('started', this);
						return;
					}
					return isBooted(adbExe);
				});
		};

		return sdk
			.detect(opts)
			.then(results => results.sdks.shift())
			.then(sdk => isBooted(sdk.executables.adb));
	}

}
