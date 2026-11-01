import assert from 'node:assert/strict';
import { describe, test, type TestContext } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IncomingMessage } from 'node:http';
import { linkRotationMs } from '../../src/constants.ts';
import {
	clientKeys,
	createLinkDispenser,
	defaultClientIp,
	type DispenserOptions,
} from '../../src/server/link-dispenser.ts';
import { serve, testClientIp } from '../helpers/http.ts';

const mirrors = Array.from(
	{ length: 8 },
	(_, i) => `https://mirror${i}.example/`
);

async function dispenser(
	t: TestContext,
	contents?: string,
	options?: DispenserOptions
) {
	const dir = await mkdtemp(join(tmpdir(), 'invisiproxy-links-'));
	const file = pathToFileURL(join(dir, 'links.txt'));
	const app = await serve(createLinkDispenser(file, testClientIp, options));
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

	test('Every address in a network area gets the same link, so rotating addresses never reveals another mirror.', async (t) => {
		const { request } = await dispenser(t, mirrors.join('\n'));
		const link = async (ip: string) => (await request(ip)).json().link;
		const ipv4 = new Set<string>();
		const ipv6 = new Set<string>();
		for (let i = 0; i < 30; i++) {
			ipv4.add(await link(`198.51.${i}.${i + 1}`));
			ipv6.add(await link(`2001:db8:${i.toString(16)}:${i}::1`));
		}
		assert.equal(ipv4.size, 1);
		assert.equal(ipv6.size, 1);

		const areas = new Set<string>();
		for (let i = 0; i < 40; i++) areas.add(await link(`10.${i}.0.1`));
		assert.ok(
			areas.size > 1,
			'Different areas should spread across mirrors.'
		);
	});

	test('Removing a link only moves the areas that were assigned it, and assignments rotate daily.', async (t) => {
		t.mock.timers.enable({ apis: ['Date'], now: 1000 });
		const { request, file } = await dispenser(t, mirrors.join('\n'));
		const assign = async () => {
			const links: string[] = [];
			for (let i = 0; i < 40; i++)
				links.push((await request(`10.${i}.0.1`)).json().link);
			t.mock.timers.tick(10_000);
			return links;
		};
		const before = await assign();
		const removed = before[0];
		await writeFile(
			file,
			mirrors.filter((link) => link !== removed).join('\n')
		);
		const after = await assign();
		for (let i = 0; i < before.length; i++) {
			assert.notEqual(after[i], removed);
			if (before[i] !== removed) assert.equal(after[i], before[i]);
		}

		t.mock.timers.tick(linkRotationMs);
		const rotated = await assign();
		assert.ok(rotated.some((link, i) => link !== after[i]));
	});

	test('A flood of new addresses cannot lock other clients out.', async (t) => {
		const { request } = await dispenser(t, 'https://one.example/', {
			maxClients: 3,
		});
		for (let i = 1; i <= 10; i++)
			assert.equal((await request(`203.0.113.${i}`)).statusCode, 200);
		assert.equal((await request('192.0.2.50')).statusCode, 200);
	});

	test('The cooldown covers an IPv6 /64 and IPv4-mapped addresses.', async (t) => {
		const { request } = await dispenser(t, 'https://one.example/');
		assert.equal((await request('2001:db8:1:2::1')).statusCode, 200);
		assert.equal((await request('2001:db8:1:2:ffff::9')).statusCode, 429);
		assert.equal((await request('2001:db8:1:3::1')).statusCode, 200);
		assert.equal((await request('::ffff:192.0.2.7')).statusCode, 200);
		assert.equal((await request('192.0.2.7')).statusCode, 429);
	});

	test('Client keys group addresses by cooldown client and assignment area.', () => {
		assert.deepEqual(clientKeys('::ffff:203.0.113.5'), {
			client: '203.0.113.5',
			area: '203.0',
		});
		assert.deepEqual(clientKeys('2001:DB8:abcd:0012::1'), {
			client: '2001:db8:abcd:12::/64',
			area: '2001:db8::/32',
		});
		assert.deepEqual(clientKeys('2001:db8::'), {
			client: '2001:db8:0:0::/64',
			area: '2001:db8::/32',
		});
		assert.deepEqual(clientKeys('64:ff9b::192.0.2.1'), {
			client: '64:ff9b:0:0::/64',
			area: '64:ff9b::/32',
		});
		assert.deepEqual(clientKeys('fe80::1%eth0'), {
			client: 'fe80:0:0:0::/64',
			area: 'fe80:0::/32',
		});
		assert.deepEqual(clientKeys(''), { client: '', area: '' });
	});

	test('X-Real-IP is only trusted from a reverse proxy on loopback.', () => {
		const request = (remoteAddress: string, realIp?: string) =>
			({
				socket: { remoteAddress },
				headers: realIp ? { 'x-real-ip': realIp } : {},
			}) as unknown as IncomingMessage;
		assert.equal(
			defaultClientIp(request('127.0.0.1', '203.0.113.9')),
			'203.0.113.9'
		);
		assert.equal(
			defaultClientIp(request('::1', '203.0.113.9')),
			'203.0.113.9'
		);
		assert.equal(
			defaultClientIp(request('198.51.100.4', '203.0.113.9')),
			'198.51.100.4'
		);
		assert.equal(defaultClientIp(request('127.0.0.1')), '127.0.0.1');
	});
});
