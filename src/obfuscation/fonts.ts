import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Root } from 'postcss';
import { config } from '../config.ts';
import { projectDir } from '../constants.ts';
import { type FontCipher, homoglyphs, letters } from '../site.ts';
import { obfuscationState, saveObfuscationState } from './state.ts';

const localFonts: [family: string, module: string, styles: string[]][] = [
	[
		'Figtree',
		'@fontsource-variable/figtree',
		['wght.css', 'wght-italic.css'],
	],
	[
		'Rethink Sans',
		'@fontsource-variable/rethink-sans',
		['wght.css', 'wght-italic.css'],
	],
	['Lato', '@fontsource/lato', ['400.css', '400-italic.css', '700.css']],
	['Montserrat Alternates', '@fontsource/montserrat-alternates', ['400.css']],
	[
		'Source Code Pro',
		'@fontsource-variable/source-code-pro',
		['wght.css', 'wght-italic.css'],
	],
];
const preloaded = ['Rethink Sans', 'Figtree'];
const iconDir = join(
	projectDir,
	'node_modules/@fortawesome/fontawesome-free/webfonts'
);
const iconFonts = [
	'fa-brands-400.woff2',
	'fa-regular-400.woff2',
	'fa-solid-900.woff2',
];
const iconFamilies = ['Font Awesome 5 Brands', 'Font Awesome 5 Free'];
const homoglyphRange = Object.values(homoglyphs)
	.map((glyph) => `U+${glyph.charCodeAt(0).toString(16)}`)
	.join(',');

interface FontFace {
	family: string;
	style: string;
	weight: string;
	range: string;
	source: string;
	name: string;
	letters: boolean;
}

function coversLetters(range: string) {
	if (!range) return true;
	const spans = range.split(',').map((part) =>
		part
			.trim()
			.replace(/^U\+/i, '')
			.split('-')
			.map((code) => Number.parseInt(code, 16))
	);
	return [...letters].every((letter) => {
		const code = letter.charCodeAt(0);
		return spans.some(
			([start, end = start]) => code >= start && code <= end
		);
	});
}

let faces: FontFace[] | undefined;

export function fontFaces(): FontFace[] {
	if (faces) return faces;
	faces = [];
	for (const [family, module, styles] of localFonts) {
		const dir = join(projectDir, 'node_modules', module);
		for (const file of styles)
			for (const [, body] of readFileSync(
				join(dir, file),
				'utf8'
			).matchAll(/@font-face\s*\{([^}]*)\}/g)) {
				const field = (name: string) =>
					new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1].trim() ??
					'';
				const source = /url\(\.\/(files\/[^)]+\.woff2)\)/.exec(
					body
				)?.[1];
				if (!source) continue;
				const range = field('unicode-range');
				faces.push({
					family,
					style: field('font-style'),
					weight: field('font-weight'),
					range,
					source: join(dir, source),
					name: basename(source),
					letters: coversLetters(range),
				});
			}
	}
	return faces;
}

const cipherName = (face: { name: string }) =>
	face.name.replace(/\.woff2$/, '-alt.woff2');

const fontSources = () => [
	...fontFaces(),
	...iconFonts.map((name) => ({
		name,
		source: join(iconDir, name),
		letters: false,
	})),
];

export const fontFileNames = () =>
	fontSources().flatMap((face) =>
		face.letters ? [face.name, cipherName(face)] : [face.name]
	);

function randomName(length: number) {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	return Array.from(
		crypto.getRandomValues(new Uint8Array(length)),
		(byte, i) => alphabet[byte % (i ? alphabet.length : 26)]
	).join('');
}

function shuffleCycle(text: string) {
	const shuffled = [...text];
	const random = crypto.getRandomValues(new Uint32Array(shuffled.length));
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = random[i] % i;
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled.join('');
}

const preloadedFonts = () =>
	fontFaces()
		.filter(
			(face) =>
				face.letters &&
				face.style === 'normal' &&
				preloaded.includes(face.family)
		)
		.map(cipherName);

export function fontCipher(): FontCipher {
	if (config.usingSEO)
		return {
			key: '',
			tag: '',
			property: '',
			families: {},
			icons: {},
			preload: [],
		};
	const state = obfuscationState();
	if (!state.fontCipher?.icons) {
		state.fontCipher = {
			key:
				shuffleCycle(letters.slice(0, 26)) +
				shuffleCycle(letters.slice(26)),
			tag: `${randomName(4)}-${randomName(5)}`,
			property: `--${randomName(7)}`,
			families: Object.fromEntries(
				localFonts.map(([family]) => [family, randomName(7)])
			),
			icons: Object.fromEntries(
				iconFamilies.map((family) => [family, randomName(7)])
			),
			preload: preloadedFonts(),
		};
		saveObfuscationState(state);
	}
	return state.fontCipher;
}

export function fontFaceRules() {
	const { families } = fontCipher();
	const rule = (
		face: FontFace,
		family: string,
		file: string,
		display: string
	) =>
		`@font-face{font-family:"${family}";font-style:${face.style};font-weight:${face.weight};font-display:${display};src:url("/assets/webfonts/${file}") format("woff2");unicode-range:${face.letters && !config.usingSEO ? `${face.range},${homoglyphRange}` : face.range || 'U+0-10FFFF'}}`;
	return [
		...fontFaces().filter((face) => !face.letters),
		...fontFaces().filter((face) => face.letters),
	]
		.flatMap((face) => {
			const cipher = families[face.family];
			const plain = rule(face, face.family, face.name, 'swap');
			if (!cipher) return [plain];
			return [
				plain,
				rule(
					face,
					cipher,
					face.letters ? cipherName(face) : face.name,
					'block'
				),
			];
		})
		.join('\n');
}

export function cipherWrapperRule() {
	const { tag, property } = fontCipher();
	return tag ? `${tag}{font-family:var(${property})}` : '';
}

export function cipherFontFamilies(root: Root) {
	const { families, icons, property } = fontCipher();
	if (!property) return;
	root.walkDecls('font-family', (declaration) => {
		declaration.value = declaration.value.replace(
			/(["'])(.*?)\1/g,
			(match, _quote, family) =>
				icons[family] ? `"${icons[family]}"` : match
		);
		const parent = declaration.parent;
		if (
			parent?.type === 'atrule' &&
			'name' in parent &&
			parent.name === 'font-face'
		)
			return;
		const [first, ...rest] = declaration.value.split(',');
		const cipher = families[first.trim().replace(/^(["'])(.*)\1$/, '$2')];
		if (cipher)
			declaration.cloneAfter({
				prop: property,
				value: [`"${cipher}"`, ...rest].join(','),
			});
	});
}

export function readCmap(font: Uint8Array) {
	const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
	const cmap = tableRecords(font).get('cmap');
	if (!cmap) throw new Error('Font has no cmap table');
	const map = new Map<number, number>();
	let variations: Uint8Array | undefined;
	for (let i = 0; i < view.getUint16(cmap.offset + 2); i++) {
		const record = cmap.offset + 4 + i * 8;
		const platform = view.getUint16(record);
		const encoding = view.getUint16(record + 2);
		const table = cmap.offset + view.getUint32(record + 4);
		const format = view.getUint16(table);
		if (format === 14) {
			variations = font.slice(table, table + view.getUint32(table + 2));
			continue;
		}
		if (platform !== 0 && !(platform === 3 && [1, 10].includes(encoding)))
			continue;
		if (format === 4) {
			const segments = view.getUint16(table + 6);
			const ends = table + 14;
			const starts = ends + segments + 2;
			const deltas = starts + segments;
			const offsets = deltas + segments;
			for (let s = 0; s < segments; s += 2) {
				const start = view.getUint16(starts + s);
				const end = view.getUint16(ends + s);
				const delta = view.getUint16(deltas + s);
				const offset = view.getUint16(offsets + s);
				for (let code = start; code <= end && code !== 0xffff; code++) {
					let glyph = code + delta;
					if (offset) {
						const indexed = view.getUint16(
							offsets + s + offset + 2 * (code - start)
						);
						glyph = indexed && indexed + delta;
					}
					glyph &= 0xffff;
					if (glyph) map.set(code, glyph);
				}
			}
		} else if (format === 12)
			for (let g = 0; g < view.getUint32(table + 12); g++) {
				const group = table + 16 + g * 12;
				const start = view.getUint32(group);
				const glyph = view.getUint32(group + 8);
				for (
					let code = start;
					code <= view.getUint32(group + 4);
					code++
				)
					map.set(code, glyph + code - start);
			}
	}
	return { map, variations };
}

function tableRecords(font: Uint8Array) {
	const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
	const tables = new Map<string, { offset: number; length: number }>();
	for (let i = 0; i < view.getUint16(4); i++) {
		const record = 12 + i * 16;
		tables.set(String.fromCharCode(...font.subarray(record, record + 4)), {
			offset: view.getUint32(record + 8),
			length: view.getUint32(record + 12),
		});
	}
	return tables;
}

function format4(entries: [number, number][]) {
	const segments: [start: number, end: number, delta: number][] = [];
	for (const [code, glyph] of entries) {
		if (code >= 0xffff) continue;
		const last = segments.at(-1);
		if (last && code === last[1] + 1 && glyph - code === last[2])
			last[1] = code;
		else segments.push([code, code, glyph - code]);
	}
	segments.push([0xffff, 0xffff, 1]);
	const count = segments.length;
	const length = 16 + count * 8;
	if (length > 0xffff) throw new Error('Font has too many cmap segments');
	const view = new DataView(new ArrayBuffer(length));
	const power = 2 ** Math.floor(Math.log2(count));
	view.setUint16(0, 4);
	view.setUint16(2, length);
	view.setUint16(6, count * 2);
	view.setUint16(8, power * 2);
	view.setUint16(10, Math.log2(power));
	view.setUint16(12, (count - power) * 2);
	segments.forEach(([start, end, delta], i) => {
		view.setUint16(14 + i * 2, end);
		view.setUint16(16 + count * 2 + i * 2, start);
		view.setUint16(16 + count * 4 + i * 2, delta & 0xffff);
	});
	return new Uint8Array(view.buffer);
}

function format12(entries: [number, number][]) {
	const groups: [start: number, end: number, glyph: number][] = [];
	for (const [code, glyph] of entries) {
		const last = groups.at(-1);
		if (last && code === last[1] + 1 && glyph === last[2] + code - last[0])
			last[1] = code;
		else groups.push([code, code, glyph]);
	}
	const view = new DataView(new ArrayBuffer(16 + groups.length * 12));
	view.setUint16(0, 12);
	view.setUint32(4, view.byteLength);
	view.setUint32(12, groups.length);
	groups.forEach(([start, end, glyph], i) => {
		view.setUint32(16 + i * 12, start);
		view.setUint32(20 + i * 12, end);
		view.setUint32(24 + i * 12, glyph);
	});
	return new Uint8Array(view.buffer);
}

function writeCmap(map: Map<number, number>, variations?: Uint8Array) {
	const entries = [...map].sort(([a], [b]) => a - b);
	const basic = format4(entries);
	const full = entries.some(([code]) => code > 0xffff)
		? format12(entries)
		: undefined;
	const records: [platform: number, encoding: number, table: Uint8Array][] = [
		[0, 3, basic],
		...(full ? [[0, 4, full] as [number, number, Uint8Array]] : []),
		...(variations
			? [[0, 5, variations] as [number, number, Uint8Array]]
			: []),
		[3, 1, basic],
		...(full ? [[3, 10, full] as [number, number, Uint8Array]] : []),
	];
	const tables = [...new Set(records.map(([, , table]) => table))];
	const offsets = new Map<Uint8Array, number>();
	let length = 4 + records.length * 8;
	for (const table of tables) {
		offsets.set(table, length);
		length += table.length;
	}
	const cmap = new Uint8Array(length);
	const view = new DataView(cmap.buffer);
	view.setUint16(2, records.length);
	records.forEach(([platform, encoding, table], i) => {
		view.setUint16(4 + i * 8, platform);
		view.setUint16(6 + i * 8, encoding);
		view.setUint32(8 + i * 8, offsets.get(table) ?? 0);
	});
	for (const table of tables) cmap.set(table, offsets.get(table));
	return cmap;
}

function checksum(data: Uint8Array) {
	const padded = new Uint8Array((data.length + 3) & ~3);
	padded.set(data);
	const view = new DataView(padded.buffer);
	let sum = 0;
	for (let i = 0; i < padded.length; i += 4)
		sum = (sum + view.getUint32(i)) >>> 0;
	return sum;
}

function writeFont(flavor: number, tables: Map<string, Uint8Array>) {
	const tags = [...tables.keys()].sort();
	const head = tables.get('head');
	if (head) new DataView(head.buffer, head.byteOffset).setUint32(8, 0);
	let length = 12 + tags.length * 16;
	const offsets = tags.map((tag) => {
		const offset = length;
		length += ((tables.get(tag)?.length ?? 0) + 3) & ~3;
		return offset;
	});
	const font = new Uint8Array(length);
	const view = new DataView(font.buffer);
	const power = 2 ** Math.floor(Math.log2(tags.length));
	view.setUint32(0, flavor);
	view.setUint16(4, tags.length);
	view.setUint16(6, power * 16);
	view.setUint16(8, Math.log2(power));
	view.setUint16(10, (tags.length - power) * 16);
	tags.forEach((tag, i) => {
		const table = tables.get(tag) ?? new Uint8Array();
		const record = 12 + i * 16;
		for (let c = 0; c < 4; c++) font[record + c] = tag.charCodeAt(c);
		view.setUint32(record + 4, checksum(table));
		view.setUint32(record + 8, offsets[i]);
		view.setUint32(record + 12, table.length);
		font.set(table, offsets[i]);
	});
	const headIndex = tags.indexOf('head');
	if (headIndex >= 0)
		view.setUint32(
			offsets[headIndex] + 8,
			(0xb1b0afba - checksum(font)) >>> 0
		);
	return font;
}

export function patchFont(font: Uint8Array, key: string) {
	const { map, variations } = readCmap(font);
	const latin = [...letters].every((letter) => map.has(letter.charCodeAt(0)));
	if (key && !latin) throw new Error('Font has no glyphs for every letter');
	const tables = new Map<string, Uint8Array>();
	for (const [tag, { offset, length }] of tableRecords(font))
		if (tag !== 'DSIG')
			tables.set(tag, font.slice(offset, offset + length));
	if (latin) {
		const remapped = new Map(map);
		const glyph = (letter: string) => map.get(letter.charCodeAt(0)) ?? 0;
		for (const [letter, lookalike] of Object.entries(homoglyphs))
			remapped.set(lookalike.charCodeAt(0), glyph(letter));
		for (let i = 0; i < key.length; i++)
			remapped.set(key.charCodeAt(i), glyph(letters[i]));
		tables.set('cmap', writeCmap(remapped, variations));
	}
	const post = tables.get('post');
	if (key && post) {
		const header = post.slice(0, 32);
		new DataView(header.buffer).setUint32(0, 0x00030000);
		tables.set('post', header);
	}
	const head = tables.get('head');
	if (head)
		new DataView(head.buffer).setUint32(
			32,
			crypto.getRandomValues(new Uint32Array(1))[0]
		);
	return writeFont(
		new DataView(font.buffer, font.byteOffset).getUint32(0),
		tables
	);
}

let built: Promise<[string, Uint8Array][]> | undefined;
let builtKey: string | undefined;

export function builtFonts() {
	const { key } = fontCipher();
	if (built && builtKey === key) return built;
	builtKey = key;
	built = config.usingSEO
		? Promise.resolve(
				fontSources().map(({ name, source }): [string, Uint8Array] => [
					name,
					readFileSync(source),
				])
			)
		: import('woff2-encoder').then(({ compress, decompress }) =>
				Promise.all(
					fontSources().map(async (face) => {
						const font = await decompress(
							readFileSync(face.source)
						);
						const files: [string, Uint8Array][] = [
							[face.name, await compress(patchFont(font, ''))],
						];
						if (face.letters)
							files.push([
								cipherName(face),
								await compress(patchFont(font, key)),
							]);
						return files;
					})
				).then((files) => files.flat())
			);
	return built;
}
