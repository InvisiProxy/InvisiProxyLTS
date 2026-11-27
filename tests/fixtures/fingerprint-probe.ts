import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Frame } from 'playwright';

// Serve a page containing a single marked div; through the proxied frame,
// every other element/attribute comes from scramjet. Dump the fingerprints.

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

const target = createServer((req, res) => {
	res.setHeader('Content-Type', 'text/html');
	if ((req.url ?? '/').includes('inner')) {
		res.end('<!doctype html><p>inner</p>');
		return;
	}
	res.end(
		`<!doctype html><meta charset="utf-8"><div id="mine"></div>` +
			`<iframe src="/inner" width="100" height="50"></iframe>` +
			`<script>var x = 1</script>`
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
	await page.goto(base);
	await page.locator(id('dispense-link')).waitFor({ state: 'attached' });
	await page.goto(
		base +
			Object.keys(pages).find(
				(key) => pages[key] === 'pages/proxnav/scramjet.html'
			)
	);
	await page.waitForFunction(
		(w) =>
			(window as unknown as Record<string, { ready?: boolean }>)['$' + w]
				?.ready === true ||
			(window as unknown as Record<string, { ready?: boolean }>)
				.$invisiScramjet?.ready === true,
		scramjetTokens().wrapper,
		{ timeout: 60_000 }
	);
	await page.locator(id('search-input')).fill(`${targetOrigin}/`);
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
	await page.waitForTimeout(8_000);

	const dump = await frame.evaluate(() => {
		const out = {
			styles: [] as string[],
			elements: [] as string[],
			metas: [] as string[],
			name: String(window.name ?? ''),
		};
		for (const s of document.querySelectorAll('style'))
			out.styles.push(s.textContent?.slice(0, 200) ?? '');
		for (const m of document.querySelectorAll('meta'))
			out.metas.push(m.outerHTML.slice(0, 120));
		const walk = (root: Element) => {
			for (const el of root.querySelectorAll('*')) {
				if (el.id === 'mine' && el.tagName === 'DIV') continue;
				const attrs = [...el.attributes]
					.map((a) => `${a.name}="${a.value.slice(0, 40)}"`)
					.join(' ');
				out.elements.push(
					`<${el.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>`
				);
			}
		};
		walk(document.documentElement);
		// also the iframe's own attributes as seen by the parent (the app page)
		const top = window;
		out.metas.push(
			`window.name=${JSON.stringify(String(top.name ?? ''))}`.slice(
				0,
				120
			)
		);
		return out;
	});
	console.log('--- proxied DOM dump:');
	console.log(JSON.stringify(dump, null, 1));
	const frameAttrs = await frame
		.frameElement()
		.then((e) =>
			e.evaluate((el) =>
				(
					el as unknown as Element & { outerHTML: string }
				).outerHTML.slice(0, 300)
			)
		)
		.catch(() => '(frame element not reachable)');
	console.log('--- the tab iframe element (in the app page):');
	console.log(frameAttrs);

	// Extensions read the NATIVE dom, not scramjet's fakes; reach the tab
	// iframe through its element handle (it sits in a closed shadow root).
	const native = await frame
		.frameElement()
		.then((el) =>
			el.evaluate((node) => {
				const f = node as unknown as HTMLIFrameElement;
				const doc = f.contentDocument;
				return doc
					? {
							ifame: f.outerHTML.slice(0, 400),
							native: doc.documentElement.outerHTML.slice(
								0,
								2500
							),
						}
					: null;
			})
		)
		.catch((e) => `error: ${String(e).split('\n')[0]}`);
	console.log('--- the tab iframe (native, from the app page):');
	console.log(
		typeof native === 'string' ? native : (native?.ifame ?? '(missing)')
	);
	console.log('--- proxied page NATIVE html (what extensions see):');
	console.log(
		typeof native === 'string' ? native : (native?.native ?? '(missing)')
	);
} finally {
	await browser.close();
	target.close();
}
