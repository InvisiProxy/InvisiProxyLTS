import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	autoSiteFixes,
	fixFetchHandler,
	headlessBody,
	fixScriptSource,
	obsidianSameTab,
	type ScramjetFetchRequestTarget,
	siteCacheKey,
	siteCacheNames,
	stableCacheKeys,
} from '../../src/browser/site-fixes.ts';

const prefix = '/scram/network/a/b/';
const encapsulated = 'data:text/javascript;charset=utf-8;base64,c2VsZi5vaz0x';
const workerBody = `importScripts("/scram/scramjet.js");\nimportScripts("${encapsulated}");\n`;
const request = (
	path: string,
	rawDestination: RequestDestination,
	method = 'GET'
): ScramjetFetchRequestTarget => ({
	rawUrl: new URL(`http://proxy.test${prefix}${path}`),
	rawDestination,
	method,
	cache: 'default',
});

describe('Experimental site fixes', () => {
	test('Obsidian and Truffled get the fixes automatically, other sites do not.', () => {
		for (const url of [
			'https://playobsidian.com/store/',
			'https://www.playobsidian.com/',
			'https://truffled.lol/',
		])
			assert.equal(autoSiteFixes(url), true, url);
		for (const url of [
			'https://example.com/',
			'https://notplayobsidian.com/',
			'https://playobsidian.com.example.net/',
			'not a url',
		])
			assert.equal(autoSiteFixes(url), false, url);
	});

	test('Worker scripts are rewritten once and HEAD requests skip the cache.', async () => {
		const run = async (active: boolean) => {
			const seen: string[] = [];
			const handler = {
				handleFetch: async (req: ScramjetFetchRequestTarget) => {
					seen.push(
						`${req.method} ${req.rawDestination} ${req.cache}`
					);
					return {
						body: req.rawDestination === 'worker' ? workerBody : '',
					};
				},
			};
			fixFetchHandler(handler, prefix, () => active);
			await handler.handleFetch(
				request('blob:https://site.test/1', 'worker')
			);
			await handler.handleFetch(request(encapsulated, 'script'));
			await handler.handleFetch(request(encapsulated, 'script'));
			await handler.handleFetch(
				request('https://site.test/rom', '', 'HEAD')
			);
			return seen;
		};
		assert.deepEqual(await run(true), [
			'GET worker default',
			'GET  default',
			'GET script default',
			'HEAD  no-store',
		]);
		assert.deepEqual(await run(false), [
			'GET worker default',
			'GET script default',
			'GET script default',
			'HEAD  default',
		]);
	});

	test('A HEAD answered by a GET keeps its headers and drops its body.', async () => {
		let cancelled = false;
		const body = new ReadableStream({
			cancel() {
				cancelled = true;
			},
		});
		const response = headlessBody(
			new Response(body, { headers: { 'content-length': '16777216' } })
		);
		await new Promise((resolve) => setTimeout(resolve));
		assert.equal(response.body, null);
		assert.equal(response.headers.get('content-length'), '16777216');
		assert.equal(cancelled, true);
	});

	test('Cache keys stay on the real site without ever fetching outside the proxy.', async () => {
		const base = 'https://playobsidian.com/cdn/assets/html/game/index.html';
		assert.equal(
			siteCacheKey('CACHE_COMPLETE', base),
			'https://playobsidian.com/cdn/assets/html/game/CACHE_COMPLETE'
		);
		assert.deepEqual(
			siteCacheNames(
				[
					'https://playobsidian.com@game-v2',
					'https://example.com@other',
					'scramjet-http-cache-v2',
				],
				'https://playobsidian.com'
			),
			['game-v2']
		);

		const calls: string[] = [];
		const record =
			(name: string) =>
			(...args: unknown[]) =>
				calls.push(`${name} ${String(args[0])}`);
		class Cache {}
		for (const name of [
			'add',
			'addAll',
			'delete',
			'match',
			'matchAll',
			'put',
		])
			(Cache.prototype as Record<string, unknown>)[name] = record(name);
		class CacheStorage {}
		(CacheStorage.prototype as unknown as Record<string, unknown>).keys =
			async () => [];
		stableCacheKeys({ Cache, CacheStorage } as unknown as Window, {
			url: new URL(base),
		});
		const cache = Cache.prototype as Record<string, (key: string) => void>;
		cache.add('part1');
		cache.put('part1');
		assert.deepEqual(calls, [
			'add part1',
			'put https://playobsidian.com/cdn/assets/html/game/part1',
		]);
	});

	test('Obsidian launches games in the same tab without losing other settings.', () => {
		const store = new Map<string, string>();
		const storage = {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => void store.set(key, value),
		};
		obsidianSameTab(storage, { url: new URL('https://example.com/') });
		assert.equal(store.size, 0);
		const client = { url: new URL('https://playobsidian.com/store/') };
		obsidianSameTab(storage, client);
		const fresh = JSON.parse(store.get('settings') ?? '{}');
		assert.equal(fresh.launch, 'currentTab');
		assert.equal(fresh.cards, 'default');
		store.set(
			'settings',
			JSON.stringify({ launch: 'newTab', theme: 'kept' })
		);
		obsidianSameTab(storage, client);
		assert.deepEqual(JSON.parse(store.get('settings') ?? ''), {
			launch: 'currentTab',
			theme: 'kept',
		});
	});

	test('Script sources survive debugger stripping and eval imports keep their module base.', () => {
		assert.equal(
			fixScriptSource(`await eval('import("../_framework/dotnet.js")')`),
			'await import("../_framework/dotnet.js")'
		);
		assert.equal(
			fixScriptSource('if(globalThis.dotnetDebugger)debugger}'),
			'if(globalThis.dotnetDebugger)void 0}'
		);
		assert.equal(
			fixScriptSource('if (a) b(); else debugger;'),
			'if (a) b(); else void 0;'
		);
		for (const js of [
			'if (a) { debugger; }',
			'chrome.debugger.attach()',
			'const debuggerAttached = true;',
		])
			assert.equal(fixScriptSource(js), js);
	});
});
