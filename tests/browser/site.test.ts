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
	test('The page loader, masking, settings, mirror links and proxying all work in a real browser.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(t, browserSettings);
		await buildFixture(root);
		const targetPort = await freePort();
		const origin = await startServer(root, wispPolicyEnv(targetPort));
		await run(root, [probe('browser-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
	});
});
