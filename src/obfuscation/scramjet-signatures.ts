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
		};
	const state = obfuscationState();
	if (
		!state.scramjet?.controller ||
		memberNames.some((name) => !state.scramjet?.members[name])
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
		};
		saveObfuscationState(state);
	}
	return state.scramjet;
}

const realCacheKeys = (source: string) =>
	source.replaceAll(
		/"https:\/\/sj-cache\.invalid\/"\s*\+\s*encodeURIComponent\((\w+)\)/g,
		'$1'
	);

const capitalize = (token: string) => token[0].toUpperCase() + token.slice(1);

export function scrubScramjetSignatures(source: string): string {
	if (config.usingSEO) return source;
	const { core, scram, wrapper, controller, utils, members } =
		scramjetTokens();
	// Exported class/constant names (ScramjetClient, SCRAMJETCLIENT, ...) are
	// looked up by key across bundles, so every casing maps to the same token.
	let output = realCacheKeys(source)
		.replaceAll('scramjet-injected', `${scram}-injected`)
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
	const { core, scram } = scramjetTokens();
	// Replace all scramjet identifiers in the WASM's embedded strings.
	// `$scramjet` is 9 chars; `$<core>` is also 9 chars (8-char token).
	// Same length = all wasm byte offsets stay valid.
	const text = toLatin1(source)
		.replaceAll('$scramjet', `$${core}`)
		.replaceAll('scramjet', core)
		.replaceAll('$scram', `$${scram}`)
		.replaceAll('scram', scram);
	const patched = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) patched[i] = text.charCodeAt(i);
	return patched;
}
