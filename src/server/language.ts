import { existsSync, readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import type { LocaleManifest } from '../build/locales.ts';
import { config } from '../config.ts';
import { localesFile, siteUrl } from '../constants.ts';

export interface Languages {
	default: string;
	codes: string[];
	countries: Record<string, string>;
}

// Written by the build from src/locales (see src/build/locales.ts).
export function loadLanguages(): Languages {
	const file = new URL(localesFile, siteUrl);
	if (!existsSync(file))
		return { default: 'en', codes: ['en'], countries: {} };
	const manifest: LocaleManifest = JSON.parse(readFileSync(file, 'utf8'));
	const countries: Record<string, string> = {};
	for (const [code, { countries: list }] of Object.entries(manifest.locales))
		for (const country of list) countries[country] ??= code;
	return {
		default: manifest.default,
		codes: Object.keys(manifest.locales),
		countries,
	};
}

function readCookie(header: string | undefined, name: string) {
	for (const cookie of (header || '').split(/;\s*/))
		if (cookie.startsWith(`${name}=`))
			try {
				return decodeURIComponent(cookie.slice(name.length + 1));
			} catch {
				return;
			}
}

// Returns the language tags from an Accept-Language header, most preferred
// first, e.g. "fr-CA,fr;q=0.9,en;q=0.8" gives ["fr-ca", "fr", "en"].
export function acceptedLanguages(header: string | undefined) {
	return (header || '')
		.split(',')
		.map((part, index) => {
			const [tag, ...params] = part.trim().toLowerCase().split(';');
			const q = params.find((param) => param.trim().startsWith('q='));
			return { tag, index, q: q ? Number(q.trim().slice(2)) : 1 };
		})
		.filter(({ tag, q }) => tag && tag !== '*' && q > 0)
		.sort((a, b) => b.q - a.q || a.index - b.index)
		.map(({ tag }) => tag);
}

const codeLocales = new Map<string, Intl.Locale | undefined>();

function likelySubtags(tag: string) {
	try {
		return new Intl.Locale(tag).maximize();
	} catch {
		return;
	}
}

function closestCode(tag: string, codes: string[]) {
	const wanted = likelySubtags(tag);
	if (!wanted) return;
	let closest: string | undefined;
	for (const code of codes) {
		if (!codeLocales.has(code)) codeLocales.set(code, likelySubtags(code));
		const locale = codeLocales.get(code);
		if (
			locale?.language !== wanted.language ||
			locale.script !== wanted.script
		)
			continue;
		if (locale.region === wanted.region) return code;
		closest ??= code;
	}
	return closest;
}

export function pickLanguage(
	req: IncomingMessage,
	languages: Languages,
	useCountry = config.geoLanguage
) {
	const { codes } = languages;
	const chosen = readCookie(req.headers.cookie, 'Language')?.toLowerCase();
	if (chosen && codes.includes(chosen)) return chosen;

	const country = req.headers['cf-ipcountry'];
	if (useCountry && typeof country === 'string') {
		const code = languages.countries[country.toUpperCase()];
		if (code) return code;
	}

	for (const tag of acceptedLanguages(req.headers['accept-language'])) {
		if (codes.includes(tag)) return tag;
		const closest = closestCode(tag, codes);
		if (closest) return closest;
	}

	return languages.default;
}
