import { basename, extname, join } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { config } from '../config.ts';
import { projectDir } from '../constants.ts';
import { externalPages } from '../server/links.ts';
import {
	generatedNames,
	obfuscationState,
	saveObfuscationState,
} from './state.ts';

type Routes = Record<string, string>;
const apiEndpoints = ['link', 'clear'] as const;
type Links = Record<string, string | Record<string, string>>;

export function getPathAliases(): Record<string, string> {
	if (config.usingSEO) return {};
	const state = obfuscationState();
	if (Object.keys(state.aliases).length) return state.aliases;
	const keys = new Set<string>();
	const source = ts.createSourceFile(
		'pages.ts',
		readFileSync(join(projectDir, 'src/client/pages.ts'), 'utf8'),
		ts.ScriptTarget.Latest,
		true
	);
	function visit(node: ts.Node) {
		if (
			ts.isPropertyAssignment(node) &&
			node.name.getText(source) === 'route'
		) {
			const routes = ts.isArrayLiteralExpression(node.initializer)
				? node.initializer.elements
				: [node.initializer];
			for (const route of routes)
				if (ts.isStringLiteralLike(route) && route.text)
					keys.add(route.text);
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	for (const [name, target] of Object.entries(externalPages)) {
		keys.add(name);
		if (typeof target !== 'string')
			for (const child of Object.keys(target))
				if (child !== 'default') keys.add(`${name}/${child}`);
	}
	for (const prefix of ['scram', 'libcurl', 'epoxy', 'wisp', 'network', 'api'])
		keys.add(`prefixes/${prefix}`);
	for (const endpoint of apiEndpoints) keys.add(`api/${endpoint}`);
	const assetDir = join(projectDir, 'views/assets');
	const files = (
		existsSync(assetDir)
			? readdirSync(assetDir, {
					recursive: true,
					encoding: 'utf8',
				})
			: []
	)
		.filter((file) => extname(file) && !file.endsWith('.map'))
		.map((file) => basename(file).replace(/\.ts$/, '.js'));
	files.push(
		'sw.js',
		'sw-blacklist.js',
		'faq-search.js',
		'particles.js',
		'tooltips.js',
		'aos.js',
		'splash.json',
		'scramjet.js',
		'scramjet.wasm',
		'controller.api.js',
		'controller.inject.js',
		'controller.sw.js',
		'scramjet-utils.js',
		'fa-brands-400.woff2',
		'fa-regular-400.woff2',
		'fa-solid-900.woff2'
	);
	for (const file of files) keys.add(`files/${file}`);
	const names = generatedNames(keys, 'paths');
	state.aliases = Object.fromEntries(
		Object.entries(names).map(([key, value]) => {
			if (key.startsWith('files/')) return [key, value + extname(key)];
			if (key.includes('/') && !key.startsWith('prefixes/'))
				return [key, key.slice(0, key.indexOf('/') + 1) + value];
			return [key, value];
		})
	);
	saveObfuscationState(state);
	return state.aliases;
}

export function apiPath(endpoint: (typeof apiEndpoints)[number]) {
	const aliases = getPathAliases();
	const name = aliases[`api/${endpoint}`]?.split('/').at(-1) || endpoint;
	return `${aliases['prefixes/api'] || 'api'}/${name}`;
}

export const getAltPrefix = (prefix: string, serverPathname = '/') =>
	`${serverPathname}${getPathAliases()[`prefixes/${prefix}`] || prefix}/`;

export function aliasRoutes<P extends Routes, L extends Links>(
	pages: P,
	links: L
) {
	const aliases = getPathAliases();
	return {
		pages: Object.fromEntries(
			Object.entries(pages)
				.filter(
					([name]) =>
						config.usingSEO ||
						!['robots.txt', 'sitemap.xml'].includes(name)
				)
				.map(([name, target]) => [aliases[name] || name, target])
		) as P,
		links: Object.fromEntries(
			Object.entries(links).map(([name, target]) => [
				aliases[name] || name,
				typeof target === 'string'
					? target
					: Object.fromEntries(
							Object.entries(target).map(([child, url]) => [
								(
									aliases[`${name}/${child}`] ||
									`${name}/${child}`
								)
									.split('/')
									.at(-1) || child,
								url,
							])
						),
			])
		) as L,
	};
}
