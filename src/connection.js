import 'babel-polyfill';
import 'source-map-support/register';
import * as net from 'net';

let connCounter = 0;

/**
 * Debug flag that is enabled via the android.debugadb setting.
 */
let DEBUG = false;

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

export class Connection {
	constructor(adb, port) {
		this.adb = adb;
		this.port = adb && adb.config && adb.config.get('android.adb.port') || 5037;
		this.socket = null;
		this.state = DO_NOTHING;
		this.connNum = ++connCounter;
	}

	/**
	 * Executes a command. If there is no connection to the ADB server, it will
	 * connect to it, then run the command.
	 * @param {String} cmd - The command to run
	 * @param {Object} [opts] - Execute options
	 * @param {Boolean} [opts.bufferUntilClose=false] - Buffers all received data until ADB closes the connection
	 * @returns {Promise}
	 */
	exec(cmd, opts) {
		return new Promise((resolve, reject) => {
			let conn = this;
			let socket = this.socket;
			let doSend = !!socket;
			let buffer = null;
			let len = null;
			let send = function () {
				DEBUG && console.log('[' + conn.connNum + '] SENDING ' + cmd);
				conn.state = WAIT_FOR_COMMAND_RESULT;
				buffer = null;
				socket.write(('0000' + cmd.length.toString(16)).substr(-4).toUpperCase() + cmd);
			};

			this.opts = opts || {};
			if (!socket) {
				socket = this.socket = net.connect({
					port: this.port
				}, () => {
					DEBUG && console.log('[' + this.connNum + '] CONNECTED');
					send();
				});

				socket.setKeepAlive(true);
				socket.setNoDelay(true);
			} else {
				DEBUG && console.log('[' + this.connNum + '] SOCKET ALREADY OPEN, RE-LISTENING AND SENDING NEW COMMAND "' + cmd + '"');
				socket.removeAllListeners('data');
				socket.removeAllListeners('end');
				socket.removeAllListeners('error');
			}

			socket.on('data', data => {
				DEBUG && console.log('[' + this.connNum + '] RECEIVED ' + data.length + ' BYTES (state=' + this.state + ') (cmd=' + cmd + ')');

				if (this.state === DO_NOTHING) return;

				if (!buffer || buffer.length === 0) {
					buffer = data;
				} else {
					buffer += data;
				}

				DEBUG && console.log('[' + this.connNum + '] BUFFER LENGTH = ' + buffer.length);

				let forever = 1;
				while (forever) {
					switch (this.state) {
						case WAIT_FOR_COMMAND_RESULT:
							var result = buffer.slice(0, 4).toString();
							DEBUG && console.log('[' + this.connNum + '] RESULT ' + result);
							if (!/^OKAY|FAIL$/.test(result)) {
								// callback(new Error(__('Unknown adb result "%s"', result)));
								reject(new Error('Unknown adb result "%s"', result));
								// return;
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
								DEBUG && console.log('[' + this.connNum + '] ERROR! ' + buffer.toString());
								this.state = DO_NOTHING;

								// copy the buffer into an error so we can free up the buffer
								let err = new Error(buffer.toString());
								buffer = null;
								conn.end();
								reject(err);
								return;
							}

							// if there's no more data, then we're done
							if (buffer.length === 0) {
								if (this.opts.bufferUntilClose) {
									DEBUG && console.log('[' + this.connNum + '] DONE, SETTING STATE TO BUFFER_UNTIL_CLOSE');
									this.state = BUFFER_UNTIL_CLOSE;
								} else {
									DEBUG && console.log('[' + this.connNum + '] DONE, SETTING STATE TO DO_NOTHING');
									this.state = DO_NOTHING;
									resolve();
								}
								return;
							}

							// if we aren't expecting the data to have a length (i.e. the shell command),
							// then buffer immediately
							if (this.opts.noLength) {
								DEBUG && console.log('[' + this.connNum + '] PUSHING REMAINING DATA INTO BUFFER AND SETTING STATE TO BUFFER_UNTIL_CLOSE');
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
								DEBUG && console.log('[' + this.connNum + '] DETERMINING EXPECTED LENGTH...');
								isNaN(len) && (len = null);
								buffer = buffer.slice(4);
							}

							// if there's no length, then let's fire the callback or wait until the socket closes
							if (len === 0) {
								DEBUG && console.log('[' + this.connNum + '] NO EXPECTED LENGTH, FIRING CALLBACK');
								buffer = null;
								len = null;
								resolve();
								return;
							} else if (len === null) {
								DEBUG && console.log('[' + this.connNum + '] NO EXPECTED LENGTH');
								if (this.opts.bufferUntilClose) {
									DEBUG && console.log('[' + this.connNum + '] BUFFERING DATA UNTIL SOCKET CLOSE');
									this.state = BUFFER_UNTIL_CLOSE;
								} else  {
									buffer = null;
									len = null;
									this.state = WAIT_FOR_NEW_DATA;
									resolve();
								}
								return;
							}

							DEBUG && console.log('[' + this.connNum + '] EXPECTED LENGTH = ' + len);
							DEBUG && console.log('[' + this.connNum + '] BUFFER LENGTH = ' + buffer.length);

							// do we have enough bytes?
							if (buffer.length >= len) {
								// yup
								let result = buffer.slice(0, len);
								buffer = buffer.slice(len);
								DEBUG && console.log('[' + this.connNum + '] SUCCESS AND JUST THE RIGHT AMOUNT OF BYTES (' + len + ') WITH ' + buffer.length + ' BYTES LEFT');
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
								DEBUG && console.log('[' + this.connNum + '] WAITING FOR MORE DATA');
							}
							return;

						case BUFFER_UNTIL_CLOSE:
							// we've already added data to the buffer
							return;
					}
				}
			});

			socket.on('end', () => {
				DEBUG && console.log('[' + this.connNum + '] SOCKET CLOSED BY SERVER', (buffer && buffer.length));
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
						console.log('- code: ', code);
						console.log('- stdout: ', stdout);
						console.log('- stderr: ', stderr);

						if (!code) {
							return this.exec(cmd, this.opts)
								.then(data => {
									resolve(data);
								});
						}

						reject(new Error('Unable to start Android Debug Bridge server (exit code %s)', code));
					});

			});

			doSend && send();
		});
	}

	/**
	 * Closes the connection and resets the socket and state.
	 */
	end() {
		if (this.socket) {
			try {
				DEBUG && console.log('[' + this.connNum + '] SOCKET CLOSED');
				this.socket.end();
			} catch (ex) { console.log(ex); }
			this.socket = null;
		}
		this.state = DO_NOTHING;
	}
}
