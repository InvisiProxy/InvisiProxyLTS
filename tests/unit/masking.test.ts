import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { decompress } from 'woff2-encoder';
import { buildValues } from '../../src/build/values.ts';
import { fontFaces, patchFont, readCmap } from '../../src/obfuscation/fonts.ts';
import { maskDocument } from '../../src/obfuscation/mask-document.ts';
import {
	disguiseText,
	maskText,
	plainText,
} from '../../src/obfuscation/masks.ts';
import { homoglyphs, letters, setSiteValues } from '../../src/site.ts';

const key = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
const mask = (usingSEO: boolean, cipher = false) =>
	setSiteValues({
		...buildValues,
		usingSEO,
		characters: ['​'],
		maskedTerms: ['Proxy'],
		factAttribute: 'data-fact',
		fontCipher: {
			key: cipher ? key : '',
			tag: cipher ? 'x-c' : '',
			property: '--c',
			families: {},
			icons: {},
			preload: [],
		},
	});
const lookalikes = Object.fromEntries(
	Object.entries(homoglyphs).map(([letter, glyph]) => [glyph, letter])
);
const unmask = (text: string) =>
	text.replaceAll('​', '').replace(/./gu, (char) => lookalikes[char] ?? char);

describe('Masking', () => {
	test('Visible text and titles are masked, while scripts, IDs and input values stay intact.', () => {
		mask(false);
		const html =
			'<p id="Proxy" title="Proxy">Proxy &amp; text</p><script>const x = "Proxy";</script><input type="text" value="Proxy">';
		const masked = maskDocument(html);
		assert.notEqual(masked, html);
		assert.equal(unmask(masked), html);
		for (const literal of [
			'id="Proxy"',
			'const x = "Proxy";',
			'<input type="text" value="Proxy">',
		])
			assert.ok(masked.includes(literal), literal);
		assert.ok(!masked.includes('title="Proxy"'));
		assert.notEqual(maskText('Proxy'), 'Proxy');
		assert.equal(unmask(maskText('Proxy')), 'Proxy');
		for (const word of ['proxy', 'PROXY', 'webProxy'])
			assert.doesNotMatch(maskText(word), /pr|ro|ox|xy/i, word);
	});

	test('SEO mode leaves all text unmasked.', () => {
		mask(true);
		const html = '<p title="Proxy">Proxy &amp; text</p>';
		assert.equal(maskText('Proxy'), 'Proxy');
		assert.equal(maskDocument(html), html);
	});

	test('Ciphered text is wrapped and reads back as the original, except titles, options and decoys.', () => {
		mask(false, true);
		const html =
			'<title>Proxy</title><p>Hi &amp; bye</p><select><option>Auto</option></select><span data-fact="x">Seal</span>';
		const masked = unmask(maskDocument(html));
		assert.ok(masked.includes('<p><x-c>Io &amp; wnt</x-c></p>'), masked);
		for (const literal of [
			'<title>Proxy</title>',
			'<option>Auto</option>',
			'<span data-fact="x">Seal</span>',
		])
			assert.ok(masked.includes(literal), literal);
		assert.equal(plainText('Io wnt'), 'Hi bye');
		assert.ok(!maskDocument(html).includes('Proxy'));
		setSiteValues({ ...buildValues, usingSEO: false });
		for (const term of buildValues.maskedTerms)
			assert.doesNotMatch(
				disguiseText(term),
				new RegExp(term, 'i'),
				`${term} should be disguised`
			);
	});

	test('Titles, tooltips and placeholders swap every letter that has a lookalike, and tippy tooltips are ciphered.', () => {
		mask(false, true);
		const html =
			'<title>Browsing</title><button title="Close tab" placeholder="Search" data-tippy-content="Hi"></button>';
		const masked = maskDocument(html);
		for (const text of ['Browsing', 'Close tab', 'Search'])
			assert.ok(!masked.includes(text), text);
		assert.doesNotMatch(
			masked,
			new RegExp(
				`[${Object.keys(homoglyphs).join('')}](?=[^<>]*</title>)`
			)
		);
		assert.equal(
			new Set(Object.values(homoglyphs)).size,
			Object.keys(homoglyphs).length,
			'Every lookalike should map back to a single letter.'
		);
		assert.ok(masked.includes('data-tippy-content="Io"'), masked);
		assert.equal(unmask(masked).replace('"Io"', '"Hi"'), html);
		mask(true);
		assert.equal(maskDocument(html), html);
	});

	test('Patched fonts draw swapped letters and lookalikes with the original glyphs.', async () => {
		mask(false, true);
		const face = fontFaces().find((face) => face.letters);
		assert.ok(face);
		const font = await decompress(readFileSync(face.source));
		const before = readCmap(font).map;
		const after = readCmap(patchFont(font, key)).map;
		const plain = readCmap(patchFont(font, '')).map;
		for (let i = 0; i < letters.length; i++)
			assert.equal(
				after.get(key.charCodeAt(i)),
				before.get(letters.charCodeAt(i)),
				letters[i]
			);
		for (const [letter, glyph] of Object.entries(homoglyphs))
			assert.equal(
				plain.get(glyph.charCodeAt(0)),
				before.get(letter.charCodeAt(0)),
				letter
			);
		assert.equal(after.get(0x20), before.get(0x20));
		assert.equal(plain.get(0x61), before.get(0x61));
	});
});
