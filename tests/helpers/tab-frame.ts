import type { Frame, Page } from 'playwright';

// /s keeps its tab frames and address bar in closed shadow roots, which
// selectors cannot reach, so tests go through the frame tree and keyboard.

// The active tab, found by its frame element's classes.
export async function tabFrame(
	page: Page,
	tabClasses: string[],
	timeout = 120_000
): Promise<Frame> {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		for (const frame of page.mainFrame().childFrames()) {
			const owner = await frame.frameElement().catch(() => null);
			const classes = ((await owner?.getAttribute('class')) ?? '').split(
				/\s+/
			);
			if (tabClasses.every((name) => classes.includes(name)))
				return frame;
		}
		await page.waitForTimeout(250);
	}
	throw new Error('Proxy tab frame not found');
}

export async function enterAddress(
	page: Page,
	url: string,
	selectors: { input: string; searchBox: string }
) {
	const input = page.locator(selectors.input);
	if (await input.count()) {
		await input.fill(url);
		await input.press('Enter');
		return;
	}
	await page
		.locator(selectors.searchBox)
		.click({ position: { x: 24, y: 12 } });
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.insertText(url);
	await page.keyboard.press('Enter');
}
