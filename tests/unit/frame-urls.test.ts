import assert from 'node:assert/strict';
import test from 'node:test';
import {
	rewriteCssTextFrameUrls,
	rewriteFrameUrl,
	rewriteSrcsetFrameUrls,
	unwrapFrameUrl,
} from '../../src/browser/frame-urls.ts';

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

test('unwraps real two-segment frame prefixes (controller and frame ids)', () => {
	const target = 'https://files.crazygames.com/en/game.js';
	const nested = `${proxyOrigin}${networkPrefix}ctrl1234/frame123/${encodeURIComponent(target)}`;
	assert.equal(unwrapFrameUrl(nested, proxyOrigin, networkPrefix), target);
	assert.equal(
		rewriteFrameUrl(nested, rewrite, proxyOrigin, networkPrefix),
		wrap(target)
	);
});

test('unwrapFrameUrl only unwraps wrapped targets and leaves everything else', () => {
	const target = 'https://files.crazygames.com/thumb.png';
	assert.equal(
		unwrapFrameUrl(wrap(target), proxyOrigin, networkPrefix),
		target
	);
	for (const value of [
		target,
		'/thumbs/a.png',
		'blob:https://proxy.example/uuid',
		'',
	])
		assert.equal(
			unwrapFrameUrl(value, proxyOrigin, networkPrefix),
			value
		);
	for (const value of [null, 7, {}])
		assert.equal(
			unwrapFrameUrl(value, proxyOrigin, networkPrefix),
			value
		);
});

test('rewrites every srcset candidate once and keeps descriptors intact', () => {
	rewrites = [];
	const value =
		'/thumbs/small.png 1x, https://files.crazygames.com/big.png 800w, data:image/png;base64,AAAA 2x';
	assert.equal(
		rewriteSrcsetFrameUrls(value, rewrite, proxyOrigin, networkPrefix),
		[
			`${wrap('/thumbs/small.png')} 1x`,
			`${wrap('https://files.crazygames.com/big.png')} 800w`,
			'data:image/png;base64,AAAA 2x',
		].join(', ')
	);
	assert.deepEqual(rewrites, [
		'/thumbs/small.png',
		'https://files.crazygames.com/big.png',
	]);
});

test('unwraps already-wrapped srcset candidates instead of double-wrapping', () => {
	rewrites = [];
	const target = 'https://games.poki-gdn.com/thumbnail.webp';
	const value = `${wrap(target)} 2x`;
	assert.equal(
		rewriteSrcsetFrameUrls(value, rewrite, proxyOrigin, networkPrefix),
		`${wrap(target)} 2x`
	);
	assert.deepEqual(rewrites, [target]);
});

test('passes through empty and non-string srcset values', () => {
	for (const value of ['', null, 42])
		assert.equal(
			rewriteSrcsetFrameUrls(value, rewrite, proxyOrigin, networkPrefix),
			value
		);
});

test('wraps a background-image url() declared inline, quoted or not', () => {
	const target = 'https://games.poki-gdn.com/covers/sushi-cat.webp';
	rewrites = [];
	assert.equal(
		rewriteCssTextFrameUrls(
			`background-image: url("${target}");`,
			rewrite,
			proxyOrigin,
			networkPrefix
		),
		`background-image: url("${wrap(target)}");`
	);
	rewrites = [];
	assert.equal(
		rewriteCssTextFrameUrls(		`background: url(${target}) no-repeat center / cover`,
		rewrite,
		proxyOrigin,
		networkPrefix
	),
		`background: url("${wrap(target)}") no-repeat center / cover`
	);
	assert.deepEqual(rewrites, [target]);
});

test('wraps every url() in a cssText block exactly once and is idempotent', () => {
	const first = 'https://cdn.example/one.png';
	const second = 'https://games.poki-gdn.com/covers/two.png';
	rewrites = [];
	const once = rewriteCssTextFrameUrls(
		`background-image: url('${first}'), url("${second}"); color: red;`,
		rewrite,
		proxyOrigin,
		networkPrefix
	);
	assert.equal(
		once,
		`background-image: url('${wrap(first)}'), url("${wrap(
			second
		)}"); color: red;`
	);
	assert.deepEqual(rewrites, [first, second]);
	rewrites = [];
	assert.equal(
		rewriteCssTextFrameUrls(once, rewrite, proxyOrigin, networkPrefix),
		once
	);
	assert.deepEqual(rewrites, [first, second]);
});

test('leaves data, blob and fragment url() targets untouched', () => {
	rewrites = [];
	for (const value of [
		'url(data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)',
		'url(#logo-gradient)',
		'url("#shadow")',
		'url(blob:https://proxy.example/8f14e45f)',
	])
		assert.equal(
			rewriteCssTextFrameUrls(value, rewrite, proxyOrigin, networkPrefix),
			value
		);
	assert.deepEqual(rewrites, []);
});

test('never rewrites url( inside comments, strings or custom functions', () => {
	rewrites = [];
	const untouched = [
		'.card::after { content: "see url(https://example.com)"; }',
		'/* url(https://example.com/bg.png) */ color: red',
		'cursor: curl(https://example.com)',
	];
	for (const value of untouched)
		assert.equal(
			rewriteCssTextFrameUrls(value, rewrite, proxyOrigin, networkPrefix),
			value
		);
	assert.deepEqual(rewrites, []);
});

test('handles uppercase URL() tokens and returns non-css values as-is', () => {
	const target = 'https://files.crazygames.com/icon.png';
	assert.equal(
		rewriteCssTextFrameUrls(
			`background:URL(${target})`,
			rewrite,
			proxyOrigin,
			networkPrefix
		),
		`background:url("${wrap(target)}")`
	);
	for (const value of ['', null, 42, {}, 'color: red'])
		assert.equal(
			rewriteCssTextFrameUrls(value, rewrite, proxyOrigin, networkPrefix),
			value
		);
});
