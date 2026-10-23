import assert from 'node:assert/strict';
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
const { classNames } = await load<
	typeof import('../../src/obfuscation/classes.ts')
>('src/obfuscation/classes.ts');

const classes = classNames();
const cls = (name: string) => `.${classes[name] ?? name}`;
const strip = (text: string) =>
	text.replace(/[\u00ad\u200b-\u200f\u2060-\u206f]|\ufe0f/g, '');
const origin = String(process.env.INVISIPROXY_ORIGIN);
const base = origin + serverUrl.pathname;
const route = (file: string) =>
	base + Object.keys(pages).find((key) => pages[key] === file);

const target = createServer((_req, res) => {
	res.setHeader('content-type', 'text/html');
	res.end(
		'<!doctype html><h1>Proxied through Wisp</h1><script>document.documentElement.dataset.proxySmoke = "executed";</script>'
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
			tippy: () => [],
			loadFull: async () => {},
			tsParticles: { load: async () => ({ destroy() {} }) },
		})
	);
	const page = await context.newPage();
	page.setDefaultTimeout(60_000);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto(route('pages/nav/partners.html'));
	await page.getByText('403 Forbidden').waitFor();
	await page.goto(base);
	await page.locator('#dispense-link').waitFor({ state: 'attached' });
	await page.goto(route('pages/nav/partners.html'));
	await page.locator('#dispense-link').waitFor({ state: 'attached' });

	const toggle = page.locator(cls('mirror-links-toggle'));
	const label = (await toggle.locator('span').textContent()) ?? '';
	assert.notEqual(label, strip(label), 'Button text should be masked.');
	assert.equal(strip(label), 'Mirrors');

	const button = page.locator('#dispense-link');
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
	const link = page.locator('#dispensed-link');
	await link.waitFor({ state: 'visible' });
	assert.ok(
		['https://first.example/', 'https://second.example/'].includes(
			(await link.getAttribute('href')) ?? ''
		)
	);
	await button.click();
	await link.waitFor({ state: 'hidden' });
	assert.ok(await page.locator('#dispenser-status').textContent());

	await page.locator(cls('settings-toggle')).first().click();
	await page.waitForFunction((selector) => {
		const menu = document.querySelector(selector);
		return menu && getComputedStyle(menu).opacity === '1';
	}, cls('dropdown-settings'));
	await page.locator('#settings-theme').selectOption('light');
	const title = await page.title();
	await page.locator('#icon-list').selectOption({ index: 1 });
	await page.waitForFunction(
		(title) =>
			document.title !== title &&
			document
				.querySelector<HTMLLinkElement>('link[rel="icon"]')
				?.href.startsWith('https://'),
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
		await page.waitForFunction(
			() => window.$invisiScramjet?.ready === true
		);
		if (transport === 'epoxy') {
			await page.locator('#settings-panel > summary').click();
			await Promise.all([
				page.waitForEvent('load'),
				page.locator('#browsing-transport').selectOption(transport),
			]);
			await page.waitForFunction(
				() => window.$invisiScramjet?.ready === true
			);
		}
		assert.equal(
			await page.locator('#browsing-transport').inputValue(),
			transport
		);
		await page
			.locator('#search-input')
			.fill(`http://127.0.0.1:${targetPort}/`);
		await page.locator('#search-input').press('Enter');
		await page
			.frameLocator('#frame')
			.locator('html[data-proxy-smoke="executed"]')
			.waitFor()
			.catch((cause) => {
				throw new Error(
					`${transport} proxying failed: ${errors.join('\n')}`,
					{ cause }
				);
			});
	}

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
