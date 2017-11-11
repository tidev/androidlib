import appcdLogger from 'appcd-logger';
import net from 'net';

import { EventEmitter } from 'events';

const { log } = appcdLogger('androidlib:connection');

/**
 * Keeps track of the number of active connections for debugging purposes.
 * @type {Number}
 */
let connCounter = 0;

/**
 * Initial state. Also set if a command fails or the connection is closed.
 * @type {Number}
 */
const DO_NOTHING = 0;

/**
 * After a command is executed, this will wait for the OKAY/FAIL response.
 * @type {Number}
 */
const WAIT_FOR_COMMAND_RESULT = 1;

/**
 * After a command executes and we have received the OKAY/FAIL, then we process
 * whatever data is left. Certain commands, such as track-devices, keep sending
 * more data that begins with the length of data expected.
 * @type {Number}
 */
const WAIT_FOR_NEW_DATA = 2;

/**
 * After a command is executed, this will wait for additional data until the
 * connection is closed. This is for "adb shell" commands where the exact
 * output length is unknown.
 * @type {Number}
 */
const BUFFER_UNTIL_CLOSE = 3;

/**
 * After a command is executed, this will keep the connection open and emit additional
 * data when available. This is for "host:track-devices" commands where connection is
 * not closed.
 * @type {Number}
 */
const KEEP_CONNECTION = 4;

/**
 * A map of states to their name.
 * @enum {String}
 */
const states = {
	[DO_NOTHING]:              'DO_NOTHING',
	[WAIT_FOR_COMMAND_RESULT]: 'WAIT_FOR_COMMAND_RESULT',
	[WAIT_FOR_NEW_DATA]:       'WAIT_FOR_NEW_DATA',
	[BUFFER_UNTIL_CLOSE]:      'BUFFER_UNTIL_CLOSE',
	[KEEP_CONNECTION]:         'KEEP_CONNECTION'
};

// https://github.com/appcelerator/node-titanium-sdk/commit/17e9d5729a81eab6c3086bf1369349fcec183108#diff-35f8d6a9705f60d024afaba559bce3ab
// https://github.com/appcelerator/node-titanium-sdk/commit/135d64746c97d0f66c818f7c163fbe14d6f3d983#diff-35f8d6a9705f60d024afaba559bce3ab

/**
 * Manages the connection and communcations with the ADB server.
 */
export default class Connection extends EventEmitter {
	/**
	 * Creates a connection object.
	 *
	 * @param {Number} [port] - The ADB instance.
	 * @access public
	 */
	constructor(port) {
		super();

		if (typeof port !== 'number') {
			throw new TypeError('Expected port to be a number');
		}

		if (port < 1 || port > 65535) {
			throw new Error('Port must be between 1 and 65535');
		}

		this.port = port;
		this.socket = null;
		this.state = DO_NOTHING;
		this.connNum = ++connCounter;
		this.execNum = 0;
	}

	/**
	 * Connects to the ADB server.
	 *
	 * @returns {Promise}
	 */
	connect() {
		return new Promise((resolve, reject) => {
			if (!this.socket) {
				this.socket = net.connect({ port: this.port })
					.on('connect', () => {
						log(`[${this.connNum}] Connected to ADB on port ${this.port}`);

						// in some circumstances sending a command to adb right away can yield no response,
						// so we allow 200ms before sending the initial command
						setTimeout(() => resolve(), 200);
					})
					.on('error', err => {
						this.socket = null;
						reject(err);
					});

				this.socket.setKeepAlive(true);
				this.socket.setNoDelay(true);
			}
		});
	}

	/**
	 * Executes a command. If there is no connection to the ADB server, it will
	 * connect to it, then run the command.
	 *
	 * @param {String} cmd - The command to run.
	 * @param {Object} [opts] - Execute options.
	 * @param {Boolean} [opts.bufferUntilClose=false] - Buffers all received data until ADB closes the connection.
	 * @returns {Promise<Buffer?>}
	 * @access public
	 */
	async exec(cmd, opts = {}) {
		if (typeof cmd !== 'string' || !cmd) {
			throw new TypeError('Expected command to be a string');
		}

		if (!this.socket) {
			await this.connect();
		}

		let buffer = null;
		let len = null;

		const doSend = ++this.execNum;

		log(`[${this.connNum}] [${states[this.state]}] Executing "${cmd}"`, opts);

		if (doSend) {
			log(`[${this.connNum}] [${states[this.state]}] Socket already open, resetting listeners`);
			this.socket.removeAllListeners('data');
			this.socket.removeAllListeners('end');
			this.socket.removeAllListeners('error');
		}

		const send = () => {
			log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Sending command: ${cmd}`);
			this.state = WAIT_FOR_COMMAND_RESULT;
			buffer = null;
			this.socket.write(('0000' + cmd.length.toString(16)).substr(-4).toUpperCase() + cmd);
		};

		return new Promise((resolve, reject) => {
			this.socket.on('data', data => {
				log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Received ${data.length} bytes`);

				if (this.state === DO_NOTHING) {
					return;
				}

				if (!buffer || buffer.length === 0) {
					buffer = data;
				} else {
					buffer += data;
				}

				log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Buffer length = ${buffer.length}`);

				while (true) {
					let result;
					switch (this.state) {
						case WAIT_FOR_COMMAND_RESULT:
							result = buffer.slice(0, 4).toString();
							log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Result: ${result}`);
							if (!/^OKAY|FAIL$/.test(result)) {
								return reject(new Error(`Unknown adb result: ${result}`));
							}
							buffer = buffer.slice(4);

							// did we fail?
							if (result === 'FAIL') {
								len = 0;
								if (buffer.length >= 4) {
									len = parseInt(buffer.slice(0, 4), 16);
									isNaN(len) && (len = 0);
									buffer = buffer.slice(4);
								}
								len && (buffer = buffer.slice(0, len));
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Error: ${buffer.toString()}`);
								this.state = DO_NOTHING;

								// copy the buffer into an error so we can free up the buffer
								let err = new Error(buffer.toString());
								buffer = null;
								this.end();
								return reject(err);
							}

							// if there's no more data, then we're done
							if (buffer.length === 0) {
								if (opts.bufferUntilClose) {
									log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Done, setting state to BUFFER_UNTIL_CLOSE`);
									this.state = BUFFER_UNTIL_CLOSE;
								} else {
									log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Done, setting state to DO_NOTHING`);
									this.state = DO_NOTHING;
									resolve();
								}
								return;
							}

							// if we aren't expecting the data to have a length (i.e. the shell command),
							// then buffer immediately
							if (opts.noLength) {
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Pushing remaining data into buffer and setting state to BUFFER_UNTIL_CLOSE`);
								this.state = BUFFER_UNTIL_CLOSE;
								return;
							}

							this.state = WAIT_FOR_NEW_DATA;
							len = null; // we don't know the length yet
							// purposely fall through

						case WAIT_FOR_NEW_DATA:
							// find how many bytes we are waiting for
							if (len === null && buffer.length >= 4) {
								len = parseInt(buffer.slice(0, 4), 16);
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Determining expected length...`);
								isNaN(len) && (len = null);
								buffer = buffer.slice(4);
							}

							if (opts.keepConnection) {
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Setting state to KEEP_CONNECTION`);
								this.state = KEEP_CONNECTION;
								this.emit('data', buffer);
								buffer = null;
								return;
							}

							// if there's no length, then let's fire the callback or wait until the socket closes
							if (len === 0) {
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] No expected length, resolving`);
								buffer = null;
								len = null;
								this.end();
								return resolve();
							} else if (len === null) {
								if (opts.bufferUntilClose) {
									log(`[${this.connNum}] [${states[this.state]}] [${cmd}] No expected length, buffering data until socket close`);
									this.state = BUFFER_UNTIL_CLOSE;
								} else  {
									log(`[${this.connNum}] [${states[this.state]}] [${cmd}] No expected length, resolving`);
									buffer = null;
									len = null;
									this.state = WAIT_FOR_NEW_DATA;
									this.end();
									resolve();
								}
								return;
							}

							log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Expected length = ${len}`);
							log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Buffer length = ${buffer.length}`);

							// do we have enough bytes?
							if (buffer.length >= len) {
								// yup
								result = buffer.slice(0, len);
								buffer = buffer.slice(len);
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Success, exact bytes (${len}) with ${buffer.length} bytes left`);
								if (opts.bufferUntilClose) {
									this.state = BUFFER_UNTIL_CLOSE;
								} else {
									this.state = WAIT_FOR_NEW_DATA;
									len = null;
									buffer = null;
									this.end();
									resolve(result);
								}
							} else {
								// we need more data!
								log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Waiting for more data`);
							}
							return;

						case BUFFER_UNTIL_CLOSE:
							// we've already added data to the buffer
							return;

						case KEEP_CONNECTION:
							this.emit('data', buffer.slice(4));
							buffer = null;
							return;
					}
				}
			});

			this.socket.on('end', () => {
				log(`[${this.connNum}] [${states[this.state]}] [${cmd}] Socket closed by server, ${buffer ? buffer.length : 0} bytes remaining in buffer`);
				this.end();

				if (buffer && buffer.length) {
					resolve(buffer);
					buffer = null;
				} else {
					// TODO: handle the case when state is BUFFER_UNTIL_CLOSE and buffer is empty
					// i.e shell am force-stop
					resolve();
				}
			});

			this.socket.on('error', err => {
				this.end();
				reject(err);
			});

			doSend && send();
		});
	}

	/**
	 * Closes the connection and resets the socket and state.
	 *
	 * @access public
	 */
	end() {
		if (this.socket) {
			try {
				log(`[${this.connNum}] [${states[this.state]}] Socket closed`);
				this.socket.end();
			} catch (ex) {
				log(`[${this.connNum}] [${states[this.state]}] Exception on close: ${ex}`);
			}
			this.socket = null;
		}
		this.state = DO_NOTHING;
	}
}
