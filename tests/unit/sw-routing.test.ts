import assert from 'node:assert/strict';
import test from 'node:test';
import {
	isScramjetRouteUrl,
	proxiedAssetUrl,
	proxiedClientFor,
} from '../../src/browser/sw-routing.ts';

const prefix = '/scram/network/';
const proxyOrigin = 'https://proxy.example';
const wrap = (target: string, controller = 'frame123', frame = 'abc45678') =>
	`${proxyOrigin}${prefix}${controller}/${frame}/${encodeURIComponent(target)}`;
const clientUrl = wrap('https://games.poki.com/en/game');

test('classifies prefix routes and leaves blob:/data: URLs native', () => {
	assert.equal(isScramjetRouteUrl(wrap('https://x.example/a.png'), prefix), true);
	assert.equal(isScramjetRouteUrl(`${proxyOrigin}/assets/img/a.png`, prefix), false);
	assert.equal(isScramjetRouteUrl('blob:https://proxy.example/uuid', prefix), false);
	assert.equal(isScramjetRouteUrl('data:text/plain,x', prefix), false);
	assert.equal(isScramjetRouteUrl('not a url', prefix), false);
});

test('parses proxied document URLs back into frame ids and target', () => {
	assert.deepEqual(proxiedClientFor(clientUrl, prefix), {
		controllerId: 'frame123',
		frameId: 'abc45678',
		target: new URL('https://games.poki.com/en/game'),
	});
});

test('rejects top-level proxy pages, worker scripts and malformed clients', () => {
	for (const url of [
		`${proxyOrigin}/`,
		`${proxyOrigin}/assets/js/app.js`,
		undefined,
		'not a url',
		`${proxyOrigin}${prefix}only-one-segment`,
		wrap('chrome-extension://x/x.js'),
	])
		assert.equal(proxiedClientFor(url, prefix), null);
});

test('rewraps escaped root-relative assets against the real origin', () => {
	assert.equal(
		proxiedAssetUrl(
			`${proxyOrigin}/cdn/thumb.png`,
			clientUrl,
			prefix,
			proxyOrigin
		),
		wrap('https://games.poki.com/cdn/thumb.png')
	);
});

test('wraps escaped cross-origin CDN assets, wasm and media as-is', () => {
	for (const url of [
		'https://files.crazygames.com/game.wasm',
		'https://poki-gdn.com/i/thumbnail.webp',
		'https://media.crazygames.com/intro.mp4',
	])
		assert.equal(
			proxiedAssetUrl(url, clientUrl, prefix, proxyOrigin),
			wrap(url)
		);
});

test('leaves native, non-asset and unproxied requests untouched', () => {
	for (const [url, client] of [
		[`${proxyOrigin}/api/data.json`, clientUrl],
		[`${proxyOrigin}/cdn/page.html`, clientUrl],
		[`${proxyOrigin}/cdn/thumb.png`, `${proxyOrigin}/home`],
		[`${proxyOrigin}/cdn/thumb.png`, undefined],
		['blob:https://proxy.example/uuid', clientUrl],
		['not a url', clientUrl],
	] as const)
		assert.equal(proxiedAssetUrl(url, client, prefix, proxyOrigin), null);
});

test('never rewraps requests already under the Scramjet prefix', () => {
	assert.equal(
		proxiedAssetUrl(wrap('https://x.example/t.png'), clientUrl, prefix, proxyOrigin),
		null
	);
});
