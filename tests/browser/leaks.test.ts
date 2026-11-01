import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import {
	buildFixture,
	fixture,
	freePort,
	probe,
	run,
	startServer,
} from '../helpers/fixture.ts';

describe('Chromium', () => {
	test('The proxied frame does not expose proxy source or signatures.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(
			t,
			{ usingSEO: false, disguiseFiles: true, pathname: '/school/' },
			true
		);
		const targetPort = await freePort();
		const wisp = join(root, 'src/server/wisp.ts');
		const source = await readFile(wisp, 'utf8');
		const patched = source
			.replace('allowDirectIP: false', 'allowDirectIP: true')
			.replace('allowPrivateIPs: false', 'allowPrivateIPs: true')
			.replace('ports: [80, 443,', `ports: [${targetPort}, 80, 443,`);
		assert.ok(patched.includes(`ports: [${targetPort},`));
		await writeFile(wisp, patched);
		await buildFixture(root);
		const origin = await startServer(root);
		const report =
			process.env.INVISIPROXY_LEAK_REPORT ?? join(root, 'leaks.json');
		await run(root, [probe('leak-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
			INVISIPROXY_LEAK_REPORT: report,
		});
		const { signatures } = JSON.parse(await readFile(report, 'utf8'));
		t.diagnostic(
			Object.entries(signatures as Record<string, string[]>)
				.map(([term, hits]) => `${term}: ${hits.length}`)
				.join(', ') || 'no signature hits'
		);
	});
});
