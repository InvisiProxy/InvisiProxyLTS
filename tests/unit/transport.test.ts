import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	isMobileBrowser,
	proxyRegions,
	selectedTransport,
	selectedWisp,
} from '../../src/browser/transport.ts';

describe('Transport selection', () => {
	test('Android phones, iPhones and iPads in desktop mode count as mobile.', () => {
		const browser = (
			userAgent: string,
			platform = '',
			maxTouchPoints = 0
		) => ({ userAgent, platform, maxTouchPoints }) as Navigator;
		assert.equal(
			isMobileBrowser(browser('Mozilla/5.0 (Linux; Android 14)')),
			true
		);
		assert.equal(
			isMobileBrowser(browser('Mozilla/5.0 (iPhone; CPU iPhone OS 17)')),
			true
		);
		assert.equal(
			isMobileBrowser(browser('Mozilla/5.0', 'MacIntel', 5)),
			true
		);
		assert.equal(
			isMobileBrowser(browser('Mozilla/5.0', 'Win32', 10)),
			false
		);
		assert.equal(
			isMobileBrowser(browser('Mozilla/5.0', 'MacIntel', 0)),
			false
		);
		assert.equal(
			isMobileBrowser({
				...browser('Mozilla/5.0'),
				userAgentData: { mobile: true },
			} as Navigator),
			true
		);
	});

	test('Mobile always uses epoxy, while desktop keeps a valid saved choice and otherwise uses libcurl.', () => {
		for (const stored of [
			undefined,
			'libcurl',
			'epoxy',
			'retired-transport',
		])
			assert.equal(selectedTransport(stored, true), 'epoxy');
		assert.equal(selectedTransport(undefined, false), 'libcurl');
		assert.equal(selectedTransport('retired-transport', false), 'libcurl');
		assert.equal(selectedTransport('libcurl', false), 'libcurl');
		assert.equal(selectedTransport('epoxy', false), 'epoxy');
	});

	test('Custom wisp works, regions only apply to libcurl, and unknown regions use the default endpoint.', () => {
		const base = 'wss://example.com/wisp/';
		const regions = proxyRegions(false);
		assert.equal(
			selectedWisp({ UseSocks5: 'tor' }, 'libcurl', regions, base),
			'wss://example.com/wisp/tor/'
		);
		assert.equal(
			selectedWisp({ UseSocks5: 'tor' }, 'epoxy', regions, base),
			base
		);
		assert.equal(
			selectedWisp({ UseSocks5: 'patreon' }, 'libcurl', regions, base),
			base
		);
		assert.equal(
			selectedWisp(
				{ UseSocks5: 'tor', CustomWisp: 'wss://wisp.example.net' },
				'libcurl',
				regions,
				base
			),
			'wss://wisp.example.net/'
		);
	});
});
