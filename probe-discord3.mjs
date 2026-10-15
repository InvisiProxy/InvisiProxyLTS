// Scratch diagnostic v3: decisive checks — in-frame storage descriptors,
// eval/Function behavior, rewritten Discord bundle inspection (localStorage +
// WebSocket/gateway rewriting), and the hCaptcha hsw EvalError detail.
import { appendFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const log = (...a) => {
	const line = a
		.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
		.join(' ');
	console.log(line);
	appendFileSync('probe-discord3.log', line + '\n');
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
	page.on('pageerror', (e) => log(`[pageerror]`, e.message.slice(0, 400)));
	page.on('console', async (m) => {
		if (m.type() !== 'error' && !/EvalError|hcaptcha|captcha/i.test(m.text()))
			return;
		try {
			const args = await Promise.all(
				m
					.args()
					.map((a) =>
						a
							.jsonValue()
							.then((v) => JSON.stringify(v).slice(0, 300))
							.catch(() => '?')
					)
			);
			log(`[console.${m.type()}]`, args.join(' | ').slice(0, 600));
		} catch {
			log(`[console.${m.type()}]`, m.text().slice(0, 300));
		}
	});

	page.on('response', (r) => {
		if (r.status() >= 400)
			log(`[http ${r.status()}]`, r.url().slice(0, 180));
	});
	await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
	await sleep(1500);
	await page.goto(`${origin}/${alias('browsing')}`, {
		waitUntil: 'domcontentloaded',
	});
	await page.waitForFunction(() => window.$invisiScramjet?.ready === true, {
		timeout: 45000,
	});
	await page.locator('#search-input').fill('https://discord.com/login');
	for (let attempt = 1; attempt <= 3; attempt++) {
		await page.locator('#search-input').press('Enter');
		await sleep(8000);
		const urls = page.frames().map((f) => f.url());
		log(`press #${attempt}:`, urls.map((u) => u.slice(0, 120)));
		if (
			urls.some(
				(u) => u.includes('discord.com') || u.includes(`/${alias('s')}`)
			)
		)
			break;
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
	const fpage = page
		.frames()
		.find((f) => f.url().includes('discord.com'));
	if (!fpage) throw new Error('no proxied frame');
	log('form visible; frame:', fpage.url());

	const realm = await fpage.evaluate(() => {
		const out = {};
		out.ownDesc = Object.getOwnPropertyDescriptor(window, 'localStorage')
			? 'own'
			: null;
		try {
			out.protoDesc = Object.getOwnPropertyDescriptor(
				Window.prototype,
				'localStorage'
			)
				? 'proto'
				: null;
		} catch (e) {
			out.protoDesc = 'ERR ' + e.name;
		}
		out.inWindow = 'localStorage' in window;
		try {
			out.type = typeof localStorage;
		} catch (e) {
			out.type = 'THREW ' + e.name;
		}
		// Does the scramjet assignment trampoline swallow a re-install?
		try {
			window.localStorage = 'sentinel';
			out.reassign = `'localStorage' in window now: ${'localStorage' in window}, typeof=${typeof window.localStorage}`;
		} catch (e) {
			out.reassign = 'THREW ' + e.name + ': ' + e.message;
		}
		try {
			out.session = typeof sessionStorage;
		} catch (e) {
			out.session = 'THREW ' + e.name;
		}
		// eval machinery:
		try {
			out.eval1 = eval('1+1');
		} catch (e) {
			out.eval1 = 'THREW ' + String(e).slice(0, 120);
		}
		try {
			out.fn = new Function('return 7')();
		} catch (e) {
			out.fn = 'THREW ' + String(e).slice(0, 120);
		}
		return out;
	});
	log('realm probes:', realm);

	const bundles = await fpage.evaluate(async () => {
		const srcs = [...document.querySelectorAll('script[src]')]
			.map((s) => s.src)
			.filter((s) => /\.js(\?|$)/.test(s))
			.slice(0, 6);
		const out = [];
		for (const src of srcs) {
			try {
				const res = await fetch(src);
				const text = await res.text();
				const entry = {
					src: src.split('/').pop().slice(0, 60),
					status: res.status,
					size: text.length,
					localStorage: (text.match(/localStorage/g) || []).length,
					gateway: text.includes('gateway.discord.io'),
				};
				const li = text.indexOf('localStorage');
				if (li !== -1)
					entry.localSample = text
						.slice(Math.max(0, li - 100), li + 140)
						.replace(/\s+/g, ' ');
				const gi = text.indexOf('gateway.discord.io');
				if (gi !== -1)
					entry.gatewaySample = text
						.slice(Math.max(0, gi - 140), gi + 60)
						.replace(/\s+/g, ' ');
				out.push(entry);
			} catch (e) {
				out.push({ src: src.slice(-60), err: String(e).slice(0, 80) });
			}
		}
		return out;
	});
	log('bundles:', bundles);

	log('step: UI submit');
	await fpage
		.locator('input[name="email"], input[name="login"]')
		.first()
		.fill('probe-user@example.com');
	await fpage.locator('input[name="password"]').first().fill('hunter2-probe');
	await fpage.locator('button[type="submit"]').first().click();
	await sleep(12000);

	const after = await fpage.evaluate(() => {
		const challenge = [...document.querySelectorAll('iframe')].find((f) =>
			(f.src || '').includes('frame=challenge')
		);
		return {
			captchaIframes: [...document.querySelectorAll('iframe')].filter((f) =>
				(f.src || '').includes('hcaptcha')
			).length,
			challengeText: null,
			bodyText: (document.body.innerText || '')
				.split('\n')
				.filter(Boolean)
				.slice(-8),
		};
	});
	log('after submit:', after);
	const cf = page
		.frames()
		.find((f) => f.url().includes('frame=challenge'));
	if (cf) {
		const txt = await cf
			.evaluate(() => document.body.innerText.slice(0, 300))
			.catch((e) => 'ERR ' + String(e).slice(0, 80));
		log('challenge iframe text:', JSON.stringify(txt));
		const cfErr = await cf
			.evaluate(
				() =>
					new Promise((resolve) => {
						const errs = [];
						window.addEventListener('error', (e) =>
							errs.push(String(e.message).slice(0, 200))
						);
						setTimeout(() => resolve(errs), 3000);
					})
			)
			.catch(() => 'n/a');
		log('challenge errors:', cfErr);
	} else {
		log('no challenge iframe found');
	}
	log('done');
} catch (e) {
	log('FATAL', e?.stack || String(e));
} finally {
	await browser.close();
}
