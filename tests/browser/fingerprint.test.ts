import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	buildFixture,
	fixture,
	freePort,
	probe,
	run,
	startServer,
} from '../helpers/fixture.ts';

// Dumps the DOM fingerprints a proxied page carries that do not come from
// the target itself; the diagnostics feed the frame-cloak work.
describe('Chromium', () => {
	test('The proxied frame keeps the DOM free of proxy fingerprints.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(
			t,
			{ usingSEO: false, disguiseFiles: true, pathname: '/networking/' },
			true
		);
		await buildFixture(root);
		const targetPort = await freePort();
		const wispFile = join(root, 'src/server/wisp.ts');
		const wispSource = await readFile(wispFile, 'utf8');
		const patched = wispSource
			.replace('directIp: false', 'directIp: true')
			.replace('loopbackIps: false', 'loopbackIps: true')
			.replace('privateIps: false', 'privateIps: true')
			.replace('ports: [80, 443]', `ports: [${targetPort}, 80, 443]`);
		assert.ok(patched.includes(`ports: [${targetPort}, 80, 443]`));
		await writeFile(wispFile, patched);
		await buildFixture(root);
		const origin = await startServer(root);
		const output = await run(root, [probe('fingerprint-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
		console.log(output);
	});
});
