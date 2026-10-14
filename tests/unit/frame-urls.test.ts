import assert from 'node:assert/strict';
import test from 'node:test';
import { rewriteFrameUrl } from '../../src/browser/frame-urls.ts';

const proxyOrigin = 'https://proxy.example';
const networkPrefix = '/scram/network/';
const wrap = (target: string) =>
	`${proxyOrigin}${networkPrefix}frame123/${encodeURIComponent(target)}`;

let rewrites: string[] = [];
const rewrite = (url: string) => {
	rewrites.push(url);
	return wrap(url);
};
const normalize = (value: unknown) => {
	rewrites = [];
	const result = rewriteFrameUrl(value, rewrite, proxyOrigin, networkPrefix);
	return { result, rewrites };
};

test('wraps raw cross-origin game CDN embeds exactly once', () => {
	const target = 'https://files.crazygames.com/en/game/player.html';
	assert.deepEqual(normalize(target), {
		result: wrap(target),
		rewrites: [target],
	});
});

test('unwraps and rewraps existing Scramjet URLs so repeats never double-wrap', () => {
	const target = 'https://games.poki-gdn.com/worker.js';
	const wrapped = wrap(target);
	assert.deepEqual(normalize(wrapped), { result: wrapped, rewrites: [target] });
	// Running the rewritten value through again is idempotent.
	assert.deepEqual(normalize(wrapped), {
		result: wrapped,
		rewrites: [target],
	});
});

test('collapses recursively nested wrappers into a single wrap', () => {
	const target = 'https://games.crazygames.com/blob.js';
	assert.deepEqual(normalize(wrap(wrap(target))), {
		result: wrap(target),
		rewrites: [target],
	});
});

test('passes blob, data, about and javascript URLs through untouched', () => {
	for (const value of [
		'blob:https://proxy.example/8f14e45f-ceea-467f-a',
		'data:text/javascript,console.log(1)',
		'about:blank',
		'javascript:void 0',
		'',
		'#fragment-only',
	])
		assert.deepEqual(normalize(value), { result: value, rewrites: [] });
});

test('leaves proxy-hosted URLs outside the Scramjet prefix clean', () => {
	const target = 'https://proxy.example/assets/img/logo.webp';
	assert.deepEqual(normalize(target), { result: target, rewrites: [] });
});

test('hands relative paths to the rewriter for resolution against the frame', () => {
	assert.deepEqual(normalize('/game/index.html'), {
		result: wrap('/game/index.html'),
		rewrites: ['/game/index.html'],
	});
});

test('treats URL instances like strings and returns other values as-is', () => {
	const target = 'https://media.crazygames.com/video.mp4';
	assert.deepEqual(normalize(new URL(target)), {
		result: wrap(target),
		rewrites: [target],
	});
	for (const value of [null, undefined, 42, {}, ['https://x.example']])
		assert.deepEqual(normalize(value), { result: value, rewrites: [] });
});
