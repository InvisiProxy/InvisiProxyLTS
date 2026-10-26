import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import solid from 'vite-plugin-solid';
import { config } from '../config.ts';
import {
	entryPointFile,
	localesFile,
	notFoundFile,
	projectDir,
	routesFile,
} from '../constants.ts';
import data from '../data.json' with { type: 'json' };
import { elementIds } from '../obfuscation/classes.ts';
import { obfuscateDocument } from '../obfuscation/documents.ts';
import { maskText } from '../obfuscation/masks.ts';
import type { SiteValues } from '../site.ts';
import { getPathAliases } from '../obfuscation/paths.ts';
import {
	obfuscationState,
	obfuscationStateFile,
} from '../obfuscation/state.ts';
import {
	builtLocales,
	loadLocales,
	localeManifest,
	localePath,
	stripLocale,
	withLocale,
} from './locales.ts';
import { rootDataFiles } from './sources.ts';
import { buildValues } from './values.ts';

type Renderer = typeof import('../client/entry.tsx');
export type LoadRenderer = () => Promise<Renderer>;

export const rendererEntry = fileURLToPath(
	new URL('../client/entry.tsx', import.meta.url)
);

export const importRenderer: LoadRenderer = async () =>
	(
		await runnerImport<Renderer>(rendererEntry, {
			configFile: false,
			root: projectDir,
			logLevel: 'error',
			plugins: [solid({ ssr: true })],
		})
	).module;

export async function renderDocuments(
	values: SiteValues,
	load: LoadRenderer = importRenderer
): Promise<Record<string, string>> {
	const renderer = await load();
	const all = loadLocales();
	const locales = builtLocales(all);
	const documents = locales.flatMap((locale, index) =>
		Object.entries(
			renderer.renderDocuments(
				withLocale(values, locales, locale, all[0])
			)
		)
			.filter(([path]) => index === 0 || path !== entryPointFile)
			.map(([path, html]) => [
				localePath(locale.code, path, locales[0].code),
				html,
				path,
			])
	);
	return Object.fromEntries(
		await Promise.all(
			documents.map(async ([target, html, path]) => [
				target,
				await obfuscateDocument(html, path),
			])
		)
	);
}

let plainDocuments: Promise<Record<string, string>> | undefined;

export function getPlainDocuments(fresh = false, load?: LoadRenderer) {
	if (fresh || !plainDocuments)
		plainDocuments = renderDocuments(
			{ ...buildValues, inlineAssets: false },
			load
		);
	return plainDocuments;
}

export async function proxyErrorTemplates(): Promise<SiteValues['errors']> {
	const path = 'pages/proxnav/scramjet-error.html';
	const html = (await getPlainDocuments())[path];
	const allIds = elementIds();
	const scriptId = allIds['proxy-error-script'] || 'proxy-error-script';
	const script = new RegExp(
		`<script\\b[^>]*\\bid="${scriptId}"[^>]*\\bsrc="([^"]*)"[^>]*>`
	).exec(html);
	if (!script) throw new Error(`Missing error script element in ${path}`);
	const offset = script.index + script[0].indexOf('src="') + 5;
	const ids = Object.fromEntries(
		['fetchedURL', 'errorTrace', 'scramjetVersion', 'reload', 'copy-button']
			.filter((id) => allIds[id])
			.map((id) => [id, allIds[id]])
	);
	return {
		scramjet: {
			beforeScript: html.slice(0, offset),
			afterScript: html.slice(offset + script[1].length),
			ids,
		},
	};
}

export async function siteRoutes(load: LoadRenderer = importRenderer) {
	return {
		...(await load()).pageRoutes(),
		...Object.fromEntries(rootDataFiles().map((file) => [file, file])),
	};
}

function isDisguisedDocument(path: string) {
	return (
		config.disguiseFiles &&
		path.endsWith('.html') &&
		(!path.includes('/') ||
			(path.startsWith('pages/') && !path.split('/').includes('deobf')))
	);
}

const gzip = async (html: string) =>
	new Uint8Array(
		await new Response(
			new Blob([new TextEncoder().encode(html)])
				.stream()
				.pipeThrough(new CompressionStream('gzip'))
		).arrayBuffer()
	);

interface RenderOptions {
	load?: LoadRenderer;
	fresh?: boolean;
	head?: string;
}

export async function renderSite({
	load,
	fresh = false,
	head = '',
}: RenderOptions = {}) {
	const files: Record<string, string | Uint8Array> = {};
	const documents = await renderDocuments(buildValues, load);
	for (const [path, document] of Object.entries(documents)) {
		const html = head
			? document.replace(/<head>(?:<meta charset="utf-8">)?/, `$&${head}`)
			: document;
		files[path] = isDisguisedDocument(stripLocale(path))
			? await gzip(html)
			: html;
	}
	files[routesFile] = JSON.stringify(await siteRoutes(load));
	files[
		`assets/json/${getPathAliases()['files/splash.json'] || 'splash.json'}`
	] = JSON.stringify(data.splash.map(maskText));
	const locales = builtLocales(loadLocales());
	const root = locales[0].code;
	const plain = await getPlainDocuments(fresh, load);
	for (const { code } of locales)
		files[localePath(code, notFoundFile, root)] =
			plain[localePath(code, 'error.html', root)];
	files[localesFile] = JSON.stringify(localeManifest(locales));
	files[obfuscationStateFile] = JSON.stringify(obfuscationState());
	return files;
}
