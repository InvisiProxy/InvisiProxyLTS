import { extname } from 'node:path';
import { crc32 } from 'node:zlib';
import { config } from '../config.ts';

const randomBytes = (length: number) =>
	crypto.getRandomValues(new Uint8Array(length));

function randomLetters(cases: ('lower' | 'upper')[]) {
	const bytes = randomBytes(cases.length);
	return cases.map(
		(kind, i) => (kind === 'lower' ? 97 : 65) + (bytes[i] % 26)
	);
}

function concat(...parts: Uint8Array[]) {
	const output = new Uint8Array(
		parts.reduce((total, part) => total + part.length, 0)
	);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

const ascii = (bytes: Uint8Array, start: number, end: number) =>
	String.fromCharCode(...bytes.subarray(start, end));

function saltPng(png: Uint8Array) {
	const header = 33;
	if (png.length < header || ascii(png, 12, 16) !== 'IHDR') return png;
	const data = randomBytes(8 + (randomBytes(1)[0] % 24));
	const body = concat(
		new Uint8Array(randomLetters(['lower', 'lower', 'upper', 'lower'])),
		data
	);
	const chunk = new Uint8Array(body.length + 8);
	const view = new DataView(chunk.buffer);
	view.setUint32(0, data.length);
	chunk.set(body, 4);
	view.setUint32(body.length + 4, crc32(body));
	return concat(png.subarray(0, header), chunk, png.subarray(header));
}

function saltWebp(webp: Uint8Array) {
	if (ascii(webp, 0, 4) !== 'RIFF' || ascii(webp, 8, 12) !== 'WEBP')
		return webp;
	const data = randomBytes(8 + 2 * (randomBytes(1)[0] % 12));
	const chunk = new Uint8Array(data.length + 8);
	const view = new DataView(chunk.buffer);
	chunk.set(randomLetters(['upper', 'upper', 'upper', 'upper']));
	view.setUint32(4, data.length, true);
	chunk.set(data, 8);
	const output = concat(webp, chunk);
	new DataView(output.buffer).setUint32(4, output.length - 8, true);
	return output;
}

function leb128(value: number) {
	const bytes: number[] = [];
	do {
		let byte = value & 0x7f;
		value >>>= 7;
		if (value) byte |= 0x80;
		bytes.push(byte);
	} while (value);
	return new Uint8Array(bytes);
}

function saltWasm(wasm: Uint8Array) {
	const name = new Uint8Array(randomLetters(['lower', 'lower', 'lower']));
	const payload = concat(leb128(name.length), name, randomBytes(16));
	return concat(wasm, new Uint8Array([0]), leb128(payload.length), payload);
}

export const saltToken = () =>
	Array.from(randomBytes(12), (byte) =>
		byte.toString(16).padStart(2, '0')
	).join('');

function saltMp3(mp3: Uint8Array) {
	if (ascii(mp3, 0, 3) === 'ID3') return mp3;
	const value = new TextEncoder().encode(saltToken());
	const frame = new Uint8Array(13 + value.length);
	frame.set(new TextEncoder().encode('TXXX'));
	new DataView(frame.buffer).setUint32(4, value.length + 3);
	frame.set(value, 13);
	const header = new Uint8Array(10);
	header.set([0x49, 0x44, 0x33, 3]);
	for (let i = 0; i < 4; i++)
		header[9 - i] = (frame.length >>> (7 * i)) & 0x7f;
	return concat(header, frame, mp3);
}

export function saltAsset(name: string, source: Uint8Array): Uint8Array {
	if (config.usingSEO) return source;
	if (ascii(source, 1, 4) === 'PNG') return saltPng(source);
	if (ascii(source, 0, 4) === 'RIFF' && ascii(source, 8, 12) === 'WEBP')
		return saltWebp(source);
	if (ascii(source, 0, 4) === '\0asm') return saltWasm(source);
	switch (extname(name).toLowerCase()) {
		case '.mp3':
			return saltMp3(source);
		case '.ico':
			return concat(source, randomBytes(16));
		case '.svg':
			return concat(
				source,
				new TextEncoder().encode(`<!--${saltToken()}-->`)
			);
		default:
			return source;
	}
}

export function saltBlocklist(text: string) {
	if (config.usingSEO) return text;
	const entries = text
		.split('\n')
		.filter((line) => !'#![@'.includes(line.trim()[0] ?? '#'));
	return [`! ${saltToken()}`, ...entries].join('\n');
}
