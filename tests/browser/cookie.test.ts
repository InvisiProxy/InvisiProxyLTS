import assert from 'node:assert/strict';
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

// Set-Cookie through the proxied pipeline must reach scramjet's cookie jar
// and ride the next request to that origin (the http-cache plugin used to
// mangle the header pairs on the buffering path).
describe('Chromium', () => {
	test('Cookies set by a proxied page survive the next request.', {
		timeout: 900_000,
	}, async (t) => {
		const root = await fixture(t, browserSettings);
		await buildFixture(root);
		const targetPort = await freePort();
		const origin = await startServer(root, wispPolicyEnv(targetPort));
		const output = await run(root, [probe('cookie-probe.ts')], {
			INVISIPROXY_ORIGIN: origin,
			INVISIPROXY_TARGET_PORT: String(targetPort),
		});
		console.log(output);
		assert.match(output, /PASS: cookie carried/);
	});
});
