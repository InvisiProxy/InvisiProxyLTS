import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Indraughts as transformSources } from 'merp-obfuscator';
import { projectDir, siteDir } from '../constants.ts';

export const obfuscationStateFile = '.obfuscation.json';
const stateEnv = 'INVISIPROXY_OBFUSCATION_STATE';

export interface ObfuscationState {
	version: 1;
	seed: string;
	aliases: Record<string, string>;
	classes: Record<string, string>;
	ids: Record<string, string>;
}
let cached: ObfuscationState | undefined;
let serialized: string | undefined;

export function saveObfuscationState(state: ObfuscationState) {
	cached = state;
	serialized = JSON.stringify({ root: projectDir, state });
	process.env[stateEnv] = serialized;
}

export function beginObfuscationBuild() {
	saveObfuscationState({
		version: 1,
		seed: randomBytes(32).toString('hex'),
		aliases: {},
		classes: {},
		ids: {},
	});
}

export function obfuscationState(): ObfuscationState {
	const current = process.env[stateEnv];
	if (cached && current === serialized) return cached;
	const path = join(siteDir, obfuscationStateFile);
	const shared = current ? JSON.parse(current) : undefined;
	const source =
		shared?.root === projectDir
			? JSON.stringify(shared.state)
			: existsSync(path)
				? readFileSync(path, 'utf8')
				: '';
	if (source) {
		const state: ObfuscationState = JSON.parse(source);
		state.ids ??= {};
		if (
			state.version !== 1 ||
			!state.seed ||
			!state.aliases ||
			!state.classes
		)
			throw new Error(
				'Invalid build obfuscation state; rebuild the site.'
			);
		saveObfuscationState(state);
	} else beginObfuscationBuild();
	if (!cached) throw new Error('Missing obfuscation state');
	return cached;
}

export function generatedNames(keys: Iterable<string>, scope: string) {
	const names = [...new Set(keys)].sort();
	if (!names.length) return {};
	const source = `(() => { ${names.map((_, index) => `const n${index} = ${index};`).join('\n')} return [${names.map((_, index) => `n${index}`).join(',')}]; })();`;
	const result = transformSources(
		{ 'names.js': source },
		{
			seed: `${obfuscationState().seed}:${scope}`,
			style: scope === 'paths' ? 'word' : 'hex',
			renameFiles: false,
			preservePublicNames: true,
			escapeCharacters: false,
		}
	);
	const bindings = new Map(
		result.renames
			.filter((entry) => entry.kind === 'binding')
			.map((entry) => [entry.original, entry.obfuscated])
	);
	return Object.fromEntries(
		names.map((name, index) => {
			const value = bindings.get(`n${index}`);
			if (!value)
				throw new Error(`Merp did not generate a name for ${name}`);
			return [name, value];
		})
	);
}
