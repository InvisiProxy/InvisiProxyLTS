declare module 'build:invisiproxy' {
	export const values: import('../site.ts').SiteValues;
	export const plainText: typeof import('../obfuscation/masks.ts').plainText;
}
