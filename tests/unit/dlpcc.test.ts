import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, test } from 'node:test';
import {
	publicHost,
	relayDefaults,
	visitorIp,
} from '../../src/server/dlpcc.ts';

const request = (remoteAddress: string, realIp?: string) =>
	({
		socket: { remoteAddress },
		headers: realIp ? { 'x-real-ip': realIp } : {},
	}) as unknown as IncomingMessage;

describe('DLPCC relay', () => {
	test('Private instances get looser limits, each overridable by its DLPCC_* variable.', () => {
		assert.deepEqual(relayDefaults({}), {
			rateLimit: 600,
			rateLimitBurst: 100,
			maxAllocsPerUser: 32,
			maxAllocs: 4000,
		});
		const tuned = relayDefaults({
			DLPCC_RATE_LIMIT: '30',
			DLPCC_MAX_ALLOCS_PER_USER: '8',
		});
		assert.equal(tuned.rateLimit, undefined);
		assert.equal(tuned.maxAllocsPerUser, undefined);
		assert.equal(tuned.rateLimitBurst, 100);
	});

	test('turn.* gives every mirror its own TURN name, and plain names are left to DLPCC.', () => {
		const host = publicHost('turn.*');
		assert.ok(host);
		assert.equal(host('example.com'), 'turn.example.com');
		assert.equal(host('www.mirror2.net'), 'turn.mirror2.net');
		assert.equal(host('203.0.113.7'), '203.0.113.7');
		assert.equal(host('[2001:db8::1]'), '[2001:db8::1]');
		assert.equal(publicHost('turn.example.com'), undefined);
		assert.equal(publicHost(''), undefined);
	});

	test('X-Real-IP is only trusted from NGINX on loopback.', () => {
		assert.equal(
			visitorIp(request('127.0.0.1', '203.0.113.9')),
			'203.0.113.9'
		);
		assert.equal(
			visitorIp(request('::ffff:127.0.0.1', '203.0.113.9')),
			'203.0.113.9'
		);
		assert.equal(visitorIp(request('::1', '203.0.113.9')), '203.0.113.9');
		assert.equal(
			visitorIp(request('198.51.100.4', '203.0.113.9')),
			'198.51.100.4'
		);
		assert.equal(visitorIp(request('127.0.0.1')), '127.0.0.1');
	});
});
