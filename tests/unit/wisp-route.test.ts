import assert from 'node:assert/strict';
import test from 'node:test';
import {
	isWispRequest,
	matchesWispPath,
	wispRegion,
} from '../../src/server/wisp.ts';

// Explicit route keeps these tests pure: the default derives from the
// generated path aliases, which would touch the obfuscation state file.
const route = '/base/automobilities/';

test('matches the canonical wisp path with or without a trailing slash', () => {
	assert.equal(matchesWispPath('/base/automobilities/', route), true);
	assert.equal(matchesWispPath('/base/automobilities', route), true);
});

test('collapses duplicated slashes in the wisp path', () => {
	assert.equal(matchesWispPath('/base//automobilities/', route), true);
});

test('matches percent-encoded slashes, including double-encoded ones', () => {
	assert.equal(matchesWispPath('/base/automobilities%2F', route), true);
	assert.equal(matchesWispPath('/base%2Fautomobilities%2F', route), true);
	assert.equal(matchesWispPath('/base%252Fautomobilities%252F', route), true);
});

test('isWispRequest ignores query strings and fragments', () => {
	assert.equal(isWispRequest('/base/automobilities/?wisp=1', route), true);
	assert.equal(isWispRequest('/base/automobilities?wisp=1', route), true);
	assert.equal(isWispRequest('/base/automobilities/#x', route), true);
	assert.equal(isWispRequest('/base/automobilities%2F?v=1', route), true);
});

test('rejects non-wisp urls even when they reference the wisp path', () => {
	assert.equal(isWispRequest(null, route), false);
	assert.equal(isWispRequest(undefined, route), false);
	assert.equal(isWispRequest('/', route), false);
	assert.equal(isWispRequest('/base/other', route), false);
	assert.equal(isWispRequest('/base/automobilities2/', route), false);
	assert.equal(isWispRequest('/base/automobilities/deeper/', route), false);
	assert.equal(
		isWispRequest('/base/other/?next=/base/automobilities/', route),
		false
	);
	assert.equal(isWispRequest('/automobilities/', route), false);
});

test('malformed escapes fall back to the raw path without matching', () => {
	assert.equal(
		matchesWispPath('/base/automobilities%2F%E0%A4%A', route),
		false
	);
	assert.equal(isWispRequest('/base/automobilities%ZZ', route), false);
	assert.equal(isWispRequest('/base/automobilities/%', route), false);
});

test('normalization tricks cannot smuggle another path onto wisp', () => {
	assert.equal(
		matchesWispPath('/base/automobilities/../other/', route),
		false
	);
	assert.equal(
		matchesWispPath('/base%2Fautomobilities%2Fother', route),
		false
	);
});

test('regional wisp endpoints resolve to their backend', () => {
	assert.equal(wispRegion('/base/automobilities/', route), '');
	assert.equal(wispRegion('/base/automobilities', route), '');
	assert.equal(wispRegion('/base/automobilities/?v=1', route), '');
	assert.equal(wispRegion('/base/automobilities/eu/', route), 'eu');
	assert.equal(wispRegion('/base/automobilities/tor?x=1', route), 'tor');
	assert.equal(wispRegion('/base/automobilities/jp%2F', route), 'jp');
	assert.equal(wispRegion(null, route), null);
});

test('unknown or nested region paths are not wisp requests', () => {
	assert.equal(wispRegion('/base/automobilities/nope/', route), null);
	assert.equal(wispRegion('/base/automobilities/eu/deeper/', route), null);
	assert.equal(wispRegion('/base/automobilities2/eu/', route), null);
	assert.equal(isWispRequest('/base/other/eu/', route), false);
});

test('isWispRequest accepts regional endpoints in every encoding', () => {
	assert.equal(isWispRequest('/base/automobilities/eu/', route), true);
	assert.equal(isWispRequest('/base/automobilities%2Feu?v=1', route), true);
	assert.equal(isWispRequest('/base/automobilities/eu/x/', route), false);
});
