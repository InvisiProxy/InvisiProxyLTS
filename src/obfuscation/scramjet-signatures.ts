import { config } from '../config.ts';
import { obfuscationState, saveObfuscationState } from './state.ts';

const memberNames = [
	'cookieJar',
	'serviceWorkerController',
	'cookieSyncChannel',
	'createFrame',
	'setTransport',
	'ManagedPlugin',
	'HttpCachePlugin',
	'UrlWatcherPlugin',
	'CatchEscapedLinksPlugin',
	'LinkHandlerPlugin',
	'EventHandlerPlugin',
	'guardServiceWorkerRevive',
	'cookieSyncDirty',
	'cookieSyncPromise',
	'cookieUpdatedAt',
	'BareResponse',
	'invisiParticles',
	// The public API on the core global, which every proxied page can list.
	'unrewriteLinkHeader',
	'unrewriteUrl',
	'unrewriteHtml',
	'unrewriteCss',
	'unrewriteBlob',
	'rewriteUrl',
	'rewriteHtml',
	'rewriteCss',
	'rewriteJs',
	'rewriteSrcset',
	'rewriteBlob',
	'rewriteWorkers',
	'createLocationProxy',
	'IncrementalHtmlRewriter',
	'getRewriter',
	'CookieJar',
	'htmlRules',
	'setWasm',
	'defaultConfig',
	'flagEnabled',
];

// Exact strings proxied pages can see: rewriter globals on window, element
// attributes, storage, channel and header names, symbol descriptions and
// message types. Each gets its own random name so none share a token or word.
const literalNames = [
	'$scramjet$wrap',
	'$scramjet$wrappostmessage',
	'$scramjet__',
	'$scramjet$prop',
	'$scramjet$clean',
	'$scramjet$import',
	'$scramjet$rewrite',
	'$scramjet$meta',
	'$scramjet$pushsourcemap',
	'$scramjet$tryset',
	'$scramjet$temploc',
	'$scramjet$tempunused',
	'$scramjet$messagetype',
	'$scramjet$origin',
	'$scramjet$data',
	'$scramdbg',
	'scramjet-attr',
	'scramjet-attr-script-source-src',
	'scramjet-injected',
	'__scramjet_controller',
	'__scramjet_controller_channel',
	'scramjet-http-cache',
	'scramjet-http-cache-v2',
	'x-sj-cached-at',
	'scramjet realm pollutant',
	'scramjet original onevent function',
	'scramjet client global',
	'invisiLeakGuard',
	'invisiSearchUrlGuard',
	'invisiNavigationEntry',
	'$controller$init',
	'$controller$setCookie',
	'$controller$swrevive',
	'$sw$setCookieDone',
	'$sw$initRemoteTransport',
];
// Also built into the WASM rewriter, where a name has to keep its length.
const wasmNames = [
	'$scramjet$setrealmfn',
	'$scramitize',
	'$scramerr',
	'rewriter',
];

export interface ScramjetTokens {
	core: string;
	scram: string;
	wrapper: string;
	// Separate tokens so the globals don't form the telltale
	// `$x`, `$xController`, `$xUtils` trio.
	controller: string;
	utils: string;
	members: Record<string, string>;
	names: Record<string, string>;
}

function identifier(length: number) {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	return Array.from(
		crypto.getRandomValues(new Uint8Array(length)),
		(byte, index) =>
			(index ? alphabet : alphabet.slice(0, 26))[byte % (index ? 36 : 26)]
	).join('');
}

export function scramjetTokens(): ScramjetTokens {
	if (config.usingSEO)
		return {
			core: 'scramjet',
			scram: 'scram',
			wrapper: 'invisiScramjet',
			controller: 'scramjetController',
			utils: 'scramjetUtils',
			members: {},
			names: {},
		};
	const state = obfuscationState();
	if (
		!state.scramjet?.controller ||
		memberNames.some((name) => !state.scramjet?.members[name]) ||
		[...literalNames, ...wasmNames].some(
			(name) => !state.scramjet?.names?.[name]
		)
	) {
		state.scramjet = {
			core: identifier(8),
			scram: identifier(5),
			wrapper: identifier(8),
			controller: identifier(8),
			utils: identifier(8),
			members: Object.fromEntries(
				memberNames.map((name) => [name, identifier(6)])
			),
			names: randomNames(),
		};
		saveObfuscationState(state);
	}
	return state.scramjet;
}

function randomNames() {
	const names: Record<string, string> = Object.fromEntries(
		literalNames.map((name) => [name, identifier(8)])
	);
	// Kept under the attribute prefix, which Scramjet uses to hide its own
	// attributes from pages.
	names['scramjet-attr-script-source-src'] =
		`${names['scramjet-attr']}-${identifier(6)}`;
	for (const name of wasmNames) {
		const sigil = name.startsWith('$') ? '$' : '';
		names[name] = sigil + identifier(name.length - sigil.length);
	}
	return names;
}

// Longest first, so a name is never cut short by one it starts with.
const byLength = (names: Record<string, string>) =>
	Object.entries(names).sort(([a], [b]) => b.length - a.length);

const realCacheKeys = (source: string) =>
	source.replaceAll(
		/"https:\/\/sj-cache\.invalid\/"\s*\+\s*encodeURIComponent\((\w+)\)/g,
		'$1'
	);

const capitalize = (token: string) => token[0].toUpperCase() + token.slice(1);

export function scrubScramjetSignatures(source: string): string {
	if (config.usingSEO) return source;
	const { core, scram, wrapper, controller, utils, members, names } =
		scramjetTokens();
	let output = realCacheKeys(source);
	for (const [name, token] of byLength(names))
		output = output.replaceAll(name, token);
	// Exported class/constant names (ScramjetClient, SCRAMJETCLIENT, ...) are
	// looked up by key across bundles, so every casing maps to the same token.
	output = output
		.replaceAll('$invisiScramjet', `$${wrapper}`)
		.replaceAll('$scramjetController', `$${controller}`)
		.replaceAll('$scramjetUtils', `$${utils}`)
		.replaceAll('$scramjet', `$${core}`)
		.replaceAll('scramjet', core)
		.replaceAll('Scramjet', capitalize(core))
		.replaceAll('SCRAMJET', core.toUpperCase())
		.replaceAll('$scram', `$${scram}`)
		.replaceAll('scram', scram)
		.replaceAll(/mercury-?workshop/gi, wrapper);
	for (const [name, token] of Object.entries(members))
		output = output.replaceAll(name, token);
	return output;
}

const toLatin1 = (bytes: Uint8Array) => {
	let text = '';
	for (let i = 0; i < bytes.length; i += 8192)
		text += String.fromCharCode(...bytes.subarray(i, i + 8192));
	return text;
};

export function scrubScramjetWasm(source: Uint8Array): Uint8Array {
	if (config.usingSEO) return source;
	const { core, scram, names } = scramjetTokens();
	// Replace all scramjet identifiers in the WASM's embedded strings.
	// `$scramjet` is 9 chars; `$<core>` is also 9 chars (8-char token).
	// Same length = all wasm byte offsets stay valid.
	let text = toLatin1(source);
	for (const name of wasmNames) text = text.replaceAll(name, names[name]);
	text = text
		.replaceAll('$scramjet', `$${core}`)
		.replaceAll('scramjet', core)
		.replaceAll('$scram', `$${scram}`)
		.replaceAll('scram', scram);
	const patched = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) patched[i] = text.charCodeAt(i);
	return patched;
}
