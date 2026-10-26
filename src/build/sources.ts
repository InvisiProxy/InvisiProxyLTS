import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { config } from '../config.ts';
import { projectDir } from '../constants.ts';
import { getPathAliases } from '../obfuscation/paths.ts';

export interface SiteFile {
	source: string;
	target: string;
	kind: 'copy' | 'text' | 'json' | 'script' | 'vendor-script' | 'style';
}

const modulePath = (path: string) => join(projectDir, 'node_modules', path);

// Merp fix
const vendorDirs: [prefix: string, dir: string, files: string[]][] = [
	[
		'epoxy',
		modulePath('@mercuryworkshop/epoxy-transport/dist'),
		['index.mjs'],
	],
	[
		'libcurl',
		modulePath('@mercuryworkshop/libcurl-transport/dist'),
		['index.mjs'],
	],
	['scram', scramjetPath, ['scramjet.js', 'scramjet.wasm']],
	[
		'assets/webfonts',
		modulePath('@fortawesome/fontawesome-free/webfonts'),
		['fa-brands-400.woff2', 'fa-regular-400.woff2', 'fa-solid-900.woff2'],
	],
	[
		'scram',
		modulePath('@mercuryworkshop/scramjet-controller/dist'),
		['controller.api.js', 'controller.inject.js', 'controller.sw.js'],
	],
	[
		'scram',
		modulePath('@mercuryworkshop/scramjet-utils/dist'),
		['scramjet-utils.js'],
	],
];

const clientScript = (name: string): SiteFile => ({
	source: join(projectDir, `src/client/${name}.tsx`),
	get target() {
		return `assets/js/${getPathAliases()[`files/${name}.js`] || `${name}.js`}`;
	},
	kind: 'script',
});

export const faqSearch = clientScript('faq-search');
export const clientScripts = [
	faqSearch,
	clientScript('particles'),
	clientScript('tooltips'),
	clientScript('aos'),
];

export function siteFiles(): SiteFile[] {
	const files: SiteFile[] = [];
	const claimed = new Set<string>();
	const ignoredDirs = ['dist', 'dist-new', 'assets', 'scram'];
	const ignoredFiles = /\.map$|\.d\.ts$/;
	const alias = (name: string) =>
		(!config.usingSEO && getPathAliases()[`files/${name}`]) || name;

	const collect = (
		dir: string,
		outDir: string,
		fromViews: boolean,
		only?: string[]
	) => {
		if (fromViews && outDir === 'assets/css/partials/') return;
		for (const file of only ?? readdirSync(dir)) {
			if (
				(fromViews && ignoredDirs.includes(file)) ||
				ignoredFiles.test(file)
			)
				continue;
			const source = join(dir, file);
			const stats = lstatSync(source);
			if (stats.isDirectory()) {
				collect(source, `${outDir + file}/`, fromViews);
				continue;
			}
			if (!stats.isFile()) continue;
			const target = outDir + alias(file.replace(/\.ts$/, '.js'));
			if (claimed.has(target)) continue;
			let kind: SiteFile['kind'] = 'copy';
			if (!fromViews && /\.(?:m?js|cjs)$/.test(file))
				kind = 'vendor-script';
			if (fromViews) {
				if (/\.(?:ts|js)$/.test(file)) kind = 'script';
				else if (/^assets\/css\/[^/]+\.css$/.test(target))
					kind = 'style';
				else if (file.endsWith('.json')) kind = 'json';
				else if (/\.(?:html|css|txt|xml)$/.test(file)) kind = 'text';
			}
			if (kind !== 'script') claimed.add(target);
			files.push({ source, target, kind });
		}
	};

	collect(join(projectDir, 'views/assets'), 'assets/', true);
	for (const [prefix, path, only] of vendorDirs) {
		const missing = only.filter((file) => !existsSync(join(path, file)));
		if (missing.length) {
			console.warn(
				`[Build] Skipping "${prefix}": ${missing.join(', ')} not found in ${path}.`
			);
			continue;
		}
		collect(path, `${prefix}/`, false, only);
	}
	collect(join(projectDir, 'views'), '', true);
	return files;
}

export const siteScripts = () => [
	...siteFiles().filter((file) => file.kind === 'script'),
	...clientScripts,
];

export const rootDataFiles = () =>
	siteFiles()
		.filter(
			({ target, kind }) =>
				!target.includes('/') &&
				(kind === 'json' || kind === 'text') &&
				/\.(?:json|xml|txt)$/.test(target)
		)
		.map(({ target }) => target);
