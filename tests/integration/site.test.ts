import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test, type TestContext } from 'node:test';
import {
	buildFixture,
	fixture,
	probe,
	run,
	startServer,
} from '../helpers/fixture.ts';

async function checkSite(
	t: TestContext,
	settings: {
		pathname: string;
		usingSEO: boolean;
		disguiseFiles: boolean;
		patreon?: boolean;
		dlpcc?: boolean;
	},
	relay = false
) {
	const root = await fixture(t, settings, true);
	await buildFixture(root);
	await run(root, [probe('http-probe.ts')]);

	const state = await readFile(
		join(root, 'views/dist/.obfuscation.json'),
		'utf8'
	).then(JSON.parse, () => ({}));
	const wisp = state.aliases?.['prefixes/wisp'] ?? 'wisp';
	const origin = await startServer(
		root,
		relay ? { DLPCC_PUBLIC_HOST: 'turn.*' } : {}
	);
	const page = await fetch(origin + settings.pathname);
	assert.equal(page.status, 200);
	assert.match(await page.text(), /^<!doctype html>/i);
	const socket = new WebSocket(
		`${origin.replace('http', 'ws')}${settings.pathname}${wisp}/`
	);
	socket.binaryType = 'arraybuffer';
	const frame = await new Promise<ArrayBuffer>((resolve, reject) => {
		socket.onmessage = (event) => resolve(event.data);
		socket.onerror = () => reject(new Error('Wisp connection failed'));
	});
	socket.close();
	assert.ok(frame.byteLength > 0);

	const dlpcc = `${origin.replace('127.0.0.1', 'localhost')}${settings.pathname}${state.aliases?.['prefixes/dlpcc'] ?? 'dlpcc'}`;
	const ice = await fetch(`${dlpcc}/ice`);
	const client = await fetch(`${dlpcc}/client.js`);
	if (relay) {
		const config = await ice.json();
		assert.ok(
			config.iceServers?.length,
			'The relay should hand out TURN servers.'
		);
		assert.equal(config.iceTransportPolicy, 'relay');
		assert.match(
			JSON.stringify(config.iceServers),
			/turns?:turn\.localhost:/,
			'turn.* should give the mirror its own TURN name.'
		);
		assert.match(await client.text(), /__dlpcc/);
	} else {
		assert.doesNotMatch(await ice.text(), /iceServers/);
		assert.doesNotMatch(await client.text(), /__dlpcc/);
	}
}

describe('Production server', () => {
	test(
		'A disguised build under a subpath serves its pages, the mirror link API and Wisp, with the relay off by default.',
		{ timeout: 900_000 },
		(t) =>
			checkSite(t, {
				pathname: '/school/',
				usingSEO: false,
				disguiseFiles: true,
			})
	);

	test(
		'An SEO build at the root serves its pages, the mirror link API and Wisp, and Patreon alone does not start the relay.',
		{ timeout: 900_000 },
		(t) =>
			checkSite(t, {
				pathname: '/',
				usingSEO: true,
				disguiseFiles: false,
				patreon: true,
			})
	);

	test(
		'A build with dlpcc on serves the WebRTC relay.',
		{ timeout: 900_000 },
		(t) =>
			checkSite(
				t,
				{
					pathname: '/',
					usingSEO: false,
					disguiseFiles: true,
					dlpcc: true,
				},
				true
			)
	);
});
