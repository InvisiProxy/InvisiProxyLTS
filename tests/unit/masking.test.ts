import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildValues } from '../../src/build/values.ts';
import { maskDocument } from '../../src/obfuscation/mask-document.ts';
import { maskText } from '../../src/obfuscation/masks.ts';
import { setSiteValues } from '../../src/site.ts';

const mask = (usingSEO: boolean) =>
	setSiteValues({
		...buildValues,
		usingSEO,
		characters: ['​'],
		maskedTerms: ['Proxy'],
	});
const unmask = (text: string) => text.replaceAll('​', '');

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
});
