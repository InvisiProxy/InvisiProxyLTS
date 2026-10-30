import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

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

const classes = classNames();
const cls = (name: string) => `.${classes[name] ?? name}`;
const ids = elementIds();
const id = (name: string) => `#${ids[name] ?? name}`;
const { getPathAliases } = await load<
	typeof import('../../src/obfuscation/paths.ts')
>('src/obfuscation/paths.ts');
const aliases = getPathAliases();
const transportValue = (name: string) => aliases[`prefixes/${name}`] ?? name;
const strip = (text: string) =>
	text.replace(/[\u00ad\u200b-\u200f\u2060-\u206f]|\ufe0f/g, '');
const { fontCipher } = await load<
	typeof import('../../src/obfuscation/fonts.ts')
>('src/obfuscation/fonts.ts');
const { scramjetTokens } = await load<
	typeof import('../../src/obfuscation/scramjet-signatures.ts')
>('src/obfuscation/scramjet-signatures.ts');
const scramjetReady = (wrapper: string) =>
	(window as unknown as Record<string, { ready?: boolean }>)[`$${wrapper}`]
		?.ready === true;
const { letters, homoglyphs } =
	await load<typeof import('../../src/site.ts')>('src/site.ts');
const cipher = fontCipher();
const plain = (text: string) =>
	strip(text).replace(
		/[A-Za-z]/g,
		(letter) => letters[cipher.key.indexOf(letter)]
	);
const origin = String(process.env.INVISIPROXY_ORIGIN);
const base = origin + serverUrl.pathname;
const route = (file: string) =>
	base + Object.keys(pages).find((key) => pages[key] === file);

const webrtcPage = `<!doctype html><body><script>
	const frame = document.body.appendChild(document.createElement('iframe'));
	document.documentElement.dataset.webrtc = JSON.stringify({
		page: typeof RTCPeerConnection,
		frame: typeof frame.contentWindow.RTCPeerConnection,
	});
</script></body>`;

const target = createServer((req, res) => {
	res.setHeader('content-type', 'text/html');
	res.end(
		req.url?.startsWith('/webrtc')
			? webrtcPage
			: '<!doctype html><h1>Proxied through Wisp</h1><script>document.documentElement.dataset.proxySmoke = "executed";</script>'
	);
});
const targetPort = Number(process.env.INVISIPROXY_TARGET_PORT);
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
		Object.assign(window, {
			AOS: { init() {}, refresh() {} },
		})
	);
	const page = await context.newPage();
	page.setDefaultTimeout(60_000);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto(route('pages/nav/partners.html'));
	const challenge = page.locator(cls('challenge'));
	await challenge.waitFor();
	const lookalikes = Object.fromEntries(
		Object.entries(homoglyphs).map(([letter, glyph]) => [glyph, letter])
	);
	const servedTitle =
		/<title>(.*?)<\/title>/.exec(
			await page.evaluate(async (url) => {
				const response = await fetch(url);
				return new TextDecoder('utf-8').decode(
					await response.arrayBuffer()
				);
			}, route('pages/nav/partners.html'))
		)?.[1] ?? '';
	assert.notEqual(servedTitle, 'Just a moment...');
	assert.equal(
		strip(servedTitle.replace(/./gu, (char) => lookalikes[char] ?? char)),
		'Just a moment...',
		'The served stub title should use lookalikes instead of plain text.'
	);
	const runtimeTitle = await page.title();
	assert.notEqual(runtimeTitle, 'Just a moment...');
	assert.equal(
		runtimeTitle.replace(/./gu, (char) => lookalikes[char] ?? char),
		'Just a moment...',
		'The runtime loader should swap in the Cloudflare-style title with lookalikes.'
	);
	const challengeTitle =
		(await page.locator(cls('challenge-title')).first().textContent()) ??
		'';
	assert.equal(plain(challengeTitle), 'Performing security verification');
	await page.locator('[data-verify] input').check();
	await page.locator('[data-notice]').waitFor();
	const notice = (await page.locator('[data-notice]').textContent()) ?? '';
	assert.ok(
		plain(notice).includes('403 Forbidden'),
		'The challenge notice should explain the 403 behavior.'
	);
	await page.goto(base);
	await page.locator(id('dispense-link')).waitFor({ state: 'attached' });
	await page.goto(route('pages/nav/partners.html'));
	await page.locator(id('dispense-link')).waitFor({ state: 'attached' });

	const toggle = page.locator(cls('mirror-links-toggle'));
	const label = (await toggle.locator('span').textContent()) ?? '';
	assert.notEqual(label, strip(label), 'Button text should be masked.');
	assert.notEqual(strip(label), 'Mirrors', 'Button text should be ciphered.');
	assert.equal(plain(label), 'Mirrors');
	assert.ok(
		await page.evaluate(async (family) => {
			await document.fonts.ready;
			return [...document.fonts].some(
				(font) => font.family === family && font.status === 'loaded'
			);
		}, cipher.families['Rethink Sans']),
		'The ciphered font should load.'
	);

	const button = page.locator(id('dispense-link'));
	const buttonClass = (await button.getAttribute('class')) ?? '';
	assert.ok(buttonClass.includes(classes.fancybutton));
	assert.doesNotMatch(buttonClass, /fancybutton/);
	assert.notEqual(
		await button.evaluate((el) => getComputedStyle(el).borderRadius),
		'0px',
		'Renamed classes should keep their styles.'
	);

	await toggle.click();
	await button.click();
	const link = page.locator(id('dispensed-link'));
	await link.waitFor({ state: 'visible' });
	assert.ok(
		['https://first.example/', 'https://second.example/'].includes(
			(await link.getAttribute('href')) ?? ''
		)
	);
	await button.click();
	await link.waitFor({ state: 'hidden' });
	assert.ok(await page.locator(id('dispenser-status')).textContent());

	await page.locator(cls('settings-toggle')).first().click();
	await page.waitForFunction((selector) => {
		const menu = document.querySelector(selector);
		return menu && getComputedStyle(menu).opacity === '1';
	}, cls('dropdown-settings'));
	for (const section of ['collapse-browsing', 'collapse-tab'])
		await page.locator(`${cls(section)} > summary`).click();
	await page.locator(id('settings-theme')).selectOption('light');
	const title = await page.title();
	await page.locator(id('icon-list')).selectOption({ index: 1 });
	await page.waitForFunction(
		(title) =>
			document.title !== title &&
			Object.keys(localStorage).some((key) =>
				/"Icon":"https:/.test(localStorage.getItem(key) ?? '')
			),
		title
	);
	const presetTitle = await page.title();
	await page.reload();
	await page.waitForFunction(
		({ light, title }) =>
			document.documentElement.classList.contains(light) &&
			document.title === title,
		{ light: classes.light, title: presetTitle }
	);

	for (const transport of ['libcurl', 'epoxy']) {
		await page.goto(route('pages/proxnav/scramjet.html'));
		await page.waitForFunction(scramjetReady, scramjetTokens().wrapper);
		if (transport === 'epoxy') {
			await page.locator(`${id('settings-panel')} > summary`).click();
			await Promise.all([
				page.waitForEvent('load'),
				page
					.locator(id('browsing-transport'))
					.selectOption(transportValue(transport)),
			]);
			await page.waitForFunction(scramjetReady, scramjetTokens().wrapper);
		}
		assert.equal(
			await page.locator(id('browsing-transport')).inputValue(),
			transportValue(transport)
		);
		await page
			.locator(id('search-input'))
			.fill(`http://127.0.0.1:${targetPort}/`);
		await page.locator(id('search-input')).press('Enter');
		await page
			.frameLocator(id('frame'))
			.locator('html[data-proxy-smoke="executed"]')
			.waitFor()
			.catch((cause) => {
				throw new Error(
					`${transport} proxying failed: ${errors.join('\n')}`,
					{ cause }
				);
			});
	}

	await page
		.locator(id('search-input'))
		.fill('http://127.0.0.1:9/unreachable');
	await page.locator(id('search-input')).press('Enter');
	const errorPage = page.frameLocator(id('frame'));
	await errorPage
		.locator(id('fetchedURL'), {
			hasText: 'http://127.0.0.1:9/unreachable',
		})
		.waitFor();
	assert.match(await errorPage.locator(id('errorTrace')).inputValue(), /\S/);
	const version =
		(await errorPage.locator(id('scramjetVersion')).textContent()) ?? '';
	assert.match(version, /^v\d\S* - build \w+$/);
	const scramjetVersion = JSON.parse(
		readFileSync(join(process.cwd(), 'package.json'), 'utf8')
	).dependencies['@mercuryworkshop/scramjet'];
	assert.ok(
		version.startsWith(`v${scramjetVersion} `),
		`Scramjet version should stay pinned to v${scramjetVersion}, got ${version}`
	);

	const webrtcResult = async () =>
		JSON.parse(
			(await page
				.frameLocator(id('frame'))
				.locator('html[data-webrtc]')
				.getAttribute('data-webrtc')) ?? '{}'
		);
	const openWebrtcPage = async () => {
		await page
			.locator(id('search-input'))
			.fill(`http://127.0.0.1:${targetPort}/webrtc`);
		await page.locator(id('search-input')).press('Enter');
		return webrtcResult();
	};
	assert.deepEqual(await openWebrtcPage(), {
		page: 'function',
		frame: 'function',
	});

	await page.goto(route('pages/proxnav/scramjet.html'));
	await page.waitForFunction(scramjetReady, scramjetTokens().wrapper);
	await page
		.locator(`input${cls('block-webrtc')}`)
		.first()
		.evaluate((input) => {
			(input as HTMLInputElement).checked = true;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
	assert.deepEqual(await openWebrtcPage(), {
		page: 'undefined',
		frame: 'undefined',
	});

	await page.goto(base);
	await page.locator(cls('settings-toggle')).first().click();
	await page
		.locator(`input${cls('history-toggle')}`)
		.first()
		.evaluate((input) => {
			(input as HTMLInputElement).checked = true;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
	const hidden = await page.goto(route('pages/nav/partners.html'));
	assert.equal(
		hidden?.status(),
		404,
		'Hidden history should block direct visits to pages.'
	);
} finally {
	await browser.close();
	target.close();
}
