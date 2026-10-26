import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { describe, test } from 'node:test';
import { wispOptions } from '../../src/server/wisp.ts';
import { SupervisedWisp } from '../../src/server/wisp-supervisor.ts';

const firstFrame = (url: string) =>
	new Promise<ArrayBuffer>((resolve, reject) => {
		const socket = new WebSocket(url);
		socket.binaryType = 'arraybuffer';
		socket.onmessage = (event) => {
			resolve(event.data);
			socket.close();
		};
		socket.onerror = () => reject(new Error('Wisp connection failed'));
	});

describe('Wisp supervisor', () => {
	test('A crashed worker is restarted, and connections made while it restarts still go through.', {
		timeout: 60_000,
	}, async (t) => {
		const wisp = new SupervisedWisp('test', wispOptions);
		const server = createServer().on('upgrade', (req, socket, head) =>
			wisp.route(req, socket as Socket, head)
		);
		await new Promise<void>((resolve) =>
			server.listen(0, '127.0.0.1', resolve)
		);
		t.after(async () => {
			await wisp.stop();
			server.close();
		});
		const url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/`;

		assert.equal(await wisp.started, true);
		assert.ok((await firstFrame(url)).byteLength > 0);

		const [crashed] = wisp.pids;
		process.kill(crashed, 'SIGKILL');
		while (wisp.isRunning) await sleep(10);
		const attempts: Promise<ArrayBuffer>[] = [];
		for (let i = 0; i < 20; i++) {
			attempts.push(firstFrame(url));
			await sleep(25);
		}
		for (const result of await Promise.allSettled(attempts)) {
			assert.equal(result.status, 'fulfilled');
			assert.ok(result.value.byteLength > 0);
		}
		assert.equal(wisp.pids.length, 1);
		assert.notEqual(wisp.pids[0], crashed);
	});
});
