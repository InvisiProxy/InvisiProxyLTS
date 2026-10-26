import { values } from '../site.ts';

type Codec = (value: string) => string;

export interface ProxyCodec {
	encode: Codec;
	decode: Codec;
}

export function encodeSource(literal: string) {
	return `if (!url) return url;
	const key = ${literal};
	const bytes = new TextEncoder().encode(url);
	let binary = '';
	for (let i = 0; i < bytes.length; i++)
		binary += String.fromCharCode(bytes[i] ^ key.charCodeAt(i % key.length));
	return btoa(binary).split('+').join('-').split('/').join('_').split('=').join('');`;
}

export function decodeSource(literal: string) {
	return `if (!url) return url;
	try {
		const key = ${literal};
		let base64 = url.split('-').join('+').split('_').join('/');
		base64 += '='.repeat((4 - (base64.length % 4)) % 4);
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++)
			bytes[i] = binary.charCodeAt(i) ^ key.charCodeAt(i % key.length);
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return decodeURIComponent(url);
	}`;
}

let cached: ProxyCodec | undefined;

export function proxyCodec(): ProxyCodec {
	if (cached) return cached;
	const key = values.usingSEO ? '' : values.proxyCodecKey || '';
	const literal = JSON.stringify(key);
	cached = {
		encode: new Function(
			'url',
			key ? encodeSource(literal) : 'return url ? encodeURIComponent(url) : url;'
		) as Codec,
		decode: new Function(
			'url',
			key ? decodeSource(literal) : 'return url ? decodeURIComponent(url) : url;'
		) as Codec,
	};
	return cached;
}

export const decodeUrl: Codec = (url) => proxyCodec().decode(url);
