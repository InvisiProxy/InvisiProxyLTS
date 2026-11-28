// Upstream v3 A/B: serve the vendored files RAW and dump the proxied page's
// NATIVE DOM (what filter extensions see) for a minimal target page.
//
//   node scripts/upstream-ab.mjs

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('playwright');

const port = Number(process.env.PORT ?? 8111);
const wispPort = Number(process.env.WISP_PORT ?? 6990);
const targetPort = Number(process.env.TARGET_PORT ?? 6991);
const finalwispBin =
	process.env.FINALWISP_BIN ?? process.env.HOME + '/.local/bin/finalwisp';

const wispProcess = spawn(
	finalwispBin,
	[
		'--host',
		'127.0.0.1',
		'--port',
		String(wispPort),
		'--log-level',
		'warn',
		// the test target is loopback; open the policy for it
		'--allow-loopback',
		'--allow-private',
		`--allow-ports=${targetPort}`,
	],
	{ stdio: ['ignore', 'ignore', 'inherit'] }
);
await new Promise((r) => setTimeout(r, 1200));
const wispUrl = `ws://127.0.0.1:${wispPort}/`;

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
await new Promise((r) => target.listen(targetPort, '127.0.0.1', r));

const page = `<!doctype html><meta charset="utf-8"><title>upstream v3</title>
<script src="/scram/scramjet.js"></script>
<script src="/controller/controller.api.js"></script>
<input id="addr" style="width:70%" value="http://127.0.0.1:${targetPort}/">
<button id="go">go</button>
<iframe id="frame" style="width:98%;height:70vh"></iframe>
<pre id="log"></pre>
<script src="/client.js"></script>`;

const client = `
const log = (...a) => { console.log(...a); document.getElementById('log').textContent += a.join(' ') + '\\n'; };
(async () => {
	const mod = await import('/libcurl/index.mjs');
	const transport = new mod.default({ wisp: ${JSON.stringify(wispUrl)} });
	await transport.init();
	const reg = await navigator.serviceWorker.register('/sw.js');
	await new Promise((resolve) => {
		const sw = reg.installing || reg.waiting || reg.active;
		if (sw.state === 'activated') return resolve();
		sw.addEventListener('statechange', () => sw.state === 'activated' && resolve());
	});
	if (!navigator.serviceWorker.controller) {
		if (!sessionStorage.reloaded) { sessionStorage.reloaded = '1'; location.reload(); return; }
	}
	const controller = new $scramjetController.Controller({
		serviceworker: navigator.serviceWorker.controller || reg.active,
		transport,
		config: {
			prefix: '/~/sj/',
			scramjetPath: '/scram/scramjet.js',
			wasmPath: '/scram/scramjet.wasm',
			injectPath: '/controller/controller.inject.js',
		},
	});
	await controller.wait();
	log('CONTROLLER READY');
	window.frame = controller.createFrame(document.getElementById('frame'));
	document.getElementById('go').onclick = () => window.frame.go(document.getElementById('addr').value);
})().catch((e) => log('INIT FAILED', e && (e.stack || e.message)));
`;

const sw = `importScripts('/controller/controller.sw.js');
self.addEventListener('fetch', (event) => {
	if ($scramjetController.shouldRoute(event))
		event.respondWith($scramjetController.route(event));
});
`;

const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.wasm': 'application/wasm',
};
const dirs = {
	'/scram/': join(root, 'vendor/scramjet-3.0.0-alpha/dist'),
	'/controller/': join(root, 'vendor/scramjet-controller-0.0.15/dist'),
	'/libcurl/': join(root, 'node_modules/@mercuryworkshop/libcurl-transport/dist'),
};

const server = createServer(async (req, res) => {
	let url = (req.url ?? '/').split('?')[0];
	const route =
		url === '/' ? { body: page, type: 'text/html' } :
		url === '/client.js' ? { body: client, type: 'text/javascript' } :
		url === '/sw.js' ? { body: sw, type: 'text/javascript' } :
		null;
	if (route) {
		res.setHeader('Content-Type', route.type);
		if (url === '/sw.js') res.setHeader('Service-Worker-Allowed', '/');
		return res.end(route.body);
	}
	const dir = Object.entries(dirs).find(([prefix]) => url.startsWith(prefix));
	if (!dir) return void ((res.statusCode = 404), res.end('nf'));
	const file = join(dir[1], decodeURIComponent(url.slice(dir[0].length)));
	if (!file.startsWith(dir[1])) return void ((res.statusCode = 403), res.end('nf'));
	try {
		const body = await readFile(file);
		res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
		res.end(body);
	} catch {
		res.statusCode = 404;
		res.end('nf');
	}
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));
console.log(`upstream harness: http://127.0.0.1:${port}/ (wisp ${wispUrl})`);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
	const bpage = await browser.newPage();
	bpage.setDefaultTimeout(90_000);
	await bpage.goto(`http://127.0.0.1:${port}/`);
	await bpage.waitForFunction(
		() =>
			document.getElementById('log')?.textContent?.includes('CONTROLLER READY'),
		{ timeout: 60_000 }
	);
	await bpage.click('#go');
	await bpage.waitForTimeout(8_000);
	const native = await bpage.evaluate(() => {
		const f = document.getElementById('frame');
		const doc = f.contentDocument;
		return doc
			? {
					iframe: f.outerHTML.slice(0, 400),
					native: doc.documentElement.outerHTML.slice(0, 2500),
					fake: window.frames && null,
				}
			: null;
	});
	console.log('--- harness iframe (native):');
	console.log(native?.iframe ?? '(missing)');
	console.log('--- proxied page NATIVE html (what extensions see):');
	console.log(native?.native ?? '(missing)');
} finally {
	await browser.close();
	server.close();
	target.close();
	wispProcess.kill('SIGKILL');
}
void stat;
