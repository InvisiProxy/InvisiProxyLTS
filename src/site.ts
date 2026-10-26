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
	proxyCodecKey: string;
	honeypot: HoneypotForm;
	cloakTypes: Record<'none' | 'blank' | 'blob', string>;
	storageNamespace: string;
	labels: Record<string, string>;
	defaultSearch: string;
	splash: string[];
	keywordText: string[];
	keywordFacts: string[];
	factAttribute: string;
	characters: string[];
	maskedTerms: string[];
	errors: Record<
		string,
		{
			beforeScript: string;
			afterScript: string;
			ids?: Record<string, string>;
		}
	>;
	locale: string;
	locales: { code: string; name: string }[];
	patreon: boolean;
	pageNames?: string[];
	messages?: Messages;
	fallbackMessages?: Messages;
	readAsset?: (path: string) => string | undefined;
}

export interface HoneypotField {
	id: string;
	name: string;
	type: string;
	placeholder: string;
	autocomplete: string;
	label: string;
}
export interface HoneypotForm {
	formId: string;
	fields: HoneypotField[];
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
	const endPoint = /((?<![^/])(?:github|api)\/)?[^/]+$/;
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
	{ name: 'ChatGPT', url: 'https://chatgpt.com' },
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

export interface AppPreset {
	name: string;
	url: string;
	icon?: string;
}

const favicon = (domain: string) =>
	`https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export const appLibrary = Object.freeze<{ id: string; apps: AppPreset[] }[]>([
	{
		id: 'social',
		apps: [
			{ name: 'Twitter', url: 'https://x.com' },
			{ name: 'Instagram', url: 'https://www.instagram.com' },
			{ name: 'Facebook', url: 'https://www.facebook.com' },
			{ name: 'Reddit', url: 'https://www.reddit.com' },
			{ name: 'TikTok', url: 'https://www.tiktok.com' },
			{ name: 'Snapchat', url: 'https://web.snapchat.com', icon: favicon('snapchat.com') },
			{ name: 'Threads', url: 'https://www.threads.com' },
			{ name: 'Bluesky', url: 'https://bsky.app' },
			{ name: 'Pinterest', url: 'https://www.pinterest.com' },
		],
	},
	{
		id: 'chat',
		apps: [
			{ name: 'Discord', url: 'https://discord.com/app' },
			{ name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: 'https://github.com/WhatsApp.png' },
			{ name: 'Telegram', url: 'https://web.telegram.org', icon: favicon('telegram.org') },
			{ name: 'Slack', url: 'https://app.slack.com', icon: favicon('slack.com') },
		],
	},
	{
		id: 'video',
		apps: [
			{
				name: 'YouTube',
				url: 'https://youtube.com',
				icon: 'https://www.youtube.com/img/favicon_144.png',
			},
			{ name: 'Twitch', url: 'https://www.twitch.tv' },
			{ name: 'Animetsu', url: 'https://animetsu.site' },
		],
	},
	{
		id: 'music',
		apps: [
			{ name: 'Spotify', url: 'https://open.spotify.com', icon: favicon('spotify.com') },
			{ name: 'Apple Music', url: 'https://music.apple.com' },
			{ name: 'YouTube Music', url: 'https://music.youtube.com' },
			{ name: 'SoundCloud', url: 'https://soundcloud.com' },
			{ name: 'Tidal', url: 'https://listen.tidal.com', icon: favicon('tidal.com') },
			{ name: 'Bandcamp', url: 'https://bandcamp.com' },
		],
	},
	{
		id: 'games',
		apps: [
			{ name: 'GeForce NOW', url: 'https://play.geforcenow.com' },
			{ name: 'Xbox Cloud Gaming', url: 'https://www.xbox.com/play' },
			{ name: 'Chess.com', url: 'https://www.chess.com' },
			{ name: 'GeoGuessr', url: 'https://www.geoguessr.com' },
			{ name: 'Wordle', url: 'https://www.nytimes.com/games/wordle/index.html' },
			{ name: 'Cool Math Games', url: 'https://www.coolmathgames.com' },
			{ name: 'Newgrounds', url: 'https://www.newgrounds.com' },
			{ name: 'Armor Games', url: 'https://armorgames.com' },
			{ name: 'itch.io', url: 'https://itch.io', icon: 'https://static.itch.io/images/app-icon.png' },
			{ name: 'Neal.fun', url: 'https://neal.fun' },
			{ name: 'Skribbl.io', url: 'https://skribbl.io' },
			{ name: 'Gartic Phone', url: 'https://garticphone.com' },
			{ name: 'Krunker', url: 'https://krunker.io' },
			{ name: 'Shell Shockers', url: 'https://shellshock.io', icon: 'https://shellshock.io/favicon192.png' },
			{ name: 'Slither.io', url: 'https://slither.io' },
			{ name: 'Agar.io', url: 'https://agar.io' },
			{ name: 'TypeRacer', url: 'https://play.typeracer.com', icon: 'https://data.typeracer.com/public/images/tr_logo_200.cache.png' },
			{ name: 'Scratch', url: 'https://scratch.mit.edu' },
			{ name: 'GBA Games', url: 'https://gba.js.org' },
		],
	},
	{
		id: 'ai',
		apps: [
			{ name: 'ChatGPT', url: 'https://chatgpt.com' },
			{ name: 'Gemini', url: 'https://gemini.google.com/app' },
			{ name: 'Claude', url: 'https://claude.ai' },
			{ name: 'Copilot', url: 'https://copilot.microsoft.com' },
			{ name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: favicon('deepseek.com') },
			{ name: 'DeepAI', url: 'https://deepai.org' },
		],
	},
	{
		id: 'education',
		apps: [
			{ name: 'Khan Academy', url: 'https://www.khanacademy.org' },
			{ name: 'Quizlet', url: 'https://quizlet.com' },
			{ name: 'Blooket', url: 'https://www.blooket.com' },
			{ name: 'Gimkit', url: 'https://www.gimkit.com', icon: 'https://github.com/gimkit.png' },
			{ name: 'Desmos', url: 'https://www.desmos.com/calculator' },
			{ name: 'GeoGebra', url: 'https://www.geogebra.org' },
			{ name: 'Wolfram Alpha', url: 'https://www.wolframalpha.com' },
			{ name: 'Wikipedia', url: 'https://en.wikipedia.org' },
			{ name: 'Google Scholar', url: 'https://scholar.google.com' },
			{ name: 'Coursera', url: 'https://www.coursera.org' },
			{ name: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu' },
			{ name: 'SparkNotes', url: 'https://www.sparknotes.com' },
			{ name: 'Grammarly', url: 'https://www.grammarly.com' },
			{ name: 'Merriam-Webster', url: 'https://www.merriam-webster.com' },
		],
	},
	{
		id: 'opensource',
		apps: [
			{ name: 'DeepL', url: 'https://www.deepl.com/translator' },
			{ name: 'Photopea', url: 'https://www.photopea.com' },
			{ name: 'Pixlr', url: 'https://pixlr.com' },
			{ name: 'remove.bg', url: 'https://www.remove.bg' },
			{ name: 'Speedtest', url: 'https://www.speedtest.net' },
			{ name: 'FMHY', url: 'https://fmhy.net' },
			{ name: 'Invidious', url: 'https://docs.invidious.io/instances' },
			{ name: 'Piped', url: 'https://piped.video' },
			{ name: 'PeerTube', url: 'https://joinpeertube.org' },
			{ name: 'Mastodon', url: 'https://mastodon.social' },
			{ name: 'Element', url: 'https://app.element.io', icon: favicon('element.io') },
			{ name: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
			{ name: 'Stellarium Web', url: 'https://stellarium-web.org', icon: 'https://github.com/Stellarium.png' },
			{ name: 'Lichess', url: 'https://lichess.org' },
			{ name: 'Monkeytype', url: 'https://monkeytype.com' },
			{ name: 'Excalidraw', url: 'https://excalidraw.com' },
			{ name: 'tldraw', url: 'https://www.tldraw.com' },
			{ name: 'draw.io', url: 'https://app.diagrams.net', icon: favicon('diagrams.net') },
			{ name: 'Squoosh', url: 'https://squoosh.app' },
			{ name: 'Wavacity', url: 'https://wavacity.com' },
			{ name: 'CyberChef', url: 'https://gchq.github.io/CyberChef/', icon: 'https://raw.githubusercontent.com/gchq/CyberChef/master/src/web/static/images/cyberchef-128x128.png' },
			{ name: 'CryptPad', url: 'https://cryptpad.fr' },
			{ name: 'LibreTranslate', url: 'https://libretranslate.com' },
			{ name: 'Open Library', url: 'https://openlibrary.org' },
			{ name: 'Project Gutenberg', url: 'https://www.gutenberg.org', icon: 'https://www.gutenberg.org/apple-touch-icon.png' },
			{ name: 'Compiler Explorer', url: 'https://godbolt.org' },
			{ name: 'Hoppscotch', url: 'https://hoppscotch.io' },
			{ name: 'Codeberg', url: 'https://codeberg.org', icon: 'https://codeberg.org/assets/img/logo.png' },
			{ name: 'GitLab', url: 'https://gitlab.com' },
			{ name: 'Godot Editor', url: 'https://editor.godotengine.org/releases/latest/', icon: favicon('godotengine.org') },
		],
	},
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

export const appPresets: readonly AppPreset[] = (() => {
	const presets = new Map<string, AppPreset>();
	for (const app of [
		...sites,
		...appLibrary.flatMap((category) => category.apps),
		...partners,
	])
		if (!presets.get(app.url)?.icon) presets.set(app.url, app);
	return Object.freeze([...presets.values()]);
})();

export const appIcon = (app: AppPreset) =>
	app.icon ?? favicon(new URL(app.url).hostname);

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
				name: 'b4kt',
				contributions: 'The Freedom Project (Former Hard Fork), Scramjet-Utils Plugin (Search Guard), Hidden History',
				url: 'https://discord.gg/jMm65ktMCz',
				contact: '@b4kt',
			},
			{
				name: 'MUATEX',
				contributions: 'Designer for Logo/Branding',
				url: 'https://www.muatex.com',
				contact: '@muatex',
			},
			{
				name: 'Toast',
				contributions: 'Scramjet-Utils Plugin (Custom Error Page)',
				url: 'https://github.com/havi11368',
				contact: '@havi11368',
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
