import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Frame } from 'playwright';

// Set-Cookie must survive the proxy: a proxied response that sets a cookie
// has to reach scramjet's cookie jar intact, and the next request to that
// origin must carry it. Exercises plain, Secure and multiple cookies - the
// shapes cf_clearance uses.

const load = <T>(path: string): Promise<T> =>
	import(pathToFileURL(join(process.cwd(), path)).href);
const { serverUrl } =
	await load<typeof import('../../src/config.ts')>('src/config.ts');
const { pages } = (
	await load<typeof import('../../src/server/routes.ts')>(
		'src/server/routes.ts'
	)
).loadRoutes();
const { classNames, elementIds } = await load<
	typeof import('../../src/obfuscation/classes.ts')
>('src/obfuscation/classes.ts');
const { scramjetTokens } = await load<
	typeof import('../../src/obfuscation/scramjet-signatures.ts')
>('src/obfuscation/scramjet-signatures.ts');
const ids = elementIds();
const id = (name: string) => `#${ids[name] ?? name}`;
const origin = String(process.env.INVISIPROXY_ORIGIN);
const targetPort = Number(process.env.INVISIPROXY_TARGET_PORT);
const targetOrigin = `http://127.0.0.1:${targetPort}`;
const base = origin + serverUrl.pathname;

const seen: string[] = [];
const target = createServer((req, res) => {
	const url = (req.url ?? '/').split('?')[0];
	seen.push(`${req.method} ${url} :: ${req.headers.cookie ?? '(none)'}`);
	res.setHeader('X-Frame-Options', 'ALLOWALL');
	if (url === '/set') {
		res.setHeader('set-cookie', [
			'cf_clearance_test=XYz123; Path=/; HttpOnly; SameSite=Lax',
			'cf_secure_test=Secure1; Path=/; HttpOnly; Secure; SameSite=Lax',
		]);
		res.setHeader('Content-Type', 'text/html');
		res.end(
			`<h1>cookie set</h1><script>location.replace('/page')</script>`
		);
		return;
	}
	res.setHeader('Content-Type', 'text/html');
	res.end(
		`<h1 id="t">echo page</h1><pre id="c">DOC</pre><script>document.getElementById('c').textContent=document.cookie||'(js empty)';</script>`
	);
});
await new Promise<void>((resolve) =>
	target.listen(targetPort, '127.0.0.1', resolve)
);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
	const context = await browser.newContext();
	await context.route('**/*', (request) =>
		new URL(request.request().url()).origin === origin
			? request.continue()
			: request.fulfill({
					contentType: 'application/javascript',
					body: '',
				})
	);
	await context.addInitScript(() =>
		Object.assign(window, { AOS: { init() {}, refresh() {} } })
	);
	const page = await context.newPage();
	page.setDefaultTimeout(90_000);
	const logs: string[] = [];
	page.on('console', (m) =>
		logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`)
	);
	page.on('pageerror', (e) =>
		logs.push(`[pageerror] ${e.message.slice(0, 250)}`)
	);

	await page.goto(base);
	await page.locator(id('dispense-link')).waitFor({ state: 'attached' });
	await page.goto(
		base +
			Object.keys(pages).find(
				(key) => pages[key] === 'pages/proxnav/scramjet.html'
			)
	);
	const wrapper = scramjetTokens().wrapper;
	try {
		await page.waitForFunction(
			(w) =>
				(window as unknown as Record<string, { ready?: boolean }>)[
					'$' + w
				]?.ready === true ||
				(window as unknown as Record<string, { ready?: boolean }>)
					.$invisiScramjet?.ready === true,
			wrapper,
			{ timeout: 60_000 }
		);
	} catch (error) {
		console.log('ready failed; console tail:');
		for (const l of logs.slice(-14)) console.log('  ', l);
		throw error;
	}
	await page.locator(id('search-input')).fill(`${targetOrigin}/set`);
	await page.locator(id('search-input')).press('Enter');

	const tabClasses = classNames()['proxy-tab'] ?? 'proxy-tab';
	let frame: Frame | undefined;
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline && !frame) {
		for (const f of page.mainFrame().childFrames()) {
			if (f.url() === 'about:blank') continue;
			const owner = await f
				.frameElement()
				.then((e) => e.getAttribute('class'))
				.catch(() => null);
			if ((owner ?? '').split(/\s+/).includes(tabClasses)) {
				frame = f;
				break;
			}
		}
		if (!frame) await page.waitForTimeout(500);
	}
	if (!frame) throw new Error('proxied frame not found');
	if (frame.url().startsWith('chrome-error:'))
		throw new Error(`navigation failed: ${frame.url()}`);
	await page.waitForTimeout(10_000);
	const doc = await frame.evaluate(() => ({
		title: document.title,
		cookie: document.cookie || '(js empty)',
	}));
	console.log('proxied page sees:', JSON.stringify(doc, null, 1));
	console.log('--- requests the target server received:');
	for (const s of seen) console.log('  ', s);
	const carried = seen.some((s) => s.includes('cf_clearance_test=XYz123'));
	console.log(carried ? 'PASS: cookie carried' : 'FAIL: cookie lost');
	if (!carried) process.exitCode = 1;
} finally {
	await browser.close();
	target.close();
}
