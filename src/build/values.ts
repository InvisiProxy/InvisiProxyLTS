import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config, serverUrl } from '../config.ts';
import { isDevelopment, siteDir, stagingDir } from '../constants.ts';
import data from '../data.json' with { type: 'json' };
import { getPathAliases } from '../obfuscation/paths.ts';
import { type HoneypotForm, type SiteValues, setSiteValues } from '../site.ts';
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

function randomToken(min = 5, max = 9) {
	const length = min + Math.floor(Math.random() * (max - min + 1));
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let token = alphabet[Math.floor(Math.random() * 26)];
	for (let i = 1; i < length; i++)
		token += alphabet[Math.floor(Math.random() * alphabet.length)];
	return token;
}

function pick<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

function buildHoneypot(): HoneypotForm {
	const identityNames = ['email', 'login', 'account', 'user', 'userid'];
	const identityLabels = ['Email', 'Username', 'Login', 'Account'];
	const secretNames = ['pass', 'secret', 'pw', 'key', 'token'];
	const secretLabels = ['Password', 'Passphrase', 'Secret'];
	return {
		formId: randomToken(),
		fields: [
			{
				id: randomToken(),
				name: pick(identityNames),
				type: 'text',
				placeholder: pick(identityLabels),
				autocomplete: 'username',
				label: pick(identityLabels),
			},
			{
				id: randomToken(),
				name: pick(secretNames),
				type: 'password',
				placeholder: '•'.repeat(6 + Math.floor(Math.random() * 4)),
				autocomplete: 'current-password',
				label: pick(secretLabels),
			},
		],
	};
}

function codecKey(): string {
	if (config.usingSEO) return '';
	return Array.from(
		crypto.getRandomValues(new Uint8Array(24)),
		(byte) => String.fromCharCode(33 + (byte % 94))
	).join('');
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
	proxyCodecKey: codecKey(),
	honeypot: buildHoneypot(),
	cloakTypes: {
		none: config.usingSEO ? 'none' : randomToken(),
		blank: config.usingSEO ? 'blank' : randomToken(),
		blob: config.usingSEO ? 'blob' : randomToken(),
	},
	storageNamespace: config.usingSEO ? 'ip' : 'net-time',
	labels,
	defaultSearch: labels.DuckDuckGo,
	splash: [...data.splash],
	keywordText: [...data.content],
	keywordFacts: [...data.keywords],
	factAttribute: `data-${randomToken(3, 8)}`,
	characters: [...data.masks.characters],
	maskedTerms: [...english.maskedTerms],
	errors: {},
	locale: locales[0].code,
	locales: locales.map(({ code, name }) => ({ code, name })),
	patreon: config.patreon === true,
	readAsset,
};

setSiteValues(buildValues);
