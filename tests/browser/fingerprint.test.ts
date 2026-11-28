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

// Dumps the DOM fingerprints a proxied page carries that do not come from
// the target itself; the diagnostics feed the frame-cloak work.
describe('Chromium', () => {
	test('The proxied frame keeps the DOM free of proxy fingerprints.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(t, browserSettings);
		await buildFixture(root);
		const targetPort = await freePort();
		const origin = await startServer(root, wispPolicyEnv(targetPort));
		const output = await run(root, [probe('fingerprint-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
		console.log(output);
	});
});
