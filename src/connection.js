import { EventEmitter } from 'events';
import * as net from 'net';

/**
 * Keeps track of the number of active connections for debugging purposes.
 */
let connCounter = 0;

/**
 * Initial state. Also set if a command fails or the connection is closed.
 */
const DO_NOTHING = 0;

/**
 * After a command is executed, this will wait for the OKAY/FAIL response.
 */
const WAIT_FOR_COMMAND_RESULT = 1;

/**
 * After a command executes and we have received the OKAY/FAIL, then we process
 * whatever data is left. Certain commands, such as track-devices, keep sending
 * more data that begins with the length of data expected.
 */
const WAIT_FOR_NEW_DATA = 2;

/**
 * After a command is executed, this will wait for additional data until the
 * connection is closed. This is for "adb shell" commands where the exact
 * output length is unknown.
 */
const BUFFER_UNTIL_CLOSE = 3;

/**
 * After a command is executed, this will keep the connection open and emit additional
 * data when available. This is for "host:track-devices" commands where connection is
 * not closed.
 */
const KEEP_CONNECTION = 4;

/**
 * Manages the connection and communcations with the ADB server.
 *
 * @extends {EventEmitter} Emits events `debug`, `end` and `error`.
 */
export default class Connection extends EventEmitter {
	/**
	 * Creates a connection object.
	 *
	 * @param {ADB} adb - The ADB instance.
	 */
	constructor(adb) {
		super();
		this.adb = adb;
		this.port = adb && adb.opts && adb.opts.port || 5037;
		this.socket = null;
		this.state = DO_NOTHING;
		this.connNum = ++connCounter;
	}

	/**
	 * Executes a command. If there is no connection to the ADB server, it will
	 * connect to it, then run the command.
	 *
	 * @param {String} cmd - The command to run.
	 * @param {Object} [opts] - Execute options.
	 * @param {Boolean} [opts.bufferUntilClose=false] - Buffers all received data until ADB closes the connection.
	 * @returns {Promise}
	 * @access public
	 */
	exec(cmd, opts = {}) {
		if (typeof cmd !== 'string' || !cmd) {
			return Promise.reject(new TypeError('Expected command to be a string.'));
		}

		return new Promise((resolve, reject) => {
			let doSend = !!this.socket;
			let buffer = null;
			let len = null;
			let send = () => {
				this.emit('debug', `[${this.connNum}] SENDING ${cmd}`);
				this.state = WAIT_FOR_COMMAND_RESULT;
				buffer = null;
				this.socket.write(('0000' + cmd.length.toString(16)).substr(-4).toUpperCase() + cmd);
			};

			if (!this.socket) {
				this.socket = net.connect({
					port: this.port
				}, () => {
					this.emit('debug', `[${this.connNum}] CONNECTED`);
					send();
				});

				this.socket.setKeepAlive(true);
				this.socket.setNoDelay(true);
			} else {
				this.emit('debug', `[${this.connNum}] SOCKET ALREADY OPEN, RE-LISTENING AND SENDING NEW COMMAND "${cmd}"`);
				this.socket.removeAllListeners('data');
				this.socket.removeAllListeners('end');
				this.socket.removeAllListeners('error');
			}

			this.socket.on('data', data => {
				this.emit('debug', `[${this.connNum}] RECEIVED ${data.length} BYTES (state=${this.state}) (cmd=${cmd})`);
				this.emit('debug', data);
				this.emit('debug', `[${this.connNum}] RECEIVED ${ data && data.toString()} BYTES (state=${this.state}) (cmd=${cmd})`);

				if (this.state === DO_NOTHING) return;

				if (!buffer || buffer.length === 0) {
					buffer = data;
				} else {
					buffer += data;
				}

				this.emit('debug', `[${this.connNum}] BUFFER LENGTH = ${buffer.length}`);

				while (true) {
					let result;
					switch (this.state) {
						case WAIT_FOR_COMMAND_RESULT:
							result = buffer.slice(0, 4).toString();
							this.emit('debug', `[${this.connNum}] RESULT "${result}"`);
							if (!/^OKAY|FAIL$/.test(result)) {
								return reject(new Error(`Unknown adb result "${result}"`));
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
								this.emit('debug', `[${this.connNum}] ERROR! ${buffer.toString()}`);
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
									this.emit('debug', `[${this.connNum}] DONE, SETTING STATE TO BUFFER_UNTIL_CLOSE`);
									this.state = BUFFER_UNTIL_CLOSE;
								} else {
									this.emit('debug', `[${this.connNum}] DONE, SETTING STATE TO DO_NOTHING`);
									this.state = DO_NOTHING;
									resolve();
								}
								return;
							}

							// if we aren't expecting the data to have a length (i.e. the shell command),
							// then buffer immediately
							if (opts.noLength) {
								this.emit('debug', `[${this.connNum}] PUSHING REMAINING DATA INTO BUFFER AND SETTING STATE TO BUFFER_UNTIL_CLOSE`);
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
								this.emit('debug', `[${this.connNum}] DETERMINING EXPECTED LENGTH...`);
								isNaN(len) && (len = null);
								buffer = buffer.slice(4);
							}

							if (opts.keepConnection) {
								this.emit('debug', `[${this.connNum}] SETTING STATE TO KEEP_CONNECTION`);
								this.state = KEEP_CONNECTION;
								this.emit('data', buffer);
								buffer = null;
								return;
							}

							// if there's no length, then let's fire the callback or wait until the socket closes
							if (len === 0) {
								this.emit('debug', `[${this.connNum}] NO EXPECTED LENGTH, RESOLVE`);
								buffer = null;
								len = null;
								this.end();
								return resolve();
							} else if (len === null) {
								this.emit('debug', `[${this.connNum}] NO EXPECTED LENGTH`);
								if (opts.bufferUntilClose) {
									this.emit('debug', `[${this.connNum}] BUFFERING DATA UNTIL SOCKET CLOSE`);
									this.state = BUFFER_UNTIL_CLOSE;
								} else  {
									buffer = null;
									len = null;
									this.state = WAIT_FOR_NEW_DATA;
									this.end();
									resolve();
								}
								return;
							}

							this.emit('debug', `[${this.connNum}] EXPECTED LENGTH = ${len}`);
							this.emit('debug', `[${this.connNum}] BUFFER LENGTH = ${buffer.length}`);

							// do we have enough bytes?
							if (buffer.length >= len) {
								// yup
								result = buffer.slice(0, len);
								buffer = buffer.slice(len);
								this.emit('debug', `[${this.connNum}] SUCCESS AND JUST THE RIGHT AMOUNT OF BYTES (${len}) WITH ${buffer.length} BYTES LEFT`);
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
								this.emit('debug', `[${this.connNum}] WAITING FOR MORE DATA`);
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
				this.emit('debug', `[${this.connNum}] SOCKET CLOSED BY SERVER, (${buffer} && ${buffer && buffer.length})`);
				this.end();

				if (buffer && buffer.length) {
					resolve(buffer);
					buffer = null;
				} else {
					//handle the case when state is BUFFER_UNTIL_CLOSE and buffer is empty
					// i.e shell am force-stop
					resolve();
				}
			});

			this.socket.on('error', err => {
				this.end();

				if (!err.errno || err.errno !== 'ECONNREFUSED') {
					this.emit('debug', `[${this.connNum}] SOCKET error, (${err})`);
					return reject(err);
				}

				this.emit('debug', `[${this.connNum}] Restart ADB`);
				this.adb.startServer()
					.then(({ code, stdout, stderr }) => {
						if (!code) {
							return this
								.exec(cmd, opts)
								.then(data => resolve(data));
						}
						reject(new Error(`Unable to start Android Debug Bridge server (exit code ${code})`));
					});
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
				this.emit('end', `[${this.connNum}] SOCKET CLOSED`);
				this.socket.end();
			} catch (ex) {
				this.emit('end', `[${this.connNum}] EXCEPTION ON CLOSE ${ex}`);
			}
			this.socket = null;
		}
		this.state = DO_NOTHING;
	}
}
