// Scratch diagnostic v2: focused probes around Discord login in the proxied frame.
import { appendFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const LOG = 'probe-discord2.log';
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
const alias = (key) => state.aliases[key] || key.split('/').pop();

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox'],
});
try {
	const context = await browser.newContext();
	const page = await context.newPage();
	page.setDefaultTimeout(60000);
	page.on('pageerror', (e) => log(`[pageerror] ${e.message.slice(0, 300)}`));
	page.on('console', (m) => {
		const t = m.text();
		if (m.type() === 'error' || /hcaptcha|storage|captcha/i.test(t))
			log(`[console.${m.type()}]`, t.slice(0, 250));
	});

	await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
	await sleep(1500);
	await page.goto(`${origin}/${alias('browsing')}`, {
		waitUntil: 'domcontentloaded',
	});
	await page.waitForFunction(() => window.$invisiScramjet?.ready === true, {
		timeout: 45000,
	});
	page.on('response', (r) => {
		if (r.status() >= 400)
			log(`[http ${r.status()}]`, r.url().slice(0, 180));
	});
	await page.locator('#search-input').fill('https://discord.com/login');
	for (let attempt = 1; attempt <= 3; attempt++) {
		await page.locator('#search-input').press('Enter');
		await sleep(8000);
		const urls = page.frames().map((f) => f.url());
		log(`press #${attempt} frames:`, urls.map((u) => u.slice(0, 120)));
		if (
			urls.some(
				(u) =>
					u.includes('discord.com') ||
					u.includes(`/${alias('s')}`)
			)
		)
			break;
		// Re-fill: the loader may have swapped the document body.
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
			log('form wait failed:', String(e).slice(0, 120));
			log(
				'frames:',
				page.frames().map((f) => f.url().slice(0, 140))
			);
			throw e;
		});
	const fpage = page
		.frames()
		.find((f) => f.url().includes('discord.com'));
	if (!fpage) throw new Error('no proxied frame');
	log('login form visible; frame:', fpage.url());

	const storage = await fpage.evaluate(() => {
		const out = {};
		out.hasLocalStorageProp = 'localStorage' in window;
		try {
			out.windowLocalStorage = typeof window.localStorage;
		} catch (e) {
			out.windowLocalStorage = 'THREW ' + e.name;
		}
		try {
			out.bareLocalStorage = typeof localStorage;
		} catch (e) {
			out.bareLocalStorage = 'THREW ' + e.name;
		}
		out.storageGlobals = Object.getOwnPropertyNames(window).filter(
			(n) => /storage|scram|proxy/i.test(n)
		);
		try {
			document.cookie = 'probe=1; path=/';
			out.cookieWrite = document.cookie.includes('probe=1');
			out.cookieRead = document.cookie;
			document.cookie = 'probe=; expires=Thu, 01 Jan 1970';
		} catch (e) {
			out.cookieErr = String(e);
		}
		return out;
	});
	log('storage probes:', storage);

	// Direct POST through the transport (bypasses UI):
	const post = await fpage.evaluate(async () => {
		try {
			const res = await fetch('https://discord.com/api/v9/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					login: 'probe-user@example.com',
					password: 'hunter2-probe',
					remember: false,
				}),
			});
			const text = await res.text();
			return { status: res.status, body: text.slice(0, 300) };
		} catch (e) {
			return { error: String(e) };
		}
	});
	log('direct login POST:', post);

	// Is a discord bundle rewritten (localStorage bridged) or left raw?
	const rewritten = await fpage.evaluate(async () => {
		const src = document.querySelector('script[src*="assets"]')?.src;
		if (!src) return { note: 'no script found' };
		const text = await fetch(src).then((r) => r.text());
		const occurrences = (text.match(/localStorage/g) || []).length;
		const sample = (() => {
			const i = text.indexOf('localStorage');
			return i === -1 ? null : text.slice(Math.max(0, i - 80), i + 120);
		})();
		return { src: src.slice(0, 120), length: text.length, occurrences, sample };
	});
	log('bundle rewrite check:', rewritten);

	log('step: UI submit');
	await fpage
		.locator('input[name="email"], input[name="login"]')
		.first()
		.fill('probe-user@example.com');
	await fpage.locator('input[name="password"]').first().fill('hunter2-probe');
	await fpage.locator('button[type="submit"]').first().click();
	await sleep(8000);

	const framesAfter = page.frames().map((f) => f.url().slice(0, 160));
	log('frames after submit:', framesAfter);
	const ui = await fpage.evaluate(() => ({
		captchaContainers: document.querySelectorAll(
			'[class*="captcha"], .h-captcha, .cf-turnstile, iframe[src*="hcaptcha"]'
		).length,
		iframes: [...document.querySelectorAll('iframe')].map((f) =>
			(f.src || '').slice(0, 120)
		),
		visibleText: (document.body.innerText || '')
			.split('\n')
			.filter(Boolean)
			.slice(0, 12),
	}));
	log('ui after submit:', ui);

	log('step: gateway ws (12s)');
	const ws = await fpage.evaluate(
		() =>
			new Promise((resolve) => {
				const out = { events: [], desc: null };
				try {
					const d = Object.getOwnPropertyDescriptor(window, 'WebSocket');
					out.desc = d
						? `${d.writable || d.set ? 'accessor/data' : 'get-only'}`
						: 'none';
					const w = new WebSocket(
						'wss://gateway.discord.io/?v=10&encoding=json'
					);
					out.url = w.url;
					out.ctorName = w.constructor.name;
					w.onopen = () => out.events.push('open');
					w.onmessage = (e) =>
						out.events.push('msg:' + String(e.data).slice(0, 60));
					w.onerror = () => out.events.push('error');
					w.onclose = (e) => out.events.push('close:' + e.code);
					setTimeout(() => {
						try {
							w.close();
						} catch {}
						resolve(out);
					}, 12000);
				} catch (e) {
					out.threw = String(e);
					resolve(out);
				}
			})
	);
	log('ws:', ws);

	const jar = await page.evaluate(() => {
		try {
			const c = window.$invisiScramjet.controller.cookieJar;
			const d = c.dump();
			return {
				type: typeof d,
				isArray: Array.isArray(d),
				isPromise: d instanceof Promise,
				keys: d && typeof d === 'object' ? Object.keys(d).slice(0, 8) : null,
				str: String(d).slice(0, 200),
			};
		} catch (e) {
			return { err: String(e) };
		}
	});
	log('cookieJar:', jar);
	log('done');
} catch (e) {
	log('FATAL', e?.stack || String(e));
} finally {
	await browser.close();
}
