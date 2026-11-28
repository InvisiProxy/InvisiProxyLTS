import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import {
	browserSettings,
	buildFixture,
	fixture,
	freePort,
	probe,
	run,
	startServer,
	wispPolicyEnv,
} from '../helpers/fixture.ts';

describe('Chromium', () => {
	test('The proxied frame does not expose proxy source or signatures.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(t, browserSettings);
		await buildFixture(root);
		const targetPort = await freePort();
		const origin = await startServer(root, wispPolicyEnv(targetPort));
		const report =
			process.env.INVISIPROXY_LEAK_REPORT ?? join(root, 'leaks.json');
		await run(root, [probe('leak-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
			INVISIPROXY_LEAK_REPORT: report,
		});
		const { findings, signatures } = JSON.parse(
			await readFile(report, 'utf8')
		);
		const { framing } = findings;
		assert.equal(
			framing.frameElement,
			false,
			'window.frameElement must read null in the outermost frame'
		);
		assert.equal(
			framing.parentDom.iframes,
			0,
			'the shell tabs must stay inside the closed shadow root'
		);
		assert.deepEqual(
			framing.fakeAncestorOrigins,
			[],
			'the fake location must read like a real top-level page'
		);
		t.diagnostic(
			Object.entries(signatures as Record<string, string[]>)
				.map(([term, hits]) => `${term}: ${hits.length}`)
				.join(', ') || 'no signature hits'
		);
	});
});
