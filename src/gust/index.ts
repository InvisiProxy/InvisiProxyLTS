import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { route } from '../site.ts';
import { projectDir } from '../constants.ts';
import { getPathAliases } from '../obfuscation/paths.ts';
import { gustUpstream } from './document.ts';
import { applyGustPatches } from './patches.ts';

const source = readFileSync(
	join(
		projectDir,
		'node_modules/@fortawesome/fontawesome-free/svgs/solid/wind.svg'
	),
	'utf8'
);
const glyph = /<path d="([^"]+)"/.exec(source)?.[1];
if (!glyph)
	throw new Error('The bundled Font Awesome no longer ships the wind glyph');

export const gustWindIcon: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#d5484f"/>
  <g transform="translate(12 12) scale(0.078125)"><path d="${glyph}" fill="#fff"/></g>
</svg>
`;

export const gustRoute = 'gust';
export const gustPageFile = 'pages/misc/wind-panel.html';

export interface GustAsset {
	target: string;
	bytes: Uint8Array;
}

function gustPipeline(): string {
	return applyGustPatches(gustUpstream)
		.replaceAll('__IP_WISP_ROUTE__', route('/wisp/'))
		.replaceAll('__IP_GUST_WIND__', route('assets/ico/wind.svg'));
}

export function gustEmitAssets(): GustAsset[] {
	const text = gustPipeline();
	const aliases = getPathAliases();
	const encode = (value: string) => new TextEncoder().encode(value);
	return [
		{ target: gustPageFile, bytes: encode(text) },
		{
			target: `assets/ico/${aliases[`files/wind.svg`] || 'wind.svg'}`,
			bytes: encode(gustWindIcon),
		},
	];
}
