import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { skipHttpCache } from '../../src/browser/http-cache.ts';

const length = (bytes: number): [string, string][] => [
	['Content-Length', String(bytes)],
];

describe('HTTP cache guard', () => {
	test('Media and ranged responses bypass the cache.', () => {
		assert.equal(skipHttpCache('video', [], length(100)), true);
		assert.equal(skipHttpCache('audio', [], []), true);
		assert.equal(
			skipHttpCache('', [['range', 'bytes=0-']], length(100)),
			true
		);
		for (const type of [
			'video/mp4',
			'audio/mpeg',
			'application/vnd.apple.mpegurl',
			'video/MP2T',
			'application/octet-stream',
		])
			assert.equal(
				skipHttpCache('script', [], [['content-type', type]]),
				true,
				type
			);
	});

	test('Attachment responses bypass the cache, however they are labeled.', () => {
		for (const headers of [
			[['content-disposition', 'attachment; filename="map.zip"']],
			[
				['content-type', 'text/html'],
				['content-disposition', 'attachment; filename="map.zip"'],
			],
			[
				['content-type', 'application/zip'],
				['content-disposition', 'attachment; filename="map.zip"'],
			],
		] as [string, string][][]) {
			assert.equal(
				skipHttpCache('document', [], headers),
				true,
				`${headers}`
			);
		}
		
		assert.equal(
			skipHttpCache(
				'iframe',
				[],
				[
					['content-type', 'text/html'],
					['content-disposition', 'ATTACHMENT; filename="skin.zip"'],
				]
			),
			true
		);

		assert.equal(
			skipHttpCache(
				'document',
				[],
				[
					['content-disposition', 'inline'],
					['content-length', '128'],
				]
			),
			false
		);
	});

	test('Large or unsized fetch bodies bypass the cache, page assets do not.', () => {
		assert.equal(skipHttpCache('', [], length(1024)), false);
		assert.equal(skipHttpCache('', [], length(512 * 1024)), true);
		assert.equal(skipHttpCache('', [], []), true);
		assert.equal(skipHttpCache('script', [], length(1024 * 1024)), false);
		assert.equal(skipHttpCache('script', [], []), false);
		assert.equal(skipHttpCache('image', [], length(8 * 1024 * 1024)), true);
	});
});
