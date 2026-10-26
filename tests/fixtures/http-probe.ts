import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { serve, testClientIp } from '../helpers/http.ts';

const load = <T>(path: string): Promise<T> =>
	import(pathToFileURL(join(process.cwd(), path)).href);
const { createSiteHandler } = await load<
	typeof import('../../src/server/handler.ts')
>('src/server/handler.ts');
const { config, serverUrl } =
	await load<typeof import('../../src/config.ts')>('src/config.ts');
const { apiPath, getPathAliases } = await load<
	typeof import('../../src/obfuscation/paths.ts')
>('src/obfuscation/paths.ts');
const { pages } = (
	await load<typeof import('../../src/server/routes.ts')>(
		'src/server/routes.ts'
	)
).loadRoutes();
const { siteFiles } = await load<typeof import('../../src/build/sources.ts')>(
	'src/build/sources.ts'
);

const base = serverUrl.pathname;
const disguise = config.disguiseFiles ? '.ico' : '';
const built = (file: string) => readFile(join('views/dist', file));
const home = config.usingSEO ? 'index.html' : 'pages/proxnav/scramjet.html';
const serves = async (payload: Buffer, file: string) =>
	assert.ok(payload.equals(await built(file)), `${file} was not served as built`);
const decode = (buffer: Buffer) =>
	(buffer[0] === 0x1f && buffer[1] === 0x8b
		? gunzipSync(buffer)
		: buffer
	).toString();
const app = await serve(createSiteHandler({ clientIp: testClientIp }));

try {
	for (const [name, file] of Object.entries(pages)) {
		const page = file.endsWith('.html');
		const response = await app.inject(base + name + (page ? disguise : ''));
		assert.equal(response.statusCode, 200, name);
		await serves(response.rawPayload, name ? file : home);
		if (page) {
			const html = decode(response.rawPayload);
			assert.match(html, /^<!doctype html>/i, file);
			assert.doesNotMatch(html, /InvisiProxy obfuscated/i, file);
			assert.ok(!html.includes('PRIVATE_TEST_MARKER'), file);
		}
	}

	const root = await app.inject(base);
	assert.equal(root.statusCode, 200);
	await serves(
		root.rawPayload,
		config.disguiseFiles ? 'pages/misc/deobf/entry-point.html' : home
	);
	const links = base + (getPathAliases().links || 'links');
	if (config.disguiseFiles)
		await serves(
			(await app.inject(links)).rawPayload,
			'pages/misc/deobf/loader.html'
		);
	const hidden = await app.inject({
		url: links + disguise,
		headers: { cookie: 'HistoryHide=true', 'sec-fetch-dest': 'document' },
	});
	assert.equal(hidden.statusCode, 404);

	for (const file of siteFiles().filter(
		(file) => file.kind === 'vendor-script'
	)) {
		const same = (await built(file.target)).equals(
			await readFile(file.source)
		);
		assert.equal(same, config.usingSEO, file.target);
	}

	for (const path of [
		'private/test-links.txt',
		'config.json',
		'.obfuscation.json',
		'src/config.ts',
		'assets/%2e%2e/%2e%2e/private/test-links.txt',
	]) {
		const response = await app.inject(base + path);
		assert.equal(response.statusCode, 404, path);
		assert.ok(!response.body.includes('PRIVATE_TEST_MARKER'), path);
	}

	const api = await app.inject({ method: 'POST', url: `${base}${apiPath('link')}` });
	assert.equal(api.statusCode, 200);
	assert.equal(api.headers['cache-control'], 'no-store');
	assert.ok(
		['https://first.example/', 'https://second.example/'].includes(
			api.json().link
		)
	);
	assert.equal(
		(await app.inject({ method: 'POST', url: `${base}${apiPath('link')}` }))
			.statusCode,
		429
	);

	const clear = (site: string) =>
		app.inject({
			method: 'POST',
			url: `${base}${apiPath('clear')}`,
			headers: { 'sec-fetch-site': site },
		});
	assert.equal(
		(await clear('same-origin')).headers['clear-site-data'],
		'"cache", "storage"'
	);
	assert.equal(
		(await clear('cross-site')).headers['clear-site-data'],
		undefined
	);
} finally {
	await app.close();
}
