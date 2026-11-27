import { config } from '../config.ts';
import { isDevelopment } from '../constants.ts';
import {
	generatedNames,
	obfuscationState,
	saveObfuscationState,
} from './state.ts';

// Every settings key and cookie name shared across the browser (the
// localStorage settings JSON and cookies) and the server (cookie reads in
// handler.ts and language.ts). Each is a quoted literal at every use site,
// so all of them are swapped for per-build random names before the site
// scripts are obfuscated; the server resolves the same names from the
// saved obfuscation state, which keeps both sides consistent.
const settingKeys = [
	'AutoSiteFixes',
	'BlockPopups',
	'BlockWebRTC',
	'BrowsingPreferencesOpen',
	'BrowsingSectionOpen',
	'CustomWisp',
	'ErudaEnabled',
	'ExperimentalSiteFixes',
	'HideAds',
	'HistoryHide',
	'HideRestartPrompt',
	'Icon',
	'Language',
	'LaunchType',
	'ProxyVersion',
	'RandomizeFingerprint',
	'Sandbox',
	'SearchEngine',
	'SearchNavFix',
	'Theme',
	'Title',
	'Transport',
	'UseAC',
	'UseSocks5',
	'UserAgent',
	// Stored values that identify the transport and the wisp region: the
	// client picks the transport module and the wisp path suffix with the
	// token too, and the server maps the token back to the real region.
	'epoxy',
	'eu',
	'jp',
	'libcurl',
	'patreon',
	'tor',
];

// localStorage and CacheStorage entries assembled as
// `<storageNamespace>-<part>` live outside the settings JSON; the part is
// the only constant in the name, so the part suffix gets a random name.
// Applied to bundled scripts (after class rewriting, so parts that appear
// inside class names like `app-tabs` are never touched) and to the HTML
// rendered at build time, for the inline loader script.
const storageKeyParts = [
	'app-icon',
	'bookmarks',
	'frame-url',
	'icon-cache',
	'loader-key',
	'open-url',
	'tabs',
];

export function settingTokens(): Record<string, string> {
	// Development serves unobfuscated scripts, so the plain names stay in
	// sync with everything the dev client sends; SEO builds keep them too.
	if (config.usingSEO || isDevelopment()) return {};
	const state = obfuscationState();
	// Extends an existing mapping instead of regenerating it, so settings
	// keys keep their names across builds (users keep their settings) and
	// words added to the lists get tokens on the next build.
	const wanted = [...settingKeys, ...storageKeyParts];
	const missing = wanted.filter((key) => !state.settings?.[key]);
	if (!state.settings || missing.length) {
		state.settings = {
			...state.settings,
			...generatedNames(missing, 'settings'),
		};
		saveObfuscationState(state);
	}
	return state.settings;
}

// Server-side name lookup matching what the client bundle baked in, e.g.
// for cookie reads. Always also try the plain name at read sites: the
// development build ships unsanitized, and an older state file should not
// break existing cookies.
export function settingKey(key: string): string {
	return settingTokens()[key] || key;
}

// Swaps the quoted settings key literals in bundled site scripts. Runs on
// the bundler output before the minifier (renderChunk) and again at
// generateBundle; the minified output may carry \x-escaped copies, so the
// escaped spellings are matched too.
export function scrubSettingKeys(source: string): string {
	if (config.usingSEO) return source;
	const tokens = settingTokens();
	for (const key of settingKeys) {
		const token = tokens[key];
		if (!token) continue;
		source = source
			.replaceAll(`'${key}'`, `'${token}'`)
			.replaceAll(`"${key}"`, `"${token}"`)
			.replaceAll(
				new RegExp(
					`(["'])${escapeSpelling(key)}\\1`,
					'g'
				),
				`'${token}'`
			);
	}
	return source;
}

// Matches a word spelled with any per-character mix of plain letters, \xNN
// and \u00NN escapes, as the minifier emits inside quoted strings.
function escapeSpelling(word: string): string {
	const plain = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return word
		.split('')
		.map((ch) => {
			const hex = ch.charCodeAt(0).toString(16).padStart(2, '0');
			// Hex escapes decode case-insensitively, so an a-f digit can be
			// spelled with either case; the other nibble stays literal.
			const lo = /[a-f]/.test(hex[1])
				? `[${hex[1]}${hex[1].toUpperCase()}]`
				: hex[1];
			return `(?:${plain(ch)}|\\x${hex[0]}${lo}|\\u00${hex[0]}${lo})`;
		})
		.join('');
}

// Swaps the `-<part>` storage name suffixes wherever a key is assembled.
export function scrubStorageKeys(source: string): string {
	if (config.usingSEO) return source;
	const tokens = settingTokens();
	for (const part of storageKeyParts)
		source = source.replaceAll(`-${part}`, `-${tokens[part]}`);
	return source;
}
