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

describe('DLPCC relay', () => {
	test('Every proxied WebRTC connection goes through the relay at 100 Mbps or more.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(t, { dlpcc: true }, true);
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
		const output = await run(root, [probe('dlpcc-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
		t.diagnostic(output.trim());
	});
});
