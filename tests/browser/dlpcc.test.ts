import { describe, test } from 'node:test';
import {
	buildFixture,
	fixture,
	freePort,
	probe,
	run,
	startServer,
	wispPolicyEnv,
} from '../helpers/fixture.ts';

describe('DLPCC relay', () => {
	test('Every proxied WebRTC connection goes through the relay at 50 Mbps or more.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(t, { dlpcc: true });
		await buildFixture(root);
		const targetPort = await freePort();
		const origin = await startServer(root, wispPolicyEnv(targetPort));
		const output = await run(root, [probe('dlpcc-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
		t.diagnostic(output.trim());
	});
});
