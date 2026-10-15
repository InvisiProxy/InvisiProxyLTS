// Scratch diagnostic v4: decisive behavioral tests inside the Scramjet frame —
// storage descriptors, document.cookie jar roundtrip (Set-Cookie -> jar -> Cookie
// header), Authorization header pass-through, WebSocket open/echo, cookieJar shape.
import { appendFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const log = (...a) => {
	const line = a
		.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
		.join(' ');
	console.log(line);
	appendFileSync('probe-discord4.log', line + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const origin = 'https://43703-is9po0jmy2ugc1sjco16a.e2b.app';
const state = JSON.parse(readFileSync('views/dist/.obfuscation.json', 'utf8'));
const alias = (key) => state.aliases[key] || key.split('/').pop();

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox'],
});
try {
	const context = await browser.newContext();
	const page = await context.newPage();
	page.setDefaultTimeout(60000);
	page.on('pageerror', (e) => log(`[pageerror]`, e.message.slice(0, 300)));
	page.on('console', (m) => {
		const t = m.type();
		if (t !== 'error' && t !== 'warning') return;
		log(`[console.${t}]`, m.text().slice(0, 300));
	});
	page.on('response', (r) => {
		if (r.status() >= 400) log(`[http ${r.status()}]`, r.url().slice(0, 160));
	});

	// --- control: top window storage ---
	await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
	await sleep(1200);
	await page.goto(`${origin}/${alias('browsing')}`, {
		waitUntil: 'domcontentloaded',
	});
	await page.waitForFunction(() => window.$invisiScramjet?.ready === true, {
		timeout: 45000,
	});
	const top = await page.evaluate(() => {
		const d = Object.getOwnPropertyDescriptor(window, 'localStorage');
		return {
			inWindow: 'localStorage' in window,
			type: typeof window.localStorage,
			own: d ? Object.keys(d) : null,
			proto: Object.getOwnPropertyNames(Window.prototype).filter((n) =>
				/Storage/.test(n)
			),
		};
	});
	log('top storage:', top);

	// --- navigate to discord login ---
	await page.locator('#search-input').fill('https://discord.com/login');
	for (let attempt = 1; attempt <= 3; attempt++) {
		await page.locator('#search-input').press('Enter');
		await sleep(8000);
		const urls = page.frames().map((f) => f.url());
		log(`press #${attempt}:`, urls.map((u) => u.slice(0, 110)));
		if (urls.some((u) => u.includes('discord.com'))) break;
		if (await page.locator('#search-input').count())
			await page
				.locator('#search-input')
				.fill('https://discord.com/login');
	}
	const frame = page.frameLocator('#frame');
	await frame
		.locator('input[name="email"], input[name="login"]')
		.first()
		.waitFor({ timeout: 90000 })
		.catch(async (e) => {
			log('form wait failed');
			log(
				'frames:',
				page.frames().map((f) => f.url().slice(0, 160))
			);
			throw e;
		});
	const target = page.frames().find((f) => f.url().includes('discord.com'));
	if (!target) throw new Error('discord frame not found');
	log('frame url:', target.url().slice(0, 160));

	// --- 1. storage descriptors in frame ---
	const storage = await target.evaluate(() => {
		const out = { inWindow: 'localStorage' in window };
		try {
			const d = Object.getOwnPropertyDescriptor(window, 'localStorage');
			out.own = d ? { hasGet: !!d.get, keys: Object.keys(d) } : null;
		} catch (e) {
			out.own = 'ERR ' + e.message;
		}
		out.proto = (() => {
			try {
				return Object.getOwnPropertyNames(Window.prototype).filter((n) =>
					/Storage|cookie/i.test(n)
				);
			} catch (e) {
				return 'ERR ' + e.message;
			}
		})();
		out.type = (() => {
			try {
				return typeof window.localStorage;
			} catch (e) {
				return 'ERR ' + e.message;
			}
		})();
		out.bare = (() => {
			try {
				return typeof localStorage;
			} catch (e) {
				return 'ERR ' + e.message;
			}
		})();
		try {
			window.localStorage.setItem('probe4', 'yes');
			out.roundtrip = window.localStorage.getItem('probe4');
		} catch (e) {
			out.roundtrip = 'ERR ' + e.message;
		}
		try {
			out.cookie = document.cookie;
		} catch (e) {
			out.cookie = 'ERR ' + e.message;
		}
		try {
			out.cookieStore = typeof cookieStore;
		} catch (e) {
			out.cookieStore = 'ERR ' + e.message;
		}
		return out;
	});
	log('frame storage:', storage);

	// --- 2. cookie roundtrip: Set-Cookie -> jar -> visible cookie + request header ---
	try {
		const set = await target.evaluate(async () => {
			const r = await fetch('https://httpbin.org/cookies/set/probe4/val4');
			return { status: r.status, doc: document.cookie };
		});
		log('cookie set phase:', set);
		const read = await target.evaluate(async () => {
			const r = await fetch('https://httpbin.org/cookies');
			let j = {};
			try {
				j = await r.json();
			} catch (e) {
				j = { err: String(e) };
			}
			return { status: r.status, echoed: j, doc: document.cookie };
		});
		log('cookie read phase:', read);
	} catch (e) {
		log('cookie roundtrip ERR:', String(e).slice(0, 300));
	}

	// --- 3. Authorization + custom header pass-through ---
	try {
		const echo = await target.evaluate(async () => {
			const r = await fetch('https://httpbin.org/headers', {
				headers: {
					Authorization: 'Bearer probe-token-123',
					'X-Probe': 'probe-yes',
				},
			});
			let j = {};
			try {
				j = await r.json();
			} catch (e) {
				j = { err: String(e) };
			}
			return { status: r.status, headers: j.headers };
		});
		log('header echo:', echo);
	} catch (e) {
		log('header echo ERR:', String(e).slice(0, 300));
	}

	// --- 4. WebSocket tests: echo service + discord gateway ---
	const wsTest = (url, protocols) =>
		target.evaluate(
			({ url, protocols }) =>
				new Promise((resolve) => {
					const events = [];
					let ws;
					try {
						ws = protocols
							? new WebSocket(url, protocols)
							: new WebSocket(url);
					} catch (e) {
						return resolve({ ctor: 'ERR ' + e.message, events });
					}
					const done = (extra) => {
						try {
							ws.close();
						} catch {}
						resolve({ ctor: 'ok', events, ...extra });
					};
					const timer = setTimeout(() => done({ result: 'timeout' }), 15000);
					ws.onopen = () => {
						events.push('open');
						try {
							ws.send('probe-ping-4');
						} catch (e) {
							events.push('sendERR ' + e.message);
						}
					};
					ws.onmessage = (ev) => {
						events.push('message:' + String(ev.data).slice(0, 40));
						clearTimeout(timer);
						done({ result: 'echoed' });
					};
					ws.onerror = () => events.push('error');
					ws.onclose = (ev) => events.push('close:' + ev.code);
				}),
			{ url, protocols }
		);
	log('ws echo:', await wsTest('wss://ws.postman-echo.com/raw'));
	log(
		'ws gateway:',
		await wsTest('wss://gateway.discord.gg/?v=10&encoding=json', 'json')
	);

	// --- 5. controller cookieJar shape (top context) ---
	try {
		const jar = await page.evaluate(() => {
			const c = window.$invisiScramjet?.controller;
			const j = c?.cookieJar ?? c?.context?.cookieJar;
			let dump = null;
			try {
				dump = j?.dump ? String(j.dump()).slice(0, 300) : null;
			} catch (e) {
				dump = 'ERR ' + e.message;
			}
			return {
				has: !!c,
				jarType: j === undefined ? 'undefined' : j === null ? 'null' : typeof j,
				jarKeys:
					j && typeof j === 'object' ? Object.keys(j).slice(0, 12) : null,
				dump,
			};
		});
		log('controller cookieJar:', jar);
	} catch (e) {
		log('cookieJar ERR:', String(e).slice(0, 300));
	}

	log('done');
} finally {
	await browser.close();
}
