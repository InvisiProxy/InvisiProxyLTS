import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeScramjetTarget } from '../../src/browser/scramjet-links.ts';

const proxyOrigin = 'https://proxy.example';
const networkPrefix = '/scram/network/';
const encode = (target: string) =>
	`${proxyOrigin}${networkPrefix}frame123/${encodeURIComponent(target)}`;

test('leaves external targets clean and unchanged', () => {
	const target = 'https://www.example.com/a?b=1#section';
	assert.deepEqual(
		normalizeScramjetTarget(target, proxyOrigin, networkPrefix),
		{ url: target, unwrapped: false, proxyOrigin: false }
	);
});

test('unwraps one Scramjet target and preserves its encoded hash', () => {
	assert.deepEqual(
		normalizeScramjetTarget(
			`${encode('https://www.example.com/a?b=1')}#section`,
			proxyOrigin,
			networkPrefix
		),
		{
			url: 'https://www.example.com/a?b=1#section',
			unwrapped: true,
			proxyOrigin: false,
		}
	);
});

test('unwraps recursively nested wrappers rather than nesting another one', () => {
	const nested = encode(encode('https://www.example.com/deep'));
	assert.deepEqual(
		normalizeScramjetTarget(nested, proxyOrigin, networkPrefix),
		{
			url: 'https://www.example.com/deep',
			unwrapped: true,
			proxyOrigin: false,
		}
	);
});

test('recognizes same-origin proxy pages without treating them as destinations to rewrap', () => {
	assert.deepEqual(
		normalizeScramjetTarget(
			`${proxyOrigin}/scram/network/landing`,
			proxyOrigin,
			networkPrefix
		),
		{
			url: `${proxyOrigin}/scram/network/landing`,
			unwrapped: false,
			proxyOrigin: true,
		}
	);
});

test('returns a clean proxy-origin URL rather than wrapping it again', () => {
	const normalized = normalizeScramjetTarget(
		`${proxyOrigin}/scram/network/landing`,
		proxyOrigin,
		networkPrefix
	);
	assert.deepEqual(normalized, {
		url: `${proxyOrigin}/scram/network/landing`,
		unwrapped: false,
		proxyOrigin: true,
	});
});

test('returns malformed wrapper links as clean proxy-origin URLs', () => {
	const target = 'https://proxy.example/scram/network/frame/%E0%A4%A';
	assert.deepEqual(
		normalizeScramjetTarget(target, proxyOrigin, networkPrefix),
		{ url: target, unwrapped: false, proxyOrigin: true }
	);
});

test('leaves relative paths unchanged, including paths that resemble proxy routes', () => {
	for (const target of ['/about', '/scram/network/landing']) {
		assert.deepEqual(
			normalizeScramjetTarget(target, proxyOrigin, networkPrefix),
			{ url: target, unwrapped: false, proxyOrigin: false }
		);
	}
});
