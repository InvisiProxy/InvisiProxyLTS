import type { Component, JSX } from 'solid-js';

export interface PageDefinition {
	route?: string | readonly string[];
	// Page is in sitemap.xml then gets a canonical URL and links to its translations.
	indexed?: boolean;
	Page: Component;
	Head: Component;
	bodyStyle?: JSX.HTMLAttributes<HTMLBodyElement>['style'];
	bodyScripts?: JSX.ScriptHTMLAttributes<HTMLScriptElement>[];
}
