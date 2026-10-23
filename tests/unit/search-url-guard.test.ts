import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	readProxiedSearchInputQuery,
	sanitizeScramjetNavigateUrl,
} from '../../src/browser/search-url-guard.ts';

const base = 'https://duckduckgo.com/?q=old';
const recover = () => 'cats';

describe('Search URL guard', () => {
	test('Normal navigations pass through untouched.', () => {
		for (const href of [
			'/?q=cats&ia=web',
			'https://duckduckgo.com/about',
			'javascript:undefined',
			'#undefined',
		])
			assert.equal(
				sanitizeScramjetNavigateUrl(href, base, recover),
				href
			);
	});

	test('Coerced undefined navigations recover the search box query or are blocked.', () => {
		assert.equal(
			sanitizeScramjetNavigateUrl(undefined, base, recover),
			'/?q=cats'
		);
		assert.equal(
			sanitizeScramjetNavigateUrl('/undefined', base, recover),
			'/?q=cats'
		);
		assert.equal(
			sanitizeScramjetNavigateUrl('/?q=undefined&ia=web', base, recover),
			'/?q=cats&ia=web'
		);
		assert.equal(
			sanitizeScramjetNavigateUrl(
				'https://duckduckgo.com/?q=null&t=undefined',
				base,
				recover
			),
			'https://duckduckgo.com/?q=cats'
		);
		assert.equal(
			sanitizeScramjetNavigateUrl('/?q=undefined', base, () => 'null'),
			null
		);
	});

	test('The search box query is read from the first usable input.', () => {
		const inputs: Record<string, { value: string }> = {
			'#search_form_input': { value: ' undefined ' },
			"input[name='q']": { value: ' dogs ' },
		};
		assert.equal(
			readProxiedSearchInputQuery({
				querySelector: (selector: string) =>
					(inputs[selector] ?? null) as unknown as Element | null,
			}),
			'dogs'
		);
	});
});
