import { describe, test } from 'node:test';
import { fixture, probe, run } from '../helpers/fixture.ts';

describe('Obfuscation', () => {
	test('Obfuscated scripts, documents and class names still work.', async (t) => {
		const root = await fixture(t, { usingSEO: false, minifyScripts: true });
		await run(root, [probe('obfuscation-probe.ts')]);
	});

	test('SEO mode leaves scripts, documents and class names unchanged.', async (t) => {
		const root = await fixture(t, { usingSEO: true });
		await run(root, [probe('obfuscation-probe.ts')]);
	});
});
