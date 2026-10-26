import { randomBytes } from 'node:crypto';
import { Indraughts as transformSources } from 'merp-obfuscator';
import type { Plugin } from 'vite';
import { config } from '../config.ts';
import { obfuscatedMarker as marker } from '../constants.ts';
import { rewriteClassReferences } from './classes.ts';
import { obfuscationState } from './state.ts';

export function stripObfuscatedMarker(source: string): string {
	return source.trimStart().startsWith(marker)
		? source.replace(marker, '')
		: source;
}

function transformScript(
	source: string,
	name: string,
	rewriteClasses: boolean
): string {
	if (config.usingSEO) return source;
	if (!source.trim() || source.trimStart().startsWith(marker)) return source;
	const result = transformSources(
		{
			[rewriteClasses ? 'script.js' : name]: rewriteClasses
				? rewriteClassReferences(source, name)
				: source,
		},
		{
			seed: `${obfuscationState().seed}:${randomBytes(16).toString('hex')}`,
			renameFiles: false,
			preservePublicNames: true,
			escapeCharacters: rewriteClasses,
		}
	);
	return marker + result.transformed[0].text;
}

export function obfuscateScript(source: string, name: string): string {
	return transformScript(source, name, true);
}

export function obfuscateVendorScript(source: string, name: string): string {
	return transformScript(source, name, false);
}

export function browserObfuscationPlugin(): Plugin {
	return {
		name: 'invisiproxy-obfuscation',
		apply: 'build',
		enforce: 'post',
		generateBundle(_options, bundle) {
			if (config.usingSEO) return;
			for (const output of Object.values(bundle)) {
				if (output.type === 'chunk') {
					output.code = obfuscateScript(output.code, output.fileName);
					output.map = null;
				}
			}
		},
	};
}
