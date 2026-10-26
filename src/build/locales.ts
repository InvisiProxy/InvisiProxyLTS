import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { config } from '../config.ts';
import { projectDir } from '../constants.ts';
import { type Messages, type SiteValues, siteOrigin } from '../site.ts';

export const defaultLocale = 'en';
export const localesDir = join(projectDir, 'locales');

export interface Locale {
	code: string;
	name: string;
	countries: string[];
	maskedTerms: string[];
	messages: Messages;
}

export interface LocaleManifest {
	default: string;
	locales: Record<string, { countries: string[] }>;
}

function checkMessages(messages: unknown, file: string, prefix = ''): void {
	if (!messages || typeof messages !== 'object' || Array.isArray(messages))
		throw new Error(`${file}: "${prefix}" must be a group of messages`);
	for (const [key, value] of Object.entries(messages)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value !== 'string') checkMessages(value, file, path);
	}
}

const stringList = (value: unknown, file: string, field: string) => {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
		throw new Error(`${file}: language.${field} must be a list of text`);
	return value as string[];
};

const localeCode = (name: string) => name.toLowerCase().replace(/_/g, '-');

export function readLocale(file: string): Locale {
	const code = localeCode(file.replace(/\.ya?ml$/, ''));
	const { language = {}, ...messages } =
		parse(readFileSync(join(localesDir, file), 'utf8')) || {};
	if (typeof language.name !== 'string')
		throw new Error(`${file}: language.name is required`);
	checkMessages(messages, file);
	return {
		code,
		name: language.name,
		countries: stringList(language.countries, file, 'countries').map(
			(country) => country.toUpperCase()
		),
		maskedTerms: stringList(language.maskedTerms, file, 'maskedTerms'),
		messages,
	};
}

// The default locale comes first; the rest follow in file order.
export function loadLocales(): Locale[] {
	const locales = readdirSync(localesDir)
		.filter((file) => /\.ya?ml$/.test(file))
		.sort()
		.map(readLocale);
	const index = locales.findIndex(({ code }) => code === defaultLocale);
	if (index < 0) throw new Error(`Missing locales/${defaultLocale}.yaml`);
	return [locales[index], ...locales.filter((_, other) => other !== index)];
}

// The locales the build renders, the first one at the normal paths. With
// singleLanguage on, only the specified language is built and every visitor gets it.
export function builtLocales(
	locales: Locale[],
	settings: { singleLanguage?: boolean; language?: string } = config
): Locale[] {
	if (!settings.singleLanguage) return locales;
	const code = localeCode(settings.language || defaultLocale);
	const locale = locales.find((other) => other.code === code);
	if (!locale)
		throw new Error(
			`config.json: language "${code}" needs locales/${code}.yaml`
		);
	return [locale];
}

export const localePath = (code: string, path: string, root = defaultLocale) =>
	code === root ? path : `locales/${code}/${path}`;

export const stripLocale = (path: string) =>
	path.replace(/^locales\/[^/]+\//, '');

// `english` is passed separately since singleLanguage can sometimes have it unbuilt.
export function withLocale(
	values: SiteValues,
	locales: Locale[],
	locale: Locale,
	english: Locale
): SiteValues {
	return {
		...values,
		locale: locale.code,
		locales: locales.map(({ code, name }) => ({ code, name })),
		messages: locale.messages,
		fallbackMessages: english.messages,
		// English terms are masked everywhere by default
		maskedTerms: [
			...new Set([...english.maskedTerms, ...locale.maskedTerms]),
		],
	};
}

export function localizeSitemap(xml: string, codes: string[]): string {
	if (codes.length < 2) return xml;
	const translatedUrl = (loc: string, code: string) => {
		if (code === codes[0]) return loc;
		const url = new URL(loc);
		url.pathname = `/${code}${url.pathname}`;
		return url.href;
	};
	return xml
		.replace(
			'<urlset',
			'<urlset\n    xmlns:xhtml="http://www.w3.org/1999/xhtml"'
		)
		.replace(/<url>([\s\S]*?)<\/url>/g, (entry, body: string) => {
			const loc = /<loc>([^<]+)<\/loc>/.exec(body)?.[1];
			if (!loc?.startsWith(`${siteOrigin}/`)) return entry;
			const links = [
				...codes.map((code) => [code, translatedUrl(loc, code)]),
				['x-default', loc],
			]
				.map(
					([hreflang, href]) =>
						`\n        <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`
				)
				.join('');
			return codes
				.map(
					(code) =>
						`<url>${body
							.replace(loc, translatedUrl(loc, code))
							.replace(/\s*$/, `${links}\n    `)}</url>`
				)
				.join('\n    ');
		});
}

export function localeManifest(locales: Locale[]): LocaleManifest {
	return {
		default: locales[0].code,
		locales: Object.fromEntries(
			locales.map(({ code, countries }) => [code, { countries }])
		),
	};
}
