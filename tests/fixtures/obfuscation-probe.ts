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
}
