import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Frame, type Page } from 'playwright';
import { tabFrame } from '../helpers/tab-frame.ts';

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
const { getPathAliases } = await load<
	typeof import('../../src/obfuscation/paths.ts')
>('src/obfuscation/paths.ts');
const { scramjetTokens } = await load<
	typeof import('../../src/obfuscation/scramjet-signatures.ts')
>('src/obfuscation/scramjet-signatures.ts');

const ids = elementIds();
const id = (name: string) => `#${ids[name] ?? name}`;
const activeTab = ['proxy-tab', 'active-tab'].map(
	(name) => classNames()[name] ?? name
);
const origin = String(process.env.INVISIPROXY_ORIGIN);
const base = origin + serverUrl.pathname;
const route = (file: string) =>
	base + Object.keys(pages).find((key) => pages[key] === file);
const targetPort = Number(process.env.INVISIPROXY_TARGET_PORT);
const targetOrigin = `http://127.0.0.1:${targetPort}`;
const tokens = scramjetTokens();
const aliases = getPathAliases();

const targetPage = `<!doctype html><html><head><title>Leak target</title>
<link rel="stylesheet" href="/style.css">
<script src="/external.js"></script>
</head><body>
<h1>Leak target</h1>
<a id="link" href="/next?q=1">next</a>
<form id="form" action="/search"><input name="q" value="cats"></form>
<img src="/pixel.gif">
<script>
window.__inline = {
	stack: new Error('inline').stack,
	current: document.currentScript && document.currentScript.outerHTML,
};
document.documentElement.dataset.leakReady = '1';
</script>
</body></html>`;

const target = createServer((req, res) => {
	const path = req.url?.split('?')[0];
	if (path === '/external.js') {
		res.setHeader('content-type', 'text/javascript');
		return res.end("window.__external = new Error('external').stack;");
	}
	if (path === '/style.css') {
		res.setHeader('content-type', 'text/css');
		return res.end('body { background: url(/bg.gif); }');
	}
	if (path === '/data.json') {
		res.setHeader('content-type', 'application/json');
		return res.end('{"ok":true}');
	}
	if (path === '/' || path === '/next') {
		res.setHeader('content-type', 'text/html');
		return res.end(targetPage);
	}
	res.statusCode = 404;
	res.end();
});
await new Promise<void>((resolve) =>
	target.listen(targetPort, '127.0.0.1', resolve)
);

// Everything here runs inside the page, so it must stay self-contained.
const mainWorldProbe = async () => {
	const win = window as unknown as Record<string, unknown>;
	const describe = (fn: unknown) => {
		try {
			return Function.prototype.toString.call(fn).slice(0, 300);
		} catch (error) {
			return `throws: ${(error as Error).message}`;
		}
	};
	const stackOf = (action: () => unknown) => {
		try {
			action();
			return null;
		} catch (error) {
			return String((error as Error)?.stack ?? error);
		}
	};
	const natives: Record<string, unknown> = {
		fetch,
		'XMLHttpRequest.prototype.open': XMLHttpRequest.prototype.open,
		'document.createElement': document.createElement,
		'Element.prototype.setAttribute': Element.prototype.setAttribute,
		'Element.prototype.getAttribute': Element.prototype.getAttribute,
		'EventTarget.prototype.addEventListener':
			EventTarget.prototype.addEventListener,
		'Function.prototype.toString': Function.prototype.toString,
		'history.pushState': history.pushState,
		postMessage: window.postMessage,
		eval: window.eval,
		Function,
		Worker,
		WebSocket,
		Request,
		'URL.prototype.toString': URL.prototype.toString,
		'innerHTML.set': Object.getOwnPropertyDescriptor(
			Element.prototype,
			'innerHTML'
		)?.set,
		'location.href.get': Object.getOwnPropertyDescriptor(
			Location.prototype,
			'href'
		)?.get,
		'HTMLScriptElement.src.get': Object.getOwnPropertyDescriptor(
			HTMLScriptElement.prototype,
			'src'
		)?.get,
		'document.cookie.get': Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.get,
	};
	let listenerStack = '';
	const listener = () => (listenerStack = new Error('listener').stack ?? '');
	addEventListener('leakprobe', listener);
	dispatchEvent(new Event('leakprobe'));
	removeEventListener('leakprobe', listener);
	const fetched = await fetch('/data.json')
		.then((response) => response.url)
		.catch((error) => `throws: ${error}`);
	return {
		globals: Object.getOwnPropertyNames(window),
		symbols: Object.getOwnPropertySymbols(window).map(String),
		documentProps: Object.getOwnPropertyNames(document),
		natives: Object.fromEntries(
			Object.entries(natives).map(([name, fn]) => [name, describe(fn)])
		),
		stacks: {
			inline: (win.__inline as { stack?: string })?.stack,
			external: win.__external,
			evaluate: new Error('evaluate').stack,
			listener: listenerStack,
			createElement: stackOf(() =>
				(document.createElement as (...a: unknown[]) => unknown).call(
					null,
					'div'
				)
			),
			setAttribute: stackOf(() =>
				Element.prototype.setAttribute.call(null, 'a', 'b')
			),
			toString: stackOf(() => Function.prototype.toString.call({})),
			pushState: stackOf(() =>
				history.pushState(null, '', 'http://invalid.example/')
			),
		},
		currentScript: (win.__inline as { current?: string })?.current,
		location: {
			href: location.href,
			url: document.URL,
			baseURI: document.baseURI,
			referrer: document.referrer,
			origin: location.origin,
			ancestorOrigins: [...(location.ancestorOrigins ?? [])],
		},
		fetchedUrl: fetched,
		resources: performance.getEntries().map((entry) => entry.name),
		serviceWorker: navigator.serviceWorker?.controller?.scriptURL ?? null,
		parentReachable: (() => {
			try {
				return Object.getOwnPropertyNames(parent).length;
			} catch {
				return 'blocked';
			}
		})(),
		html: document.documentElement.outerHTML,
	};
};

// Runs in an isolated world, like a filter extension's content script:
// no page hooks, raw DOM.
const isolatedWorldProbe = `(() => {
	const attributes = new Set();
	for (const element of document.querySelectorAll('*'))
		for (const { name } of element.attributes) attributes.add(name);
	return JSON.stringify({
		html: document.documentElement.outerHTML,
		attributes: [...attributes],
		scripts: [...document.scripts].map((script) => ({
			src: script.getAttribute('src'),
			type: script.getAttribute('type'),
			text: script.textContent.slice(0, 400),
		})),
		resources: performance.getEntries().map((entry) => entry.name),
		url: location.href,
	});
})()`;

async function isolatedWorld(page: Page, frame: Frame) {
	const cdp = await page.context().newCDPSession(page);
	const { frameTree } = await cdp.send('Page.getFrameTree');
	type Node = typeof frameTree;
	const find = (node: Node): string | undefined =>
		node.frame.url === frame.url()
			? node.frame.id
			: node.childFrames?.map(find).find(Boolean);
	const frameId = find(frameTree);
	if (!frameId) return { error: `No CDP frame for ${frame.url()}` };
	const { executionContextId } = await cdp.send('Page.createIsolatedWorld', {
		frameId,
		worldName: 'leak-probe',
	});
	const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
		expression: isolatedWorldProbe,
		contextId: executionContextId,
		returnByValue: true,
	});
	await cdp.detach();
	return exceptionDetails
		? { error: exceptionDetails.text }
		: JSON.parse(result.value as string);
}

const signatureTerms: Record<string, RegExp> = {
	scramjet: /scramjet/gi,
	scram: /\$?scram(?!jet)/gi,
	mercury: /mercury-?workshop/gi,
	wisp: /\bwisp\b/gi,
	epoxy: /epoxy/gi,
	libcurl: /libcurl/gi,
	bare: /\bbare(?:mux|-mux|Response)?\b/gi,
	invisi: /invisi/gi,
	dest: /\$dest/g,
	hexIdentifier: /\b_0x[0-9a-f]{4,}\b/g,
	wbg: /__wbg_|__wbindgen/g,
	wasm: /wasm-function|\.wasm\b/g,
	sourceUrl: /sourceURL=|sourceMappingURL=/g,
	plainTarget: new RegExp(
		`${targetOrigin.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}|127\\.0\\.0\\.1(?::|%3A)${targetPort}`,
		'g'
	),
	...Object.fromEntries(
		Object.entries({
			coreToken: tokens.core,
			scramToken: tokens.scram,
			wrapperToken: tokens.wrapper,
			controllerToken: tokens.controller,
			utilsToken: tokens.utils,
			...Object.fromEntries(
				Object.entries(tokens.members).map(([name, token]) => [
					`member:${name}`,
					token,
				])
			),
		})
			.filter(([, token]) => token)
			.map(([name, token]) => [name, new RegExp(`\\$?${token}`, 'g')])
	),
};

function scan(value: unknown, path = '', hits: Record<string, string[]> = {}) {
	if (typeof value === 'string') {
		for (const [term, pattern] of Object.entries(signatureTerms))
			for (const match of value.matchAll(pattern)) {
				const at = match.index ?? 0;
				const snippet = value
					.slice(Math.max(0, at - 60), at + match[0].length + 60)
					.replace(/\s+/g, ' ');
				(hits[term] ??= []).push(`${path}: …${snippet}…`);
			}
	} else if (Array.isArray(value))
		value.forEach((item, index) => scan(item, `${path}[${index}]`, hits));
	else if (value && typeof value === 'object')
		for (const [key, item] of Object.entries(value))
			scan(item, path ? `${path}.${key}` : key, hits);
	return hits;
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
	// Baseline: the same target loaded directly, without the proxy.
	const plainContext = await browser.newContext();
	const plain = await plainContext.newPage();
	await plain.goto(`${targetOrigin}/`);
	await plain.waitForSelector('html[data-leak-ready="1"]');
	const baseline = await plain.evaluate(mainWorldProbe);
	await plainContext.close();

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
	page.setDefaultTimeout(60_000);
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	const requests: { url: string; frame: string; type: string }[] = [];
	page.on('request', (request) =>
		requests.push({
			url: request.url(),
			frame: request.frame().url(),
			type: request.resourceType(),
		})
	);

	// The entry point unlocks the loader; disguised pages show the
	// challenge until then.
	await page.goto(base);
	await page.locator(id('dispense-link')).waitFor({ state: 'attached' });
	await page.goto(route('pages/proxnav/scramjet.html'));
	await page.waitForFunction(
		(wrapper) =>
			(window as unknown as Record<string, { ready?: boolean }>)[
				`$${wrapper}`
			]?.ready === true,
		tokens.wrapper
	);
	const navigationStart = requests.length;
	await page.locator(id('search-input')).fill(`${targetOrigin}/`);
	await page.locator(id('search-input')).press('Enter');
	const frame = await tabFrame(page, activeTab);
	await frame.locator('html[data-leak-ready="1"]').waitFor();

	const proxied = await frame.evaluate(mainWorldProbe);
	const isolated = await isolatedWorld(page, frame);
	const known = new Set(baseline.globals);
	const knownSymbols = new Set(baseline.symbols);
	const knownDocument = new Set(baseline.documentProps);
	const nonNative = Object.fromEntries(
		Object.entries(proxied.natives).filter(
			([name, source]) => source !== baseline.natives[name]
		)
	);
	const frameRequests = requests
		.slice(navigationStart)
		.filter((request) => request.frame !== page.url());

	const findings = {
		extraGlobals: proxied.globals.filter((name) => !known.has(name)),
		extraSymbols: proxied.symbols.filter((name) => !knownSymbols.has(name)),
		extraDocumentProps: proxied.documentProps.filter(
			(name) => !knownDocument.has(name)
		),
		nonNativeFunctions: nonNative,
		stacks: proxied.stacks,
		currentScript: proxied.currentScript,
		location: proxied.location,
		fetchedUrl: proxied.fetchedUrl,
		serviceWorker: proxied.serviceWorker,
		parentReachable: proxied.parentReachable,
		resources: proxied.resources,
		isolated,
		frameRequests,
		pageErrors,
	};
	const report = {
		tokens,
		prefixes: Object.fromEntries(
			Object.entries(aliases).filter(([key]) =>
				key.startsWith('prefixes/')
			)
		),
		findings,
		signatures: scan(findings),
	};
	writeFileSync(
		String(process.env.INVISIPROXY_LEAK_REPORT),
		JSON.stringify(report, null, '\t')
	);
} finally {
	await browser.close();
	target.close();
}
