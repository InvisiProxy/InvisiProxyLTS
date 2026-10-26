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
	test('The page loader, masking, settings, mirror links and proxying all work in a real browser.', {
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
		await run(root, [probe('browser-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
	});
});
