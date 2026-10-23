export interface SiteValues {
	development?: boolean;
	usingSEO: boolean;
	showSplash: boolean;
	disguiseFiles: boolean;
	inlineAssets: boolean;
	basePath: string;
	aliases: Record<string, string>;
	cacheBust: Record<string, string>;
	version: string;
	cacheKey: number;
	storageNamespace: string;
	labels: Record<string, string>;
	defaultSearch: string;
	splash: string[];
	keywordText: string[];
	keywordFacts: string[];
	characters: string[];
	maskedTerms: string[];
	errors: Record<string, { beforeScript: string; afterScript: string }>;
	locale: string;
	locales: { code: string; name: string }[];
	pageNames?: string[];
	messages?: Messages;
	fallbackMessages?: Messages;
	readAsset?: (path: string) => string | undefined;
}

export type Messages = { [key: string]: string | Messages };
export type MessageParams = Record<string, string | number>;

function lookup(messages: Messages | undefined, key: string) {
	let node: string | Messages | undefined = messages;
	for (const part of key.split('.'))
		node = typeof node === 'object' ? node[part] : undefined;
	return typeof node === 'string' ? node : undefined;
}

export function translate(key: string, params: MessageParams = {}): string {
	const message =
		lookup(values.messages, key) ?? lookup(values.fallbackMessages, key);
	if (message === undefined)
		throw new Error(`Missing translation for "${key}"`);
	return message.replace(/\{(\w+)\}/g, (match, name: string) =>
		Object.hasOwn(params, name) ? String(params[name]) : match
	);
}

export let values: SiteValues;
export function setSiteValues(next: SiteValues) {
	values = next;
}
export function randomItem<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

// In SEO mode every language but the default lives under /<code>/ so search
// engines can index each one; otherwise all languages share the same URLs.
export const siteOrigin = 'https://invisiproxy.com';

export function localePrefix(code = values.locale) {
	return values.usingSEO && code !== values.locales[0]?.code
		? `${code}/`
		: '';
}

// Public URL of a page (a route name such as 'questions') in a language.
export const pageUrl = (name: string, code = values.locale) =>
	`${siteOrigin}/${localePrefix(code)}${name}`;

// e.g. 'fr' gives 'fr-FR' and 'pt-br' gives 'pt-BR'.
export function languageTag(code: string) {
	const { language, region } = new Intl.Locale(code).maximize();
	return region ? `${language}-${region}` : language;
}

export function route(path: string, conditional?: 'inline'): string {
	const endPoint = /((?<![^/])github\/)?[^/]+$/;
	const page = /^\/?([^/.]*)$/.exec(path);
	const base =
		page && values.pageNames?.includes(page[1])
			? values.basePath + localePrefix()
			: values.basePath;
	if (conditional === 'inline' && values.inlineAssets)
		return path.replace(
			endPoint,
			(name) =>
				values.cacheBust[name] ||
				values.aliases[`files/${name}`] ||
				name
		);
	return path
		.replace(endPoint, (name, ancestor) =>
			ancestor
				? values.aliases[name] || name
				: values.aliases[`files/${name}`] ||
					values.cacheBust[name] ||
					values.aliases[name] ||
					name
		)
		.replace(
			/[^/]+(?=\/)/g,
			(part) =>
				values.aliases[`prefixes/${part}`] ||
				values.aliases[part] ||
				part
		)
		.replace(/^~?\/+|^~$|^(?!\.\/)/, base);
}
export function ifSEO(text: string) {
	return values.usingSEO ? text : '';
}
export function ifDisguise(text: string) {
	return values.disguiseFiles ? text : '';
}
export function renderProxyError(kind: 'scramjet', scriptUrl: string) {
	const parts = values.errors[kind];
	if (!parts) throw new Error(`Missing ${kind} error document`);
	const escaped = scriptUrl
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;');
	return parts.beforeScript + escaped + parts.afterScript;
}
export function inlineHtml(html: string): string {
	const readAsset = values.readAsset;
	if (!values.inlineAssets || !readAsset) return html;
	return html.replace(
		/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>|<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
		(
			element,
			scriptPath: string | undefined,
			stylePath: string | undefined
		) => {
			if (stylePath && !/\brel=["']stylesheet["']/i.test(element))
				return element;
			const path = scriptPath || stylePath;
			if (!path) return element;
			if (/^(?:https?:)?\/\//.test(path)) return element;
			const content = readAsset(path);
			if (content === undefined) return element;
			if (stylePath) return `<style>${content.trim()}</style>`;
			const attributes = element
				.slice('<script'.length, element.indexOf('>'))
				.replace(/\s*src=["'][^"']+["']/i, '');
			return `<script${attributes}>${content.trim().replace(/<\/script/gi, '<\\/script')}</script>`;
		}
	);
}

export const sites = Object.freeze([
	{ name: 'Discord', url: 'https://discord.com/app' },
	{ name: 'ChatGPT', url: 'https://chat.openai.com/chat' },
	{ name: 'Gemini', url: 'https://gemini.google.com/app' },
	{ name: 'Youtube', url: 'https://youtube.com', icon: 'https://www.youtube.com/img/favicon_144.png',},
	{ name: 'Invidious', url: 'https://docs.invidious.io/instances' },
	{ name: 'FMHY', url: 'https://fmhy.net' },
	{ name: 'GeForce NOW', url: 'https://play.geforcenow.com' },
	{ name: 'Twitter', url: 'https://twitter.com' },
	{ name: 'Instagram', url: 'https://www.instagram.com' },
	{ name: 'Reddit', url: 'https://www.reddit.com' },
	{ name: 'Twitch', url: 'https://www.twitch.tv' },
	{ name: 'TikTok', url: 'https://www.tiktok.com' },
	{ name: 'Animetsu', url: 'https://animetsu.site' },
	{ name: 'Spotify', url: 'https://open.spotify.com' },
]);

export const partners = Object.freeze([
	{ name: 'Obsidian', url: 'https://playobsidian.com', newtab: false },
	{ name: 'Night Network', url: 'https://night-network.org', newtab: false },
	{
		name: 'The Freedom Project',
		url: 'https://nullatenus.com',
		newtab: true,
	},
	{ name: 'Truffled', url: 'https://truffled.lol', newtab: false },
		{
		name: 'Titanium Network',
		url: 'https://titaniumnetwork.org',
		newtab: false,
	},
]);

interface CreditPerson {
	name: string;
	contributions?: string;
	url?: string;
	contact?: string;
}

interface CreditSection {
	id: string;
	people: CreditPerson[];
}

export const credits = Object.freeze<CreditSection[]>([
	{
		id: 'developers',
		people: [
			{
				name: 'Quite A Fancy Emerald',
				contributions: 'Creator and Owner',
				url: 'https://github.com/QuiteAFancyEmerald',
				contact: '@quiteafancyemerald',
			},
			{
				name: "YOCTDONALD'S",
				contributions: 'Co-Owner, Main Contributor, CTG',
				url: 'https://github.com/yoct1',
				contact: '@yoct',
			},
			{
				name: 'OlyB/BinBashBanana',
				contributions: 'Co-Owner, Main Contributor, CTG',
				url: 'https://github.com/BinBashBanana',
				contact: '@olyb / @binbashbanana',
			},
			{
				name: 'Sylvia',
				contributions:
					'Co-Owner, Main Contributor, SolidJS Rewrite, English to French',
				url: 'https://sylvieon.dev',
				contact: '@sylvieisnton',
			},
		],
	},
	{
		id: 'contributors',
		people: [
			{
				name: 'MUATEX',
				contributions: 'Designer for Logo/Branding',
				url: 'https://www.muatex.com',
				contact: '@muatex',
			},
			{
				name: 'Kinglalu',
				contributions: 'Games Page, Developer',
				url: 'https://github.com/kinglalu',
				contact: '@kinglalu',
			},
			{
				name: 'MotorTruck1221',
				contributions:
					'Massive Contributor, Fastify Rewrite, Mercury Workshop, Developer',
				url: 'https://github.com/MotorTruck1221',
				contact: '@motortruck1221',
			},
			{
				name: 'percs',
				contributions: 'Scramjet, Wisp, Mercury Workshop, Developer',
				url: 'https://github.com/percslol',
				contact: '@percslol',
			},
			{
				name: 'velzie',
				contributions: 'Scramjet, Mercury Workshop, Developer',
				url: 'https://github.com/velzie',
				contact: '@velzie',
			},
			{
				name: 'greiyn NOT H',
				contributions: 'Bug Hunter, Translations',
				contact: '@greiyn',
			},
			{
				name: 'b4kt',
				contributions: 'The Freedom Project (Former Hard Fork)',
				url: 'https://discord.gg/jMm65ktMCz',
				contact: '@b4kt',
			},
		],
	},
	{
		id: 'translators',
		people: [
			{
				name: 'Manjit',
				contributions: 'Italian Translation',
				url: 'https://manjit.dev',
				contact: '@manjit',
			},
			{
				name: 'aster',
				contributions: 'Japanese Translation',
				contact: '@asterf._.',
			},
		],
	},
	{
		id: 'shoutouts',
		people: [
			{
				name: 'Divide',
				contributions: 'Chatbox, Proxy/Web Developer',
			},
			{
				name: 'ProgrammerIn-wonderland',
				contributions: 'Mercury Workshop, Developer',
			},
			{
				name: 'MikeLime',
				contributions:
					'Old Co-Owner of TitaniumNetwork & Mass Proxy Site Maker, Web Developer, and Software Developer',
			},
			{
				name: 'SexyDuceDuce',
				contributions: 'Proxy and Web Developer',
			},
			{
				name: 'LQ16',
				contributions: 'Creator of TN, Retired',
			},
			{
				name: 'Shirt',
				contributions:
					'Old Co-Owner of TN, Everything Developer And King Of Pokemon',
			},
			{
				name: 'Soup',
				contact: 'Cat Lady hehe',
			},
			{
				name: 'aub',
				contributions: 'Owner of TitaniumNetwork',
			},
			{
				name: 'Binary Person',
				contact: 'pretty pog',
			},
			{
				name: 'Pillow',
				contributions: 'Hosting Contributor, Developer',
			},
			{
				name: 'Navyyy',
			},
			{
				name: 'luphoria',
				contributions: 'Mercury Workshop, Developer',
			},
			{
				name: 'trentwiles',
				contributions: 'Developer',
			},
			{
				name: 'Degen-dev',
				contributions: 'Developer',
			},
			{
				name: 'B3ATDROP3R',
			},
			{
				name: 'Catolan',
			},
			{
				name: 'Nautica',
				contact: 'Reinin',
			},
			{
				name: 'LinuxSperm',
				contributions: 'Contributor',
			},
			{
				name: 'BananaVeyLover',
				contributions: 'CTG, banananananaan',
			},
			{
				name: 'IronApple',
				contributions: 'CTG The Apple Addict',
			},
			{
				name: 'IStealYourMemes',
				contributions: 'CTG Forever the advisor',
			},
			{
				name: 'Tricksyz',
				contributions: 'CTGYeah LOL',
			},
			{
				name: 'Synaptic',
				contributions: 'Synaptic',
				contact: 'Synaptic',
			},
		],
	},
]);
