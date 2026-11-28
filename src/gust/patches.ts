const gustPublicRelayFallback = 'wss://wisp.mercurywork.shop/';

interface Splice {
	label: string;
	at: number;
	end: number;
	next: string;
	needle: string;
}

const lineStart = (text: string, index: number) => {
	const at = text.lastIndexOf('\n', index);
	return at === -1 ? 0 : at + 1;
};

const lineEnd = (text: string, index: number) => {
	const at = text.indexOf('\n', index);
	return at === -1 ? text.length : at + 1;
};

export function applyGustPatches(upstream: string): string {
	const problems: string[] = [];
	const splices: Splice[] = [];

	const count = (needle: string) => upstream.split(needle).length - 1;
	const exact = (needle: string, next: string, label: string) => {
		const occurrences = count(needle);
		if (occurrences !== 1)
			problems.push(
				`${label}: expected exactly one occurrence, found ${occurrences}`
			);
		splices.push({
			label,
			at: upstream.indexOf(needle),
			end: upstream.indexOf(needle) + needle.length,
			next,
			needle,
		});
	};
	const span = (
		startNeedle: string,
		endNeedle: string,
		next: string,
		label: string,
		mustInclude: string[] = []
	) => {
		const start = upstream.indexOf(startNeedle);
		if (start === -1) {
			problems.push(`${label}: start anchor not found`);
			return;
		}
		const begin = lineStart(upstream, start);
		const endAt = upstream.indexOf(endNeedle, begin);
		if (endAt === -1) {
			problems.push(`${label}: end anchor not found`);
			return;
		}
		const end = lineEnd(upstream, endAt);
		const segment = upstream.slice(begin, end);
		for (const needed of mustInclude)
			if (!segment.includes(needed))
				problems.push(`${label}: segment missing ${needed}`);
		if (count(segment) !== 1)
			problems.push(`${label}: segment not unique (${count(segment)})`);
		splices.push({ label, at: begin, end, next, needle: segment });
	};

	exact(
		`<script>\n        (function () {\n            // ── Private state variables`,
		`<script>
        const GUST_PROJECT_WISP = (function () { try { var p = "__IP_WISP_ROUTE__"; if (p.indexOf("__") !== -1 || !location.host) return "${gustPublicRelayFallback}"; return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + p; } catch (e) { return "${gustPublicRelayFallback}"; } })();
        (function () {
            // ── Private state variables`,
		'engine wisp constant'
	);

	exact(
		'const WISPS=["wss://wisp.mercurywork.shop/","wss://anura.pro/","wss://wisp.terbiumon.top/wisp/"];',
		'const WISPS=[GUST_PROJECT_WISP];',
		'embed relay list'
	);

	exact(
		'  for(const w of [...new Set([saved,...WISPS].filter(Boolean))]){',
		'  for(const w of [...new Set([...WISPS,saved].filter(Boolean))]){',
		'embed probe order'
	);

	exact(
		'            let WISP = (function () { try { return ls.getItem(\'gust:wisp:v1\') || ls.getItem(\'gust:wisp:fastest:v1\') || "wss://wisp.mercurywork.shop/"; } catch { return "wss://wisp.mercurywork.shop/"; } })();',
		"            let WISP = (function () { try { return ls.getItem('gust:wisp:v1') || GUST_PROJECT_WISP; } catch { return GUST_PROJECT_WISP; } })();",
		'wisp initializer'
	);

	{
		const marker = upstream.indexOf('// ── WISP pool: round-robin');
		const listStart = upstream.indexOf(
			'const WISP_POOL_DEFAULTS = [...new Set(['
		);
		const listEnd =
			listStart === -1 ? -1 : upstream.indexOf('])];', listStart);
		const boundsOk =
			marker !== -1 &&
			listStart !== -1 &&
			listEnd !== -1 &&
			listEnd - listStart < 2000 &&
			listEnd > marker;
		if (
			!boundsOk ||
			count('const WISP_POOL_DEFAULTS = [...new Set([') !== 1
		)
			problems.push('relay pool defaults: anchors not found/unambiguous');
		else {
			const begin = lineStart(upstream, marker);
			const end = lineEnd(upstream, listEnd);
			const segment = upstream.slice(begin, end);
			if (
				!segment.includes('WISP_POOL_DEFAULTS') ||
				!segment.includes('mercurywork')
			)
				problems.push('relay pool defaults: segment mismatch');
			if (count(segment) !== 1)
				problems.push(
					`relay pool defaults: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'relay pool defaults',
				at: begin,
				end,
				next: '            const WISP_POOL_DEFAULTS = [];',
				needle: segment,
			});
		}
	}

	exact(
		"            function poolModeOn() { try { return ls.getItem('gust:wisp:poolmode:v1') !== '0'; } catch { return true; } }",
		'            function poolModeOn() { return false; }',
		'pool mode switch'
	);

	{
		const start = upstream.indexOf(
			'            function benchmarkWispPool(onProgress) {'
		);
		const mark = upstream.indexOf('return _wispBenchmarkPromise;', start);
		const close =
			mark === -1 ? -1 : upstream.indexOf('\n            }', mark);
		if (start === -1 || mark === -1 || close === -1)
			problems.push('benchmark pool: anchors not found');
		else {
			const startLine = lineStart(upstream, start);
			const end = lineEnd(upstream, close + 1);
			const segment = upstream.slice(startLine, end);
			if (
				!segment.includes('probeWispPoolServer') ||
				!segment.includes('wispBenchmarking')
			)
				problems.push('benchmark pool: segment mismatch');
			if (count(segment) !== 1)
				problems.push(
					`benchmark pool: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'benchmark pool',
				at: startLine,
				end,
				next: `            function benchmarkWispPool(onProgress) {
                return Promise.resolve();
            }`,
				needle: segment,
			});
		}
	}

	{
		const start = upstream.indexOf(
			'            function rememberFastestRelay() {'
		);
		const mark =
			start === -1
				? -1
				: upstream.indexOf(
						"if (ranked[0]) { try { ls.setItem('gust:wisp:fastest:v1', ranked[0]); } catch {} }",
						start
					);
		const close =
			mark === -1 ? -1 : upstream.indexOf('\n            }', mark);
		if (start === -1 || mark === -1 || close === -1)
			problems.push('remember fastest: anchors not found');
		else {
			const end = lineEnd(upstream, close + 1);
			const segment = upstream.slice(start, end);
			if (
				!segment.includes('rememberFastestRelay()') ||
				!segment.includes('getWispPool()')
			)
				problems.push('remember fastest: segment mismatch');
			if (count(segment) !== 1)
				problems.push(
					`remember fastest: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'remember fastest',
				at: start,
				end,
				next: '            function rememberFastestRelay() {}',
				needle: segment,
			});
		}
	}

	exact(
		'const defaultWisp = "wss://wisp.mercurywork.shop/";',
		'const defaultWisp = GUST_PROJECT_WISP;',
		'settings reset default'
	);

	exact(
		`            // Background-benchmark the WISP pool at startup so round-robin picks
            // (if enabled) already have latency data for the first navigation, then
            // remember the fastest healthy relay as next launch's startup default.
`,
		'',
		'stale startup probe comment'
	);

	exact(
		`            // Priority: user-pinned relay (gust:wisp:v1) > fastest relay learned
            // in the background last session (gust:wisp:fastest:v1) > hardcoded
            // default. The middle tier is why fresh installs land on the slow
            // hardcoded default only once — after the first background probe the
            // next launch starts on whatever relay is actually fastest.
`,
		'',
		'stale initializer comment'
	);

	{
		const start = upstream.indexOf('fa-tower-broadcast');
		const benchEnd =
			start === -1
				? -1
				: upstream.indexOf(
						"Re-benchmark relays now</button></div>' +",
						start
					);
		if (start === -1 || benchEnd === -1)
			problems.push('GX relay card: anchors not found');
		else
			span(
				'\'<div class="gxc-card wide"><div class="gxc-cardhead"><i class="fa-solid fa-tower-broadcast"',
				"Re-benchmark relays now</button></div>' +",
				'',
				'GX relay card',
				['gxcWispSw', 'gxcWispBench', 'Multi-WISP Pool']
			);
	}

	{
		const start = upstream.indexOf(
			"const wispSw = gxControl.querySelector('#gxcWispSw');"
		);
		const upgrade =
			start === -1
				? -1
				: upstream.indexOf("gxPlay('LEVEL_UPGRADE');", start);
		const outerClose =
			upgrade === -1
				? -1
				: upstream.indexOf('\n                    });', upgrade);
		if (start === -1 || upgrade === -1 || outerClose === -1)
			problems.push('GX relay wiring: anchors not found');
		else {
			const begin = lineStart(upstream, start);
			const end = lineEnd(upstream, outerClose + 1);
			const segment = upstream.slice(begin, end);
			if (
				!segment.includes('wispBench') ||
				!segment.includes('Benchmarking')
			)
				problems.push('GX relay wiring: segment mismatch');
			if (count(segment) !== 1)
				problems.push(
					`GX relay wiring: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'GX relay wiring',
				at: begin,
				end,
				next: '',
				needle: segment,
			});
		}
	}

	{
		const anchor = upstream.indexOf('id="settingsWispStatus"');
		const cardStart =
			anchor === -1
				? -1
				: upstream.indexOf('<div class="settings-card">', anchor);
		const nextCard =
			cardStart === -1
				? -1
				: upstream.indexOf(
						'<div class="settings-card">',
						cardStart + 20
					);
		if (anchor === -1 || cardStart === -1 || nextCard === -1)
			problems.push('settings pool card: anchors not found');
		else {
			const segment = upstream.slice(cardStart, nextCard);
			for (const needed of [
				'WISP Pool (Round-Robin)',
				'settingsPoolBenchmarkBtn',
				'settingsPoolModeSwitch',
				'settingsPoolList',
			])
				if (!segment.includes(needed))
					problems.push(
						`settings pool card: segment missing ${needed}`
					);
			if (count(segment) !== 1)
				problems.push(
					`settings pool card: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'settings pool card',
				at: cardStart,
				end: nextCard,
				next: '',
				needle: segment,
			});
		}
	}

	exact(
		"                    { id: 'settingsPoolModeSwitch', key: 'gust:wisp:poolmode:v1', defaultOn: true },\n",
		'',
		'settings pool switch entry'
	);

	{
		const start = upstream.indexOf('// ── WISP pool status / benchmark');
		const tail =
			start === -1
				? -1
				: upstream.indexOf(
						'poolBenchmarkStatus.textContent = "Last run: just now";',
						start
					);
		const close =
			tail === -1 ? -1 : upstream.indexOf('\n                }', tail);
		if (start === -1 || tail === -1 || close === -1)
			problems.push('settings benchmark wiring: anchors not found');
		else {
			const begin = lineStart(upstream, start);
			const end = lineEnd(upstream, close + 1);
			const segment = upstream.slice(begin, end);
			if (
				!segment.includes('poolBenchmarkBtn') ||
				!segment.includes('Last run: just now')
			)
				problems.push('settings benchmark wiring: segment mismatch');
			if (count(segment) !== 1)
				problems.push(
					`settings benchmark wiring: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'settings benchmark wiring',
				at: begin,
				end,
				next: '',
				needle: segment,
			});
		}
	}

	{
		const link = upstream.indexOf('<link rel="icon"');
		if (link === -1 || count('<link rel="icon"') !== 1)
			problems.push('tab favicon: link missing/not unique');
		else {
			const href = upstream.indexOf('href="data:image/svg+xml', link);
			const openQuote = upstream.indexOf('"', href + 5);
			const valueEnd = upstream.indexOf('"', openQuote + 1);
			const end = upstream.indexOf('>', valueEnd) + 1;
			const segment = upstream.slice(link, end);
			if (!segment.includes('data:image/svg+xml'))
				problems.push('tab favicon: segment mismatch');
			if (count(segment) !== 1)
				problems.push(
					`tab favicon: segment not unique (${count(segment)})`
				);
			splices.push({
				label: 'tab favicon',
				at: link,
				end,
				next: '<link rel="icon" type="image/svg+xml" href="__IP_GUST_WIND__" />',
				needle: segment,
			});
		}
	}

	if (problems.length)
		throw new Error(
			`GUST patches no longer match the vendored document:\n${problems
				.map((problem) => ` - ${problem}`)
				.join('\n')}`
		);

	let document = upstream;
	for (const patch of splices.sort((a, b) => b.at - a.at)) {
		const segment = document.slice(patch.at, patch.end);
		if (segment !== patch.needle)
			throw new Error(
				`GUST patch drifted while applying: ${patch.label}`
			);
		document =
			document.slice(0, patch.at) +
			patch.next +
			document.slice(patch.end);
	}
	return document;
}
