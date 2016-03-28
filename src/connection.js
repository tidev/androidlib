import { EventEmitter } from 'events';
import * as net from 'net';

let connCounter = 0;

/**
 * @constant
 * Initial state. Also set if a command fails or the connection is closed.
 */
const DO_NOTHING = 0;

/**
 * @constant
 * After a command is executed, this will wait for the OKAY/FAIL response.
 */
const WAIT_FOR_COMMAND_RESULT = 1;

/**
 * @constant
 * After a command executes and we have received the OKAY/FAIL, then we process
 * whatever data is left. Certain commands, such as track-devices, keep sending
 * more data that begins with the length of data expected.
 */
const WAIT_FOR_NEW_DATA = 2;

/**
 * @constant
 * After a command is executed, this will wait for additional data until the
 * connection is closed. This is for "adb shell" commands where the exact
 * output length is unknown.
 */
const BUFFER_UNTIL_CLOSE = 3;

/**
 * Creates an Connection instance.
 *
 * @class
 * @extends EventEmitter
 * @classdesc Manages the connection and communcations with the ADB server.
 * @constructor
 * @param {ADB} adb - The ADB instance.
 */
export class Connection extends EventEmitter {
	constructor(adb) {
		super();
		this.adb = adb;
		this.port = adb && adb.opts && adb.opts.port || 5037;
		this.socket = null;
		this.state = DO_NOTHING;
		this.connNum = ++connCounter;
		this.dataEventName = 'data';
		this.endEventName = 'end';
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

		const dataEventName = this.dataEventName;
		return new Promise((resolve, reject) => {
			let conn = this;
			let socket = this.socket;
			let doSend = !!socket;
			let buffer = null;
			let len = null;
			let send = () => {
				this.emit(dataEventName, `[${conn.connNum}] SENDING ${cmd}`);
				conn.state = WAIT_FOR_COMMAND_RESULT;
				buffer = null;
				socket.write(('0000' + cmd.length.toString(16)).substr(-4).toUpperCase() + cmd);
			};

			this.opts = opts || {};
			if (!socket) {
				socket = this.socket = net.connect({
					port: this.port
				}, () => {
					this.emit(dataEventName, `[${conn.connNum}] CONNECTED`);
					send();
				});

				socket.setKeepAlive(true);
				socket.setNoDelay(true);
			} else {
				this.emit(dataEventName, `[${conn.connNum}] SOCKET ALREADY OPEN, RE-LISTENING AND SENDING NEW COMMAND "${cmd}"`);
				socket.removeAllListeners('data');
				socket.removeAllListeners('end');
				socket.removeAllListeners('error');
			}

			socket.on('data', data => {
				this.emit(dataEventName, `[${conn.connNum}] RECEIVED ${data.length} BYTES (state=${this.state}) (cmd=${cmd})`);
				if (this.state === DO_NOTHING) return;

				if (!buffer || buffer.length === 0) {
					buffer = data;
				} else {
					buffer += data;
				}

				this.emit(dataEventName, `[${conn.connNum}] BUFFER LENGTH = ${buffer.length}`);

				const forever = 1;
				while (forever) {
					let result;
					switch (this.state) {
						case WAIT_FOR_COMMAND_RESULT:
							result = buffer.slice(0, 4).toString();
							this.emit(dataEventName, `[${conn.connNum}] RESULT ${result}`);
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
								this.emit(dataEventName, `[${conn.connNum}] ERROR! ${buffer.toString()}`);
								this.state = DO_NOTHING;

								// copy the buffer into an error so we can free up the buffer
								let err = new Error(buffer.toString());
								buffer = null;
								conn.end();
								return reject(err);
							}

							// if there's no more data, then we're done
							if (buffer.length === 0) {
								if (this.opts.bufferUntilClose) {
									this.emit(dataEventName, `[${conn.connNum}] DONE, SETTING STATE TO BUFFER_UNTIL_CLOSE`);
									this.state = BUFFER_UNTIL_CLOSE;
								} else {
									this.emit(dataEventName, `[${conn.connNum}] DONE, SETTING STATE TO DO_NOTHING`);
									this.state = DO_NOTHING;
									resolve();
								}
								return;
							}

							// if we aren't expecting the data to have a length (i.e. the shell command),
							// then buffer immediately
							if (this.opts.noLength) {
								this.emit(dataEventName, `[${conn.connNum}] PUSHING REMAINING DATA INTO BUFFER AND SETTING STATE TO BUFFER_UNTIL_CLOSE`);
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
								this.emit(dataEventName, `[${conn.connNum}] DETERMINING EXPECTED LENGTH...`);
								isNaN(len) && (len = null);
								buffer = buffer.slice(4);
							}

							// if there's no length, then let's fire the callback or wait until the socket closes
							if (len === 0) {
								this.emit(dataEventName, `[${conn.connNum}] NO EXPECTED LENGTH, FIRING CALLBACK`);
								buffer = null;
								len = null;
								return resolve();
							} else if (len === null) {
								this.emit(dataEventName, `[${conn.connNum}] NO EXPECTED LENGTH`);
								if (this.opts.bufferUntilClose) {
									this.emit(dataEventName, `[${conn.connNum}] BUFFERING DATA UNTIL SOCKET CLOSE`);
									this.state = BUFFER_UNTIL_CLOSE;
								} else  {
									buffer = null;
									len = null;
									this.state = WAIT_FOR_NEW_DATA;
									resolve();
								}
								return;
							}

							this.emit(dataEventName, `[${conn.connNum}] EXPECTED LENGTH = ${len}`);
							this.emit(dataEventName, `[${conn.connNum}] BUFFER LENGTH = ${buffer.length}`);

							// do we have enough bytes?
							if (buffer.length >= len) {
								// yup
								let result = buffer.slice(0, len);
								buffer = buffer.slice(len);
								this.emit(dataEventName, `[${conn.connNum}] SUCCESS AND JUST THE RIGHT AMOUNT OF BYTES (${len}) WITH ${buffer.length} BYTES LEFT`);
								if (this.opts.bufferUntilClose) {
									this.state = BUFFER_UNTIL_CLOSE;
								} else {
									this.state = WAIT_FOR_NEW_DATA;
									len = null;
									buffer = null;
									resolve(result);
								}
							} else {
								// we need more data!
								this.emit(dataEventName, `[${conn.connNum}] WAITING FOR MORE DATA`);
							}
							return;

						case BUFFER_UNTIL_CLOSE:
							// we've already added data to the buffer
							return;
					}
				}
			});

			socket.on('end', () => {
				this.emit(dataEventName, `[${this.connNum}] SOCKET CLOSED BY SERVER, (${buffer} && ${buffer && buffer.length})`);
				this.end();

				if (buffer && buffer.length) {
					resolve(buffer);
					buffer = null;
				} else {
					resolve();
				}
			});

			socket.on('error', err => {
				this.end();

				if (!err.errno || err.errno != 'ECONNREFUSED') {
					reject(err);
				}

				this.adb.startServer()
					.then(({ code, stdout, stderr }) => {
						if (!code) {
							return this.exec(cmd, this.opts)
								.then(data => {
									resolve(data);
								});
						}
						return reject(new Error(`Unable to start Android Debug Bridge server (exit code ${code})`));
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
				this.emit(this.endEventName, `[${this.connNum}] SOCKET CLOSED`);
				this.socket.end();
			} catch (ex) {
				this.emit(this.endEventName, `[${this.connNum}] EXCEPTION ON CLOSE ${ex}`);
			}
			this.socket = null;
		}
		this.state = DO_NOTHING;
	}
}
