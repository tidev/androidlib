import net from 'net';

export default class MockAdbServer {
	constructor(port=9999) {
		this.server = null;
		this.port = port;
	}

	start() {
		let toClose = true;
		this.server = net.createServer(socket => {
			socket.setNoDelay(true);

			//console.log('CONNECTED: ' + socket.remoteAddress +':'+ socket.remotePort);

			socket.on('data', data => {
				//console.log('DATA ' + socket.remoteAddress + ': ' + data);

				if (data.indexOf('host:fake') !== -1) {
					socket.write('FAIL0014unknown host service');

				} else if (data.indexOf('host:version') !== -1) {
					socket.write('OKAY00040030');

				} else if (data.indexOf('host:nodevices') !== -1) {
					socket.write('OKAY00000');

				} else if (data.indexOf('host:twodevices') !== -1) {
					socket.write('OKAY002cemulator-5556\tdevice\nemulator-5554\tdevice\n');

				} else if (data.indexOf('shell:ps') !== -1) {
					toClose = false;
					socket.write('OKAY');
					setTimeout(() => {
						socket.write('USER     PID   PPID  VSIZE  RSS     WCHAN    PC        NAME\n');
						socket.write('root      1     0     8784   608   c00be88c 00026cbc S /init BYTES\n');
						socket.write('u0_a27    977   67    462792 24452 ffffffff b6e2cc9c S com.android.exchange');
						socket.end();
					}, 10);
				} else if (data.indexOf('host:transport:emulator-5554') !== -1) {
					toClose = false;
					setTimeout(() => {
						socket.write('OKAY');
					}, 500);
				}

				if (toClose) {
					socket.end();
				}
			});

			socket.on('close', data => {
				//console.log('CLOSED: ' + socket.remoteAddress +' '+ socket.remotePort);
			});

		}).listen(9999, '127.0.0.1');

		//console.log('Server listening on ' + HOST +':'+ PORT);
	}

	stop() {
		if (this.server) {
			this.server.close();
			this.server.unref();
		}
	}
}
