import type { ScramjetHeaders } from '@mercuryworkshop/scramjet';
import type { ManagedPlugin } from '@mercuryworkshop/scramjet-controller';
import type { Frame } from '@mercuryworkshop/scramjet-controller';

type ManagedPluginCtor = new (
	name: string,
	dependencies: string[]
) => ManagedPlugin;
type ScramjetHeadersCtor = typeof ScramjetHeaders;

/**
 * Intercepts top-level navigation requests (triggered by clicking "open in new tab" on a link, or window.open)
 * Without this plugin, they would open without the proxy shell, which is usually undesired.
 * give a callback telling it how to redirect back to the proxy shell.
 *
 * The class is built lazily (see createUrlWatcherPlugin).
 */
export function createCatchEscapedLinksPlugin(
	ManagedPlugin: ManagedPluginCtor,
	ScramjetHeaders: ScramjetHeadersCtor
) {
	return class CatchEscapedLinksPlugin extends ManagedPlugin {
		private toLocation: (url: URL) => string | URL;

		constructor(toLocation: (url: URL) => string | URL) {
			super('catch-escaped-links', []);
			this.toLocation = toLocation;
		}

		install(frame: Frame): void {
			this.tap(
				frame.hooks.fetch.intercept,
				(context, props) => {
					if (context.parsed.destination !== 'document') return;

					const location = this.toLocation(context.parsed.url);
					props.response = {
						body: '',
						status: 302,
						statusText: 'Found',
						headers: ScramjetHeaders.fromRawHeaders([
							['Location', String(location)],
						]),
					};
				},
				{ after: ['scramjet-http-cache'] }
			);
		}
	};
}
