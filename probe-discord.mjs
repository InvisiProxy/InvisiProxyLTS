// Scratch diagnostic: Discord login through the local Scramjet proxy.
// Logs incrementally to probe-discord.log so partial runs stay readable.
import { appendFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const LOG = 'probe-discord.log';
const log = (...a) => {
	const line = a
		.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
		.join(' ');
	console.log(line);
	appendFileSync(LOG, line + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const origin = 'https://43703-is9po0jmy2ugc1sjco16a.e2b.app';
const state = JSON.parse(
	readFileSync('views/dist/.obfuscation.json', 'utf8')
);
const config = JSON.parse(readFileSync('config.json', 'utf8'));
const base = `/${(config.pathname || '/').replace(/\/+$|[^\\w/.-]+/g, '')}/`.replace(
	/\/{2,}/g,
	'/'
);
const alias = (key) => state.aliases[key] || key.split('/').pop();
const pageUrl = (name) =>
	origin + base + (name ? alias(name === 'browsing' ? 'browsing' : name) : '');

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox'],
});
try {
	const context = await browser.newContext();
	// Log fetches issued inside every frame (installed before any page script).
	await context.addInitScript(() => {
		window.__fetchLog = [];
		const orig = window.fetch;
		if (typeof orig === 'function' && !orig.__probe) {
			const wrapped = function (input, init) {
				const url =
					typeof input === 'string'
						? input
						: input?.url ?? String(input);
				const entry = {
					url,
					method: init?.method || input?.method || 'GET',
					start: Date.now(),
				};
				window.__fetchLog.push(entry);
				return orig
					.apply(this, arguments)
					.then((res) => {
						entry.status = res.status;
						entry.ms = Date.now() - entry.start;
						return res;
					})
					.catch((err) => {
						entry.error = String(err);
						entry.ms = Date.now() - entry.start;
						throw err;
					});
			};
			wrapped.__probe = true;
			window.fetch = wrapped;
		}
	});
	const page = await context.newPage();
	page.setDefaultTimeout(60000);
	const consoleLines = [];
	page.on('console', (m) => {
		const line = `[console.${m.type()}] ${m.text()}`;
		consoleLines.push(line);
		if (m.type() === 'error' || m.type() === 'warning') log(line);
	});
	page.on('pageerror', (e) => log(`[pageerror] ${e.message}`));

	log('step: open browsing page');
	if (config.disguiseFiles) {
		await page.goto(origin + base, { waitUntil: 'domcontentloaded' });
		await sleep(1500);
	}
	log('goto', pageUrl('browsing'));
	await page.goto(pageUrl('browsing'), { waitUntil: 'domcontentloaded' });
	try {
		await page.waitForFunction(() => window.$invisiScramjet?.ready === true, {
			timeout: 45000,
		});
	} catch {
		log(
			'init state:',
			await page.evaluate(() => ({
				ready: window.$invisiScramjet?.ready,
				err: String(window.$invisiScramjetError || ''),
				initializing: Boolean(window.$invisiScramjetInitializing),
			}))
		);
		throw new Error('scramjet never became ready');
	}
	log('step: scramjet ready');

	await page.locator('#search-input').fill('https://discord.com/login');
	await page.locator('#search-input').press('Enter');
	await page.waitForURL(pageUrl('s').replace(/\/[^/]*$/, '/s'), {
		timeout: 30000,
	}).catch(() => log('note: url check loose'));
	const frame = page.frameLocator('#frame');

	log('step: waiting for discord login form');
	try {
		await frame
			.locator('input[name="email"], input[name="login"]')
			.first()
			.waitFor({ timeout: 60000 });
		log('step: discord login form visible');
	} catch {
		log('step: LOGIN FORM NEVER APPEARED');
		const body = await frame
			.locator('body')
			.innerHTML()
			.catch((e) => `no body: ${e}`);
		log('frame body head:', String(body).slice(0, 600));
	}

	const fpage = page.frames().find((f) => f !== page.mainFrame() && f.parentFrame());
	log('frame url:', fpage?.url());
	if (fpage) {
		const probes = await fpage
			.evaluate(async () => {
				const out = {};
				out.location = location.href;
				out.origin = window.origin;
				out.documentCookie = (() => {
					try {
						return document.cookie;
					} catch (e) {
						return 'ERR ' + e;
					}
				})();
				out.localStorage = (() => {
					try {
						localStorage.setItem('probe', '1');
						const v = localStorage.getItem('probe');
						localStorage.removeItem('probe');
						return v;
					} catch (e) {
						return 'ERR ' + e;
					}
				})();
				out.indexedDB = await new Promise((resolve) => {
					try {
						const req = indexedDB.open('probe-db');
						req.onsuccess = () => {
							resolve('open-ok');
							try {
								req.result.close();
								indexedDB.deleteDatabase('probe-db');
							} catch {}
						};
						req.onerror = () => resolve('ERR ' + req.error);
						setTimeout(() => resolve('TIMEOUT'), 4000);
					} catch (e) {
						resolve('ERR ' + e);
					}
				});
				out.fetchProbe = await new Promise((resolve) => {
					const t = setTimeout(() => resolve('FETCH-TIMEOUT'), 10000);
					fetch('https://discord.com/api/v9/experiments', {
						credentials: 'include',
					})
						.then((r) => {
							clearTimeout(t);
							resolve('status ' + r.status);
						})
						.catch((e) => {
							clearTimeout(t);
							resolve('ERR ' + e);
						});
				});
				return out;
			})
			.catch((e) => ({ error: String(e) }));
		log('frame probes:', probes);
	}

	log('step: gateway websocket probe from frame');
	if (fpage) {
		const wsProbe = await fpage
			.evaluate(
				() =>
					new Promise((resolve) => {
						const out = { ctor: null, events: [] };
						try {
							const ws = new WebSocket(
								'wss://gateway.discord.io/?v=10&encoding=json'
							);
							out.ctor = ws.constructor?.name;
							const done = (why) => {
								try {
									ws.close();
								} catch {}
								out.done = why;
								resolve(out);
							};
							ws.onopen = () => out.events.push('open');
							ws.onmessage = (e) => {
								out.events.push(
									'message:' +
										String(e.data).slice(0, 80)
								);
								done('got-message');
							};
							ws.onerror = () => out.events.push('error');
							ws.onclose = (e) =>
								out.events.push('close:' + e.code);
							setTimeout(() => done('timeout'), 8000);
						} catch (e) {
							out.threw = String(e);
							resolve(out);
						}
					})
			)
			.catch((e) => ({ error: String(e) }));
		log('ws probe:', wsProbe);
	}

	log('step: submit fake credentials');
	try {
		await frame
			.locator('input[name="email"], input[name="login"]')
			.first()
			.fill('probe-user@example.com');
		await frame.locator('input[name="password"]').first().fill('hunter2-probe');
		await frame
			.locator('button[type="submit"]')
			.first()
			.click({ timeout: 10000 });
		log('clicked submit');
	} catch (e) {
		log('submit failed:', String(e).slice(0, 200));
	}

	for (let i = 1; i <= 5; i++) {
		await sleep(4000);
		const state = await fpage
			?.evaluate(() => {
				const spinner = document.querySelectorAll(
					'[class*="spinner"], [class*="loading"], [aria-label*="loading" i]'
				).length;
				const toasts = [...document.querySelectorAll('[class*="toast"], [class*="message"], [class*="error"]')]
					.map((n) => n.textContent?.slice(0, 100))
					.filter(Boolean)
					.slice(0, 5);
				return {
					spinner,
					toasts,
					fetchLog: (window.__fetchLog || []).slice(-8),
				};
			})
			.catch((e) => ({ err: String(e) }));
		log(`t+${i * 4}s frame state:`, state);
	}

	const jar = await page
		.evaluate(() =>
			(window.$invisiScramjet?.controller?.cookieJar?.dump?.() || []).map(
				(c) => `${c.domain || c.name}=${String(c.value || '').slice(0, 12)}`
			)
		)
		.catch((e) => String(e));
	log('controller cookieJar:', jar);
	log('done');
} catch (e) {
	log('FATAL', e?.stack || String(e));
} finally {
	await browser.close();
}
