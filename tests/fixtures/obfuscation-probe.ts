import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const load = <T>(path: string): Promise<T> =>
	import(pathToFileURL(join(process.cwd(), path)).href);
const { config } =
	await load<typeof import('../../src/config.ts')>('src/config.ts');
const { classNames, elementIds, rewriteClassReferences, rewriteStylesheet } =
	await load<typeof import('../../src/obfuscation/classes.ts')>(
		'src/obfuscation/classes.ts'
	);
const { obfuscateDocument } = await load<
	typeof import('../../src/obfuscation/documents.ts')
>('src/obfuscation/documents.ts');
const { scrubScramjetSignatures, scrubScramjetWasm, scramjetTokens } =
	await load<typeof import('../../src/obfuscation/scramjet-signatures.ts')>(
		'src/obfuscation/scramjet-signatures.ts'
	);
const { obfuscateScript, obfuscateVendorScript, stripObfuscatedMarker } =
	await load<typeof import('../../src/obfuscation/scripts.ts')>(
		'src/obfuscation/scripts.ts'
	);

const source =
	"(() => { const privateValue = 'private-value'; globalThis.result = privateValue; })();";
const html = `<html><head><style>.fancybutton { color: red; }</style></head><body><button id="csel" class="fancybutton">Test</button><script>${source}</script></body></html>`;
const scripts = [
	stripObfuscatedMarker(obfuscateScript(source, 'probe.js')),
	stripObfuscatedMarker(obfuscateVendorScript(source, 'vendor.js')),
];
const document = await obfuscateDocument(html, 'probe.html');
const css = rewriteStylesheet('.fancybutton { color: red; }');
const lookup = rewriteClassReferences(
	"document.querySelector('.fancybutton'); document.getElementById('csel');",
	'lookup.js'
);

if (config.usingSEO) {
	assert.deepEqual(classNames(), {});
	assert.deepEqual(elementIds(), {});
	assert.deepEqual(scripts, [source, source]);
	assert.equal(document, html);
	assert.equal(css, '.fancybutton { color: red; }');
	assert.equal(
		scrubScramjetSignatures('$scramjetController.createFrame'),
		'$scramjetController.createFrame'
	);
	const wasm = new TextEncoder().encode('scramjet');
	assert.equal(Buffer.from(scrubScramjetWasm(wasm)).toString(), 'scramjet');
} else {
	for (const code of scripts) {
		assert.doesNotMatch(code, /privateValue/);
		const context: { result?: string } = {};
		runInNewContext(code, context);
		assert.equal(context.result, 'private-value');
	}
	const name = classNames().fancybutton;
	assert.ok(name);
	assert.doesNotMatch(document, /privateValue|private-value|fancybutton/);
	assert.ok(document.includes(`class="${name}"`));
	assert.ok(document.includes(`.${name}`));
	assert.ok(css.includes(`.${name}`));
	assert.ok(lookup.includes(`.${name}`));
	const id = elementIds().csel;
	assert.ok(id);
	assert.ok(document.includes(`id="${id}"`));
	assert.ok(lookup.includes(`"${id}"`));
	assert.doesNotMatch(document + lookup, /csel/);

	const tokens = scramjetTokens();
	const sample = [
		'var $scramjetController;',
		'window.$scramjet$rewrite = $scramjet$wrap(location).href;',
		'document.querySelectorAll("script[scramjet-injected]")',
		'this.cookieJar = new CookieJar(); await controller.setTransport(t);',
		'controller.serviceWorkerController.createFrame(url);',
		'new Request("https://sj-cache.invalid/" + encodeURIComponent(url))',
		'$scramitize(); /*scramtag*/ $scramerr()',
		'window.$invisiScramjet.ready',
		'const { ScramjetClient } = $scramjet; c[SCRAMJETCLIENT]; loadScramjetWasm();',
		'throw Error("@mercuryworkshop/scramjet is not loaded")',
	].join('\n');
	const scrubbed = scrubScramjetSignatures(sample);
	assert.doesNotMatch(
		scrubbed,
		/scramjet|scram|sj-cache|invisiScramjet|mercury/i
	);
	const Core = tokens.core[0].toUpperCase() + tokens.core.slice(1);
	assert.ok(scrubbed.includes(`const { ${Core}Client } = $${tokens.core};`));
	assert.ok(scrubbed.includes(`c[${tokens.core.toUpperCase()}CLIENT]`));
	assert.ok(scrubbed.includes(`var $${tokens.controller};`));
	assert.doesNotMatch(scrubbed, /Controller;/);
	assert.ok(scrubbed.includes(`$${tokens.wrapper}.ready`));
	assert.ok(
		scrubbed.includes('new Request(url)'),
		'cache keys should use the real target URL'
	);
	assert.ok(
		scrubbed.includes(
			`this.${tokens.members.cookieJar} = new CookieJar(); await controller.${tokens.members.setTransport}(t);`
		)
	);
	const wasm = new TextEncoder().encode('scramjet scram wasm');
	const patched = scrubScramjetWasm(wasm);
	assert.equal(patched.length, wasm.length);
	assert.ok(
		patched.every(
			(byte, index) =>
				byte ===
				new TextEncoder().encode(`${tokens.core} ${tokens.scram} wasm`)[
					index
				]
		)
	);
}
