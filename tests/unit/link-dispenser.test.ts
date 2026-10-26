import assert from 'node:assert/strict';
import { describe, test, type TestContext } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLinkDispenser } from '../../src/server/link-dispenser.ts';
import { serve, testClientIp } from '../helpers/http.ts';

async function dispenser(t: TestContext, contents?: string) {
	const dir = await mkdtemp(join(tmpdir(), 'invisiproxy-links-'));
	const file = pathToFileURL(join(dir, 'links.txt'));
	const app = await serve(createLinkDispenser(file, testClientIp));
	t.after(async () => {
		await app.close();
		await rm(dir, { recursive: true, force: true });
	});
	if (contents !== undefined) await writeFile(file, contents);
	return {
		file,
		request: (ip = '192.0.2.1', headers: Record<string, string> = {}) =>
			app.inject({
				method: 'POST',
				url: '/api/link',
				remoteAddress: ip,
				headers,
			}),
	};
}

describe('Mirror link API', () => {
	test('Only valid links are handed out, and edits to the list are picked up without a restart.', async (t) => {
		const { request, file } = await dispenser(
			t,
			'# SECRET_COMMENT\njavascript:alert(1)\nhttps://user:secret@example.com\n  https://one.example/  \n'
		);
		for (let i = 1; i <= 5; i++) {
			const response = await request(`192.0.2.${i}`);
			assert.equal(response.statusCode, 200);
			assert.equal(response.headers['cache-control'], 'no-store');
			assert.deepEqual(response.json(), { link: 'https://one.example/' });
		}
		await writeFile(file, 'https://restocked.example/');
		assert.equal(
			(await request('192.0.2.9')).json().link,
			'https://restocked.example/'
		);
	});

	test('A missing or empty list returns a generic error that does not leak the file.', async (t) => {
		for (const contents of [undefined, '', '# SECRET\nnot a URL']) {
			const { request } = await dispenser(t, contents);
			const response = await request();
			assert.equal(response.statusCode, 503);
			assert.deepEqual(Object.keys(response.json()), ['error']);
			assert.ok(!response.body.includes('SECRET'));
		}
	});

	test('The cooldown applies to each client and ignores forwarded headers.', async (t) => {
		t.mock.timers.enable({ apis: ['Date'], now: 1000 });
		const { request } = await dispenser(t, 'https://one.example/');
		assert.equal((await request()).statusCode, 200);
		const spoofed = await request('192.0.2.1', {
			'x-forwarded-for': '192.0.2.99',
		});
		assert.equal(spoofed.statusCode, 429);
		assert.ok(Number(spoofed.headers['retry-after']) > 0);
		assert.equal((await request('192.0.2.2')).statusCode, 200);
		t.mock.timers.tick(60_000);
		assert.equal((await request()).statusCode, 200);
	});
});
