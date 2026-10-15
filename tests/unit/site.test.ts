import assert from 'node:assert/strict';
import test from 'node:test';
import { buildValues } from '../../src/build/values.ts';
import type { SiteValues } from '../../src/site.ts';
import {
	setSiteValues,
	route,
	inlineHtml,
	renderProxyError,
} from '../../src/site.ts';
import { maskText } from '../../src/obfuscation/masks.ts';
import { maskDocument } from '../../src/obfuscation/mask-document.ts';

function context(overrides: Partial<SiteValues> = {}) {
	setSiteValues({
		...buildValues,
		usingSEO: true,
		inlineAssets: false,
		basePath: '/school/',
		aliases: {
			links: 'interface',
			'prefixes/scram': 'network',
			'files/scramjet.js': 'network.js',
			'github/solidjs': 'github/ss',
		},
		cacheBust: { 'common.js': 'common-123.js' },
		characters: ['\u200b'],
		maskedTerms: ['Proxy', 'Holy Unblocker'],
		...overrides,
	});
}

test('routes keep base paths, aliases, cache-busting and relative URLs coherent', () => {
	context();
	for (const [input, expected] of [
		['/', '/school/'],
		['/links', '/school/interface'],
		['links', '/school/interface'],
		['/scram/scramjet.js', '/school/network/network.js'],
		['/github/solidjs', '/school/github/ss'],
		['/assets/js/common.js', '/school/assets/js/common-123.js'],
		['./relative.js', './relative.js'],
		['/api/link', '/school/api/link'],
	])
		assert.equal(route(input), expected);
	context({ inlineAssets: true });
	assert.equal(
		route('assets/js/common.js', 'inline'),
		'assets/js/common-123.js'
	);
});

test('SEO mode leaves visible text intact', () => {
	context();
	const html = '<p title="Proxy">Proxy &amp; text</p>';
	assert.equal(maskText('Proxy'), 'Proxy');
	assert.equal(maskDocument(html), html);
});

test('masking changes prose and labels while preserving scripts, code and functional attributes', () => {
	context({ usingSEO: false });
	const html =
		'<p id="Proxy" data-endpoint="/api/Proxy" title="Proxy">Proxy &amp; safe &lt;text&gt;</p><script>const x = "Proxy";</script><style>.Proxy { color: red; }</style><pre>Proxy</pre><input type="text" value="Proxy"><input type="submit" value="Proxy">';
	const masked = maskDocument(html);
	assert.notEqual(masked, html);
	for (const literal of [
		'id="Proxy"',
		'data-endpoint="/api/Proxy"',
		'const x = "Proxy";',
		'.Proxy { color: red; }',
		'<pre>Proxy</pre>',
		'<input type="text" value="Proxy">',
		'&amp;',
		'&lt;',
	])
		assert.ok(masked.includes(literal), literal);
	assert.ok(!masked.includes('title="Proxy"'));
	assert.ok(!masked.includes('<input type="submit" value="Proxy">'));
});

test('masked terms are split by invisible characters, generated each time', () => {
	context({ usingSEO: false });
	const invisible = /\u200b/g;
	for (const text of ['Proxy', 'PROXY', 'proxy', 'Holy Unblocker LTS']) {
		const masked = maskText(text);
		assert.equal(masked.replace(invisible, ''), text, 'reads the same');
	}
	// Each word of a masked term is split at least once, keeping its casing.
	for (let i = 0; i < 50; i++) {
		const [holy, unblocker] = maskText('Holy Unblocker').split(' ');
		assert.match(holy, /^H.*\u200b/u);
		assert.match(unblocker, /^U.+\u200b.+r$/u);
	}
	const variants = new Set(
		Array.from({ length: 50 }, () => maskText('Proxy'))
	);
	assert.ok(variants.size > 1, 'masks vary between renders');
});

test('inline assets preserve script attributes and do not consume remote or missing assets', () => {
	context({
		inlineAssets: true,
		readAsset: (path) =>
			(
				({
					'/local.js': 'const x = "</script>";',
					'/local.css': 'body { color: red; }',
				}) as Record<string, string>
			)[path],
	});
	const result = inlineHtml(
		'<script defer src="/local.js"></script><link rel="stylesheet" href="/local.css"><script src="https://example.com/a.js"></script><script src="/missing.js"></script><link rel="icon" href="/local.css">'
	);
	assert.ok(result.includes('<script defer>'));
	assert.ok(result.includes('<\\/script>'));
	assert.ok(result.includes('<style>body { color: red; }</style>'));
	assert.ok(result.includes('src="https://example.com/a.js"'));
	assert.ok(result.includes('src="/missing.js"'));
	assert.ok(result.includes('rel="icon"'));
});

test('proxy error templates escape supplied script URLs', () => {
	context({
		errors: {
			scramjet: {
				beforeScript: '<script src="',
				afterScript: '"></script>',
			},
		},
	});
	assert.equal(
		renderProxyError('scramjet', '/x?a="<b>&c'),
		'<script src="/x?a=&quot;&lt;b>&amp;c"></script>'
	);
	context({ errors: {} });
	assert.throws(() => renderProxyError('scramjet', '/x'), /Missing/);
});
