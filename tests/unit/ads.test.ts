import assert from 'node:assert/strict';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test, type TestContext } from 'node:test';
import { createAds, withHead } from '../../src/server/ads.ts';

async function adsFile(t: TestContext, settings: unknown) {
	const dir = await mkdtemp(join(tmpdir(), 'invisiproxy-ads-'));
	const file = join(dir, 'ads.json');
	t.after(() => rm(dir, { recursive: true, force: true }));
	await writeFile(file, JSON.stringify(settings));
	const ads = createAds(file);
	return {
		file,
		forHost: (host: string) =>
			ads({ headers: { host } } as IncomingMessage),
	};
}

const rail = (provider: string, extra: Record<string, unknown>) => ({
	provider,
	width: 160,
	height: 600,
	...extra,
});

describe('Ads', () => {
	test('Domains match their apex and www by default, plus any listed or wildcard hosts.', async (t) => {
		const { forHost } = await adsFile(t, {
			sites: {
				'example.com': { meta: { monetag: 'one' } },
				'mirror.net': {
					hosts: ['@', 'go', '*'],
					meta: { monetag: 'two' },
				},
				'*': { meta: { monetag: 'fallback' } },
			},
		});
		const tag = (host: string) => forHost(host)?.head;
		assert.match(tag('example.com') ?? '', /one/);
		assert.match(tag('WWW.Example.com:8080') ?? '', /one/);
		assert.match(tag('go.mirror.net') ?? '', /two/);
		assert.match(tag('deep.sub.mirror.net') ?? '', /two/);
		assert.match(tag('mirror.net') ?? '', /two/);
		assert.match(tag('shop.example.com') ?? '', /fallback/);
	});

	test('Hosts with no matching domain and no fallback get no ads.', async (t) => {
		const { forHost } = await adsFile(t, {
			defaults: { meta: { monetag: 'shared' } },
			sites: { 'example.com': {} },
		});
		assert.equal(forHost('other.org'), undefined);
		assert.match(forHost('example.com')?.head ?? '', /shared/);
	});

	test('Sites inherit the defaults and can mix every provider in one placement.', async (t) => {
		const { forHost } = await adsFile(t, {
			defaults: {
				adsense: { client: 'ca-pub-123' },
				adsTxt: ['google.com, pub-123, DIRECT, f08c47fec0942fa0'],
				units: {
					rail: [rail('adsense', { slot: '111' })],
					banner: [rail('adsense', { slot: '222' })],
				},
			},
			sites: {
				'example.com': {
					units: {
						rail: [
							rail('adsense', { slot: '111', weight: 3 }),
							rail('adsterra', { key: 'abc123' }),
							rail('adcash', { zone: '999' }),
							rail('html', { html: '<a href="#">House</a>' }),
						],
					},
				},
			},
		});
		const ads = forHost('example.com');
		assert.ok(ads);
		assert.match(ads.head, /google-adsense-account" content="ca-pub-123"/);
		assert.equal(
			ads.adsTxt,
			'google.com, pub-123, DIRECT, f08c47fec0942fa0\n'
		);
		const units = ads.client.units.rail ?? [];
		assert.deepEqual(
			units.map((unit) => unit.type),
			['adsense', 'frame', 'frame', 'frame']
		);
		assert.equal(units[0].weight, 3);
		const frames = units.flatMap((unit) =>
			unit.type === 'frame' ? [unit.html] : []
		);
		assert.match(frames[0], /atOptions=\{"key":"abc123"/);
		assert.match(
			frames[0],
			/highperformanceformat\.com\/abc123\/invoke\.js/
		);
		assert.match(frames[1], /aclib\.runBanner\(\{"zoneId":"999"\}\);/);
		assert.match(frames[2], /House/);
		assert.equal(ads.client.units.banner?.[0].type, 'adsense');
	});

	test('Invalid units are dropped, and AdSense never fills the loader.', async (t) => {
		const { forHost } = await adsFile(t, {
			sites: {
				'example.com': {
					adsense: { client: 'ca-pub-123' },
					units: {
						loader: [
							{
								provider: 'adsense',
								slot: '1',
								width: 300,
								height: 250,
							},
							{
								provider: 'adsterra',
								key: 'x"><script>',
								width: 300,
								height: 250,
							},
							{ provider: 'adcash', zone: '5' },
							{
								provider: 'adcash',
								zone: '5',
								width: 300,
								height: 250,
							},
						],
					},
				},
			},
		});
		const loader = forHost('example.com')?.client.units.loader ?? [];
		assert.equal(loader.length, 1);
		assert.equal(loader[0].type, 'frame');
	});

	test('Adcash formats share one aclib load, and scripts stay off the proxy frame unless allowed.', async (t) => {
		const { forHost } = await adsFile(t, {
			sites: {
				'example.com': {
					scripts: [
						{ provider: 'adcash', run: 'autoTag', zone: '1' },
						{
							provider: 'adcash',
							run: 'pop',
							zone: '2',
							frame: true,
						},
						{
							provider: 'monetag',
							src: '//tag.example/tag.min.js',
							attributes: { 'data-zone': '7', onload: 'evil()' },
						},
						{
							provider: 'adsterra',
							src: 'http://insecure.example/x.js',
						},
					],
				},
			},
		});
		const scripts = forHost('example.com')?.client.scripts ?? [];
		assert.equal(scripts.length, 4);
		assert.equal(scripts[0].src, 'https://acscdn.com/script/aclib.js');
		assert.equal(scripts[0].wait, true);
		assert.equal(scripts[0].frame, true);
		assert.equal(
			scripts[1].code,
			`if(typeof aclib.runAutoTag==='function')aclib.runAutoTag({"zoneId":"1"});`
		);
		assert.equal(scripts[1].frame, false);
		assert.equal(
			scripts[2].code,
			`if(typeof aclib.runPop==='function')aclib.runPop({"zoneId":"2"});`
		);
		assert.equal(scripts[3].src, 'https://tag.example/tag.min.js');
		assert.deepEqual(scripts[3].attributes, { 'data-zone': '7' });
	});

	test('Edits to the file are picked up without a restart.', async (t) => {
		const { file, forHost } = await adsFile(t, {
			sites: { 'example.com': { meta: { monetag: 'before' } } },
		});
		assert.match(forHost('example.com')?.head ?? '', /before/);
		await writeFile(
			file,
			JSON.stringify({
				sites: { 'example.com': { meta: { monetag: 'after!' } } },
			})
		);
		const later = new Date(Date.now() + 5000);
		await utimes(file, later, later);
		assert.match(forHost('example.com')?.head ?? '', /after!/);
	});

	test('Verification tags go into plain HTML but leave gzipped pages alone.', () => {
		const head = '<meta name="monetag" content="x">';
		assert.equal(
			withHead('<html><head><meta charset="utf-8"><title>', head),
			`<html><head><meta charset="utf-8">${head}<title>`
		);
		assert.equal(
			withHead(Buffer.from('<head></head>'), head).toString(),
			`<head>${head}</head>`
		);
		const gzipped = Buffer.from([0x1f, 0x8b, 1, 2]);
		assert.equal(withHead(gzipped, head), gzipped);
	});
});
