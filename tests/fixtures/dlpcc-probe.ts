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
const { elementIds } = await load<
	typeof import('../../src/obfuscation/classes.ts')
>('src/obfuscation/classes.ts');
const { scramjetTokens } = await load<
	typeof import('../../src/obfuscation/scramjet-signatures.ts')
>('src/obfuscation/scramjet-signatures.ts');

const ids = elementIds();
const id = (name: string) => `#${ids[name] ?? name}`;
const origin = String(process.env.INVISIPROXY_ORIGIN);
const base = origin + serverUrl.pathname;
const route = (file: string) =>
	base + Object.keys(pages).find((key) => pages[key] === file);
const scramjetReady = (wrapper: string) =>
	(window as unknown as Record<string, { ready?: boolean }>)[`$${wrapper}`]
		?.ready === true;
const megabytes = 32;

// Two peer connections that ask for no ICE servers, like most sites; the
// relay patch should force both through DLPCC anyway.
const rtcPage = `<!doctype html><body><script>
(async () => {
	const out = { candidates: [] };
	try {
		const a = new RTCPeerConnection();
		const b = new RTCPeerConnection();
		out.policy = a.getConfiguration().iceTransportPolicy;
		const relay = (from, to) => (event) => {
			if (!event.candidate) return;
			out.candidates.push(event.candidate.candidate);
			to.addIceCandidate(event.candidate);
		};
		a.onicecandidate = relay(a, b);
		b.onicecandidate = relay(b, a);
		const channel = a.createDataChannel('probe');
		const total = ${megabytes} * 1024 * 1024;
		let received = 0;
		const done = new Promise((resolve) => {
			b.ondatachannel = ({ channel }) => {
				channel.binaryType = 'arraybuffer';
				channel.onmessage = ({ data }) => {
					received += data.byteLength;
					if (received >= total) resolve();
				};
			};
		});
		await a.setLocalDescription();
		await b.setRemoteDescription(a.localDescription);
		await b.setLocalDescription();
		await a.setRemoteDescription(b.localDescription);
		await new Promise((resolve, reject) => {
			channel.onopen = resolve;
			setTimeout(() => reject(new Error('Data channel never opened')), 30000);
		});
		const chunk = new Uint8Array(64 * 1024);
		channel.bufferedAmountLowThreshold = 1024 * 1024;
		const start = performance.now();
		for (let sent = 0; sent < total; sent += chunk.length) {
			if (channel.bufferedAmount > 4 * 1024 * 1024)
				await new Promise((resolve) => (channel.onbufferedamountlow = resolve));
			channel.send(chunk);
		}
		await done;
		out.mbps = (total * 8) / ((performance.now() - start) / 1000) / 1e6;
		const stats = await a.getStats();
		stats.forEach((report) => {
			if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated)
				out.pair = [
					stats.get(report.localCandidateId)?.candidateType,
					stats.get(report.remoteCandidateId)?.candidateType,
				];
		});
	} catch (error) {
		out.error = String(error);
	}
	document.documentElement.dataset.rtc = JSON.stringify(out);
})();
</script></body>`;

const target = createServer((_, res) => {
	res.setHeader('content-type', 'text/html');
	res.end(rtcPage);
});
const targetPort = Number(process.env.INVISIPROXY_TARGET_PORT);
await new Promise<void>((resolve) =>
	target.listen(targetPort, '127.0.0.1', resolve)
);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
	const page = await browser.newPage();
	page.setDefaultTimeout(120_000);
	await page.goto(base);
	await page.goto(route('pages/proxnav/scramjet.html'));
	await page.waitForFunction(scramjetReady, scramjetTokens().wrapper);
	assert.equal(
		await page.evaluate(
			() => typeof (window as { __dlpcc?: unknown }).__dlpcc
		),
		'object',
		'The browsing page should load the relay patch.'
	);
	await page
		.locator(id('search-input'))
		.fill(`http://127.0.0.1:${targetPort}/rtc`);
	await page.locator(id('search-input')).press('Enter');
	const result = JSON.parse(
		(await page
			.frameLocator(id('frame'))
			.locator('html[data-rtc]')
			.getAttribute('data-rtc')) ?? '{}'
	);
	console.log(
		`dlpcc probe: ${result.candidates?.length} candidates, pair ${result.pair}, ${result.mbps?.toFixed(0)} Mbps`
	);
	assert.equal(result.error, undefined, result.error);
	assert.equal(result.policy, 'relay');
	assert.ok(result.candidates.length > 0, 'ICE should gather candidates.');
	for (const candidate of result.candidates)
		assert.match(
			candidate,
			/ typ relay /,
			`Every candidate should be a relay one: ${candidate}`
		);
	assert.deepEqual(result.pair, ['relay', 'relay']);
	assert.ok(
		result.mbps >= 50,
		`The relay should carry at least 50 Mbps, got ${result.mbps}`
	);
} finally {
	await browser.close();
	target.close();
}
