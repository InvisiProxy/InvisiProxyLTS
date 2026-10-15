import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, project, run } from '../helpers/fixture.ts';

test('config aliases and default pages agree with SEO and disguise modes', async (t) => {
	for (const usingSEO of [true, false])
		for (const disguiseFiles of [true, false]) {
			const root = await fixture(t, {
				usingSEO,
				disguiseFiles,
				pathname: '/school///',
			});
			await run(root, [
				'--input-type=module',
				'-e',
				`
import assert from 'node:assert/strict';
import { serverUrl, serverPort } from './src/config.ts';
import { aliasRoutes, getAltPrefix, getPathAliases } from './src/obfuscation/paths.ts';
import { externalPages as links } from './src/server/links.ts';
const { pages, links: externalPages } = aliasRoutes({ '': 'index.html', links: 'index.html', 'robots.txt': 'robots.txt' }, links);
assert.equal(serverUrl.pathname, '/school/');
assert.equal(serverPort, Number(process.env.PORT));
assert.equal(pages[''], 'index.html');
const aliases = getPathAliases();
assert.equal(pages[aliases.links || 'links'], 'index.html');
if (!${usingSEO}) {
  assert.notEqual(aliases.links, 'links');
  assert.match(aliases.links, /^[A-Za-z]+$/);
  assert.equal(new Set(Object.values(aliases)).size, Object.keys(aliases).length);
}
assert.equal(getAltPrefix('wisp', serverUrl.pathname), '/school/' + (aliases['prefixes/wisp'] || 'wisp') + '/');
assert.equal(externalPages.github[(aliases['github/solidjs'] || 'github/solidjs').split('/').at(-1)], 'https://github.com/solidjs/solid');
assert.equal('robots.txt' in pages, ${usingSEO});
if (${usingSEO}) assert.deepEqual(aliases, {});
else assert.match(aliases['files/sw.js'], /^[A-Za-z]+\\.js$/);
`,
			]);
		}
});

test('invalid PORT values fail clearly before server startup', async (t) => {
	const root = await fixture(t);
	for (const PORT of ['0', '-1', '65536', 'abc', '1.5', ''])
		await assert.rejects(
			run(root, ['-e', "import('./src/config.ts')"], { PORT }),
			/PORT must be an integer/
		);
});

test('configured mirror files resolve from the project root or an absolute path, independently of cwd', async (t) => {
	const { readFile, writeFile } = await import('node:fs/promises');
	const { join } = await import('node:path');
	const { pathToFileURL } = await import('node:url');
	for (const absolute of [false, true]) {
		const root = await fixture(t);
		if (absolute) {
			const config = JSON.parse(
				await readFile(join(root, 'config.json'), 'utf8')
			);
			config.mirrorLinksFile = join(root, 'private/test-links.txt');
			await writeFile(join(root, 'config.json'), JSON.stringify(config));
		}
		await run(root, [
			'--input-type=module',
			'-e',
			`
import assert from 'node:assert/strict';
import { createLinkDispenser } from ${JSON.stringify(pathToFileURL(join(root, 'src/server/link-dispenser.ts')).href)};
import { serve } from ${JSON.stringify(pathToFileURL(join(project, 'tests/helpers/http.ts')).href)};
process.chdir('..');
const app = await serve(createLinkDispenser());
try {
 const response = await app.inject({ method: 'POST', url: '/api/link' });
 assert.equal(response.statusCode, 200);
 assert.ok(['https://first.example/', 'https://second.example/'].includes(response.json().link));
} finally { await app.close(); }
`,
		]);
	}
});
