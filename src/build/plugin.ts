import {
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import type { Root } from 'postcss';
import type {
	EnvironmentOptions,
	Plugin,
	Rolldown,
	UserConfig,
	ViteBuilder,
} from 'vite';
import { config } from '../config.ts';
import {
	isDevelopment,
	projectDir,
	serverDir,
	siteDir,
	stagingDir,
} from '../constants.ts';
import { rewriteSelector } from '../obfuscation/classes.ts';
import {
	browserObfuscationPlugin,
	obfuscateVendorScript,
	stripObfuscatedMarker,
} from '../obfuscation/scripts.ts';
import { route } from '../site.ts';
import { beginObfuscationBuild } from '../obfuscation/state.ts';
import {
	getPlainDocuments,
	proxyErrorTemplates,
	renderSite,
} from './render.ts';
import { builtLocales, loadLocales, localizeSitemap } from './locales.ts';
import { faqSearch, type SiteFile, siteFiles, siteScripts } from './sources.ts';
import { buildValues, readFromStaging } from './values.ts';

export const scriptEnvironment = (index: number) => `script_${index}`;
export const watchedEnvironments = () => [
	'client',
	'styles',
	...siteScripts().map((_, index) => scriptEnvironment(index)),
];

const valuesModule = 'build:invisiproxy';
const errorsModule = 'build:invisiproxy-errors';
const emptyEntry = '\0invisiproxy:empty';

const sourcePath = (path: string) =>
	JSON.stringify(fileURLToPath(new URL(path, import.meta.url)));

const outputDir = () => (isDevelopment() ? siteDir : stagingDir);

function transformStylesheet(root: Root) {
	root.walkDecls((declaration) => {
		declaration.value = declaration.value.replace(
			/url\((["']?)(\/assets\/[^)"']+)\1\)/g,
			(_match, quote, path) => `url(${quote}${route(path)}${quote})`
		);
	});
	if (!config.usingSEO)
		root.walkRules((rule) => {
			rule.selector = rewriteSelector(rule.selector);
		});
}

function rewriteAssetReferences(text: string) {
	return text.replace(
		/(["'])(\/?assets\/[^"']+)\1/g,
		(_match, quote, path) => `${quote}${route(path)}${quote}`
	);
}

function readText(file: SiteFile) {
	const text = readFileSync(file.source, 'utf8');
	if (file.target !== 'sitemap.xml' || !config.usingSEO) return text;
	const codes = builtLocales(loadLocales()).map(({ code }) => code);
	return localizeSitemap(text, codes);
}

function dropChunks(bundle: Rolldown.OutputBundle) {
	for (const [name, output] of Object.entries(bundle))
		if (output.type === 'chunk') delete bundle[name];
}

function environments(): Record<string, EnvironmentOptions> {
	const outDir = outputDir();
	const watch = isDevelopment() ? {} : null;
	const shared = {
		outDir,
		emptyOutDir: false,
		copyPublicDir: false,
		reportCompressedSize: false,
	};
	const scripts = Object.fromEntries(
		siteScripts().map((script, index) => [
			scriptEnvironment(index),
			{
				consumer: 'client',
				build: {
					...shared,
					outDir: join(outDir, dirname(script.target)),
					watch,
					minify: config.minifyScripts,
					target: 'esnext',
					lib: {
						entry: script.source,
						formats: ['iife'],
						name:
							script === faqSearch ? 'FAQSearch' : 'InvisiAsset',
						fileName: () => basename(script.target),
					},
					rolldownOptions:
						script === faqSearch
							? {}
							: {
									treeshake: false,
									output: { codeSplitting: false },
								},
				},
			} satisfies EnvironmentOptions,
		])
	);
	const styles = siteFiles().filter((file) => file.kind === 'style');
	return {
		client: {
			consumer: 'client',
			build: {
				...shared,
				watch,
				rolldownOptions: { input: emptyEntry },
			},
		},
		styles: {
			consumer: 'client',
			build: {
				...shared,
				watch,
				cssCodeSplit: true,
				minify: config.minifyScripts,
				cssMinify: isDevelopment() ? config.minifyScripts : true,
				rolldownOptions: {
					input: Object.fromEntries(
						styles.map((style) => [
							style.target.replace(/\.css$/, ''),
							style.source,
						])
					),
					output: { assetFileNames: '[name][extname]' },
				},
			},
		},
		...scripts,
		pages: {
			consumer: 'client',
			build: { ...shared, rolldownOptions: { input: emptyEntry } },
		},
		ssr: {
			consumer: 'server',
			resolve: { external: ['send', 'wispurr'] },
			build: {
				outDir: serverDir,
				emptyOutDir: true,
				target: 'node24',
				minify: false,
				rolldownOptions: {
					input: join(projectDir, 'src/server/index.ts'),
					output: {
						entryFileNames: 'server.js',
						codeSplitting: false,
					},
				},
			},
		},
	};
}

async function buildApp(builder: ViteBuilder) {
	const { environments: built } = builder;
	rmSync(stagingDir, { force: true, recursive: true });
	mkdirSync(stagingDir);
	readFromStaging(true);
	try {
		await getPlainDocuments(true);
		await builder.build(built.client);
		await Promise.all(
			siteScripts().map((_, index) =>
				builder.build(built[scriptEnvironment(index)])
			)
		);
		await builder.build(built.styles);
		await builder.build(built.pages);
		for (const script of [
			...siteScripts(),
			...siteFiles().filter((file) => file.kind === 'vendor-script'),
		]) {
			const path = join(stagingDir, script.target);
			const source = readFileSync(path, 'utf8');
			const finished = stripObfuscatedMarker(source);
			if (finished !== source) writeFileSync(path, finished);
			if (script.kind === 'vendor-script') {
				writeFileSync(`${path}.gz`, gzipSync(finished));
				writeFileSync(
					`${path}.br`,
					brotliCompressSync(finished, {
						params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
					})
				);
			}
		}
		await builder.build(built.ssr);
		rmSync(siteDir, { force: true, recursive: true });
		renameSync(stagingDir, siteDir);
	} finally {
		readFromStaging(false);
	}
}

export function siteBuildPlugin(): Plugin[] {
	const emitted = new Map<string, number>();
	return [
		{
			name: 'invisiproxy-site',
			config(_config, { command }): UserConfig | undefined {
				if (command !== 'build') return;
				if (!isDevelopment()) beginObfuscationBuild();
				return {
					logLevel: isDevelopment()
						? undefined
						: config.verbose
							? 'info'
							: 'warn',
					environments: environments(),
					css: {
						postcss: {
							plugins: [
								{
									postcssPlugin: 'invisiproxy-styles',
									Once: transformStylesheet,
								},
							],
						},
					},
					builder: { buildApp, sharedConfigBuild: true },
				};
			},
			resolveId(id) {
				if (id === emptyEntry) return id;
				if (id === valuesModule || id === errorsModule)
					return `\0${id}`;
			},
			async load(id) {
				if (id === emptyEntry) return '';
				if (id === `\0${errorsModule}`)
					return `import { values, renderProxyError } from '${valuesModule}'; values.errors = ${JSON.stringify(await proxyErrorTemplates())}; export { renderProxyError };`;
				if (id !== `\0${valuesModule}`) return;
				const { readAsset, ...values } = buildValues;
				const site = sourcePath('../site.ts');
				const masks = sourcePath('../obfuscation/masks.ts');
				return `import { setSiteValues } from ${site}; setSiteValues(${JSON.stringify(values)}); export * from ${site}; export * from ${masks};`;
			},
		},
		{
			name: 'invisiproxy-static',
			applyToEnvironment: (environment) => environment.name === 'client',
			generateBundle(_options, bundle) {
				dropChunks(bundle);
				const development = isDevelopment();
				for (const file of siteFiles()) {
					if (file.kind === 'script' || file.kind === 'style')
						continue;
					if (development) {
						this.addWatchFile(file.source);
						const modified = statSync(file.source).mtimeMs;
						if (emitted.get(file.source) === modified) continue;
						emitted.set(file.source, modified);
					}
					const original =
						file.kind === 'copy' || file.kind === 'vendor-script'
							? readFileSync(file.source)
							: file.kind === 'json'
								? rewriteAssetReferences(
										JSON.stringify(
											JSON.parse(
												readFileSync(
													file.source,
													'utf8'
												)
											)
										)
									)
								: rewriteAssetReferences(readText(file));
					const source =
						!config.usingSEO && file.kind === 'vendor-script'
							? obfuscateVendorScript(
									original.toString(),
									file.target
								)
							: original;
					this.emitFile({
						type: 'asset',
						fileName: file.target,
						source,
					});
					if (
						!development &&
						file.kind !== 'vendor-script' &&
						/^(?:scram|libcurl)\/.*\.(?:m?js|wasm)$/.test(
							file.target
						)
					) {
						this.emitFile({
							type: 'asset',
							fileName: `${file.target}.gz`,
							source: gzipSync(source),
						});
						this.emitFile({
							type: 'asset',
							fileName: `${file.target}.br`,
							source: brotliCompressSync(source, {
								params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
							}),
						});
					}
				}
			},
		},
		{
			name: 'invisiproxy-styles',
			applyToEnvironment: (environment) => environment.name === 'styles',
			generateBundle(_options, bundle) {
				dropChunks(bundle);
			},
		},
		{
			...browserObfuscationPlugin(),
			applyToEnvironment: (environment) =>
				environment.name.startsWith('script_'),
		},
		{
			name: 'invisiproxy-pages',
			applyToEnvironment: (environment) => environment.name === 'pages',
			async generateBundle(_options, bundle) {
				dropChunks(bundle);
				for (const [fileName, source] of Object.entries(
					await renderSite()
				))
					this.emitFile({ type: 'asset', fileName, source });
			},
		},
	];
}
