import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	customUserAgentValue,
	profileFromUserAgent,
	rewriteHeaders,
	sessionFingerprint,
	storedUserAgent,
	userAgentPresets,
} from '../../src/browser/fingerprint.ts';

const preset = (id: string) =>
	userAgentPresets.find((entry) => entry.id === id)?.userAgent ?? '';

describe('Browser fingerprint', () => {
	test('Presets and valid custom agents resolve, broken custom agents do not.', () => {
		assert.equal(storedUserAgent('firefox-linux'), preset('firefox-linux'));
		assert.equal(storedUserAgent(customUserAgentValue('Agent/1.0')), 'Agent/1.0');
		assert.equal(storedUserAgent(customUserAgentValue('a\nb')), null);
		assert.equal(storedUserAgent('unknown'), null);
		assert.equal(storedUserAgent(undefined), null);
	});

	test('Requests carry the chosen agent and only Chromium agents send client hints.', () => {
		const headers: [string, string][] = [
			['accept', '*/*'],
			['user-agent', 'Real/1.0'],
			['sec-ch-ua', '"Real";v="1"'],
			['sec-ch-ua-platform', '"Real"'],
		];
		const chrome = rewriteHeaders(
			headers,
			profileFromUserAgent(preset('chrome-windows'))
		);
		assert.deepEqual(Object.fromEntries(chrome), {
			accept: '*/*',
			'user-agent': preset('chrome-windows'),
			'sec-ch-ua':
				'"Chromium";v="141", "Google Chrome";v="141", "Not?A_Brand";v="99"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
		});
		const firefox = rewriteHeaders(
			headers,
			profileFromUserAgent(preset('firefox-android'))
		);
		assert.deepEqual(Object.fromEntries(firefox), {
			accept: '*/*',
			'user-agent': preset('firefox-android'),
		});
		const iphone = profileFromUserAgent(preset('safari-iphone'));
		assert.equal(iphone.platform, 'iPhone');
		assert.equal(iphone.mobile, true);
		assert.equal(iphone.chromium, undefined);
	});

	test('A randomized session keeps the same desktop browser until it is cleared.', () => {
		const store = new Map<string, string>();
		const session = {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => void store.set(key, value),
		};
		const first = sessionFingerprint(session, 'fp', () => 0.5);
		const again = sessionFingerprint(session, 'fp', () => 0);
		assert.equal(first.preset.category, 'desktop');
		assert.deepEqual(again, first);
		store.set('fp', '{"preset":"missing"}');
		assert.equal(sessionFingerprint(session, 'fp', () => 0).preset.id, 'chrome-windows');
	});
});
