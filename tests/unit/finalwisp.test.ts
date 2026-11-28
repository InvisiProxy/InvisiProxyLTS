import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { describe, test } from 'node:test';
import {
	finalwispArgs,
	finalwispAvailable,
	SupervisedFinalwisp,
} from '../../src/server/finalwisp.ts';

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

// Below the kernel's ephemeral range so an outbound connection cannot steal it.
const pickPort = async () => {
	for (let attempt = 0; attempt < 20; attempt++) {
		const port = 10_000 + Math.floor(Math.random() * 20_000);
		const probe = createServer();
		const free = await new Promise<boolean>((resolve) => {
			probe.once('error', () => resolve(false));
			probe.listen(port, '127.0.0.1', () => resolve(true));
		});
		await new Promise((resolve) => probe.close(resolve));
		if (free) return port;
	}
	throw new Error('no free port for the finalwisp instance');
};

describe('finalwisp supervisor', () => {
	test('A crashed instance is restarted, and connections made while it restarts still go through.', {
		timeout: 60_000,
	}, async (t) => {
		if (!finalwispAvailable()) return t.skip('finalwisp is not installed');
		// Fixed ports; retry in case the pick loses a race.
		let wisp!: InstanceType<typeof SupervisedFinalwisp>;
		for (let attempt = 0; attempt < 3; attempt++) {
			const port = await pickPort();
			const args = await finalwispArgs('');
			args[args.indexOf('--port') + 1] = String(port);
			wisp = new SupervisedFinalwisp('test', args, port);
			await wisp.started;
			await sleep(150);
			if (wisp.isRunning) break;
			await wisp.stop();
			wisp = undefined as unknown as typeof wisp;
		}
		assert.ok(wisp, 'no free port for the finalwisp instance');
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
