import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config, serverUrl } from '../config.ts';
import { isDevelopment, siteDir, stagingDir } from '../constants.ts';
import data from '../data.json' with { type: 'json' };
import { getPathAliases } from '../obfuscation/paths.ts';
import { type SiteValues, setSiteValues } from '../site.ts';
import { builtLocales, loadLocales } from './locales.ts';

const labelKeys = [
	'Bing',
	'Brave',
	'DuckDuckGo',
	'Startpage',
	'Google',
	'libcurl',
];
const labels = Object.fromEntries(labelKeys.map((name) => [name, name]));

const [english, ...others] = loadLocales();
const locales = builtLocales([english, ...others]);

let assetDir = siteDir;
export function readFromStaging(staging: boolean) {
	assetDir = staging ? stagingDir : siteDir;
}

function readAsset(path: string) {
	const realPrefixes = Object.fromEntries(
		Object.entries(getPathAliases())
			.filter(([key]) => key.startsWith('prefixes/'))
			.map(([key, value]) => [value, key.slice('prefixes/'.length)])
	);
	const relative = (
		path.startsWith(serverUrl.pathname)
			? path.slice(serverUrl.pathname.length)
			: path.replace(/^\.\//, '')
	)
		.split('/')
		.map((part) => realPrefixes[part] || part)
		.join('/');
	const location = join(assetDir, relative);
	return existsSync(location) ? readFileSync(location, 'utf8') : undefined;
}

export const buildValues: SiteValues = {
	get development() {
		return isDevelopment();
	},
	usingSEO: config.usingSEO,
	showSplash: config.showSplash,
	disguiseFiles: config.disguiseFiles,
	inlineAssets: config.disguiseFiles && config.minifyScripts,
	basePath: serverUrl.pathname,
	get aliases() {
		return getPathAliases();
	},
	cacheBust: {},
	version: String(data.version),
	cacheKey: crypto.getRandomValues(new Uint32Array(1))[0],
	storageNamespace: config.usingSEO ? 'ip' : 'net-time',
	labels,
	defaultSearch: labels.DuckDuckGo,
	splash: [...data.splash],
	keywordText: [...data.content],
	keywordFacts: [...data.keywords],
	characters: [...data.masks.characters],
	maskedTerms: [...english.maskedTerms],
	errors: {},
	locale: locales[0].code,
	locales: locales.map(({ code, name }) => ({ code, name })),
	readAsset,
};

setSiteValues(buildValues);
