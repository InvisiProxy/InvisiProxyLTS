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
	settings: { pathname: string; usingSEO: boolean; disguiseFiles: boolean }
) {
	const root = await fixture(t, settings, true);
	await buildFixture(root);
	await run(root, [probe('http-probe.ts')]);

	const state = await readFile(
		join(root, 'views/dist/.obfuscation.json'),
		'utf8'
	).then(JSON.parse, () => ({}));
	const wisp = state.aliases?.['prefixes/wisp'] ?? 'wisp';
	const origin = await startServer(root);
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
}

describe('Production server', () => {
	test(
		'A disguised build under a subpath serves its pages, the mirror link API and Wisp.',
		{ timeout: 900_000 },
		(t) =>
			checkSite(t, {
				pathname: '/school/',
				usingSEO: false,
				disguiseFiles: true,
			})
	);

	test(
		'An SEO build at the root serves its pages, the mirror link API and Wisp.',
		{ timeout: 900_000 },
		(t) =>
			checkSite(t, {
				pathname: '/',
				usingSEO: true,
				disguiseFiles: false,
			})
	);
});
