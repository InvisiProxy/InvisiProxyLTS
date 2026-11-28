export type ScramjetVersion = 'v3' | 'v2';

// The Proxy Version setting. v3 (the continuous build in vendor/) is the
// default; 2.1.0 stays available for sites that need it.
export function selectedScramjetVersion(stored: unknown): ScramjetVersion {
	return stored === 'v2' ? 'v2' : 'v3';
}

export function scramjetVersionStored(version: ScramjetVersion): string | null {
	// The default needs no stored value, like every other setting here.
	return version === 'v3' ? null : version;
}
