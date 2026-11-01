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
				meta: { monetag: 'shared' },
				adsTxt: ['adsterra.com, 123, DIRECT'],
				units: {
					rail: [rail('adcash', { zone: '111' })],
					banner: [rail('adcash', { zone: '222' })],
				},
			},
			sites: {
				'example.com': {
					units: {
						rail: [
							rail('adsterra', { key: 'abc123', weight: 3 }),
							rail('adcash', { zone: '999' }),
							rail('html', { html: '<a href="#">House</a>' }),
						],
					},
				},
			},
		});
		const ads = forHost('example.com');
		assert.ok(ads);
		assert.match(ads.head, /name="monetag" content="shared"/);
		assert.equal(ads.adsTxt, 'adsterra.com, 123, DIRECT\n');
		const units = ads.client.units.rail ?? [];
		assert.equal(units.length, 3);
		assert.equal(units[0].weight, 3);
		// Networks are numbered in order of appearance, Adcash with the
		// smaller share, and the response never names them.
		assert.deepEqual(
			units.map((unit) => unit.network),
			[0, 1, 2]
		);
		assert.equal(ads.client.units.banner?.[0].network, 1);
		assert.deepEqual(ads.client.shares, [2, 1, 2]);
		assert.doesNotMatch(
			JSON.stringify(ads.client),
			/:"(?:adsterra|adcash|html)"/
		);
		const frames = units.map((unit) => unit.html);
		assert.match(frames[0], /atOptions=\{"key":"abc123"/);
		assert.match(
			frames[0],
			/highperformanceformat\.com\/abc123\/invoke\.js/
		);
		assert.match(frames[1], /aclib\.runBanner\(\{"zoneId":"999"\}\);/);
		assert.match(frames[2], /House/);
		assert.match(
			ads.client.units.banner?.[0].html ?? '',
			/"zoneId":"222"/
		);
	});

	test('Invalid units and unknown providers are dropped.', async (t) => {
		const { forHost } = await adsFile(t, {
			sites: {
				'example.com': {
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
		assert.match(loader[0].html, /"zoneId":"5"/);
	});

	test('Adcash runs each bring aclib along, and scripts stay off the proxy frame unless allowed.', async (t) => {
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
		assert.equal(scripts.length, 5);
		assert.equal(scripts[0].src, 'https://acscdn.com/script/aclib.js');
		assert.equal(scripts[0].wait, true);
		assert.equal(scripts[0].frame, false);
		assert.equal(
			scripts[1].code,
			`if(typeof aclib.runAutoTag==='function')aclib.runAutoTag({"zoneId":"1"});`
		);
		assert.equal(scripts[1].frame, false);
		assert.equal(scripts[2].src, 'https://acscdn.com/script/aclib.js');
		assert.equal(scripts[2].frame, true);
		assert.equal(
			scripts[3].code,
			`if(typeof aclib.runPop==='function')aclib.runPop({"zoneId":"2"});`
		);
		assert.equal(scripts[4].src, 'https://tag.example/tag.min.js');
		assert.deepEqual(scripts[4].attributes, { 'data-zone': '7' });
		assert.equal(scripts[4].group, undefined);
	});

	test('Grouped scripts share a pick per entry, with Adcash weighted lower by default.', async (t) => {
		const { forHost } = await adsFile(t, {
			sites: {
				'example.com': {
					scripts: [
						{
							provider: 'adsterra',
							src: 'https://pop.example/a.js',
							group: 'pop',
						},
						{
							provider: 'adcash',
							run: 'autoTag',
							zone: '1',
							group: 'pop',
						},
						{
							provider: 'monetag',
							src: 'https://tag.example/tag.min.js',
							group: 'pop',
							weight: 5,
						},
						{
							provider: 'adsterra',
							src: 'https://bar.example/b.js',
							group: 'bad group',
						},
					],
				},
			},
		});
		const scripts = forHost('example.com')?.client.scripts ?? [];
		assert.deepEqual(
			scripts.map(({ group, pick, weight }) => [group, pick, weight]),
			[
				['pop', 0, 2],
				['pop', 1, 1],
				['pop', 1, 1],
				['pop', 2, 5],
				[undefined, undefined, undefined],
			]
		);
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
