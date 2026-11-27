import { config } from '../config.ts';
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
	if (config.usingSEO) return {};
	const state = obfuscationState();
	if (!state.settings) {
		state.settings = generatedNames(
			[...settingKeys, ...storageKeyParts],
			'settings'
		);
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

// Swaps the quoted settings key literals in bundled site scripts.
export function scrubSettingKeys(source: string): string {
	if (config.usingSEO) return source;
	const tokens = settingTokens();
	for (const key of settingKeys)
		source = source
			.replaceAll(`'${key}'`, `'${tokens[key]}'`)
			.replaceAll(`"${key}"`, `"${tokens[key]}"`);
	return source;
}

// Swaps the `-<part>` storage name suffixes wherever a key is assembled.
export function scrubStorageKeys(source: string): string {
	if (config.usingSEO) return source;
	const tokens = settingTokens();
	for (const part of storageKeyParts)
		source = source.replaceAll(`-${part}`, `-${tokens[part]}`);
	return source;
}
