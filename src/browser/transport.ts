import type { ProxyTransport } from '@mercuryworkshop/proxy-transports';
import { customWispUrl } from './chain.ts';

export type TransportName = 'libcurl' | 'epoxy';

export function isMobileBrowser(browser: Navigator = navigator): boolean {
	const mobile = (
		browser as Navigator & {
			userAgentData?: { mobile?: boolean };
		}
	).userAgentData?.mobile;
	return (
		mobile === true ||
		/Android|iPhone|iPad|iPod|Mobile/i.test(browser.userAgent) ||
		(browser.platform === 'MacIntel' && browser.maxTouchPoints > 1)
	);
}

export function selectedTransport(
	stored: unknown,
	mobile = isMobileBrowser()
): TransportName {
	return mobile || stored === 'epoxy' ? 'epoxy' : 'libcurl';
}

export function proxyRegions(patreon: boolean): string[] {
	return ['tor', 'eu', 'jp', ...(patreon ? ['patreon'] : [])];
}

export function selectedWisp(
	settings: Record<string, unknown>,
	transport: TransportName,
	regions: string[],
	base: string
): string {
	const region = settings.UseSocks5;
	return (
		customWispUrl(settings.CustomWisp) ??
		base +
			(transport === 'libcurl' &&
			typeof region === 'string' &&
			regions.includes(region)
				? `${region}/`
				: '')
	);
}

export async function openTransport(
	moduleUrl: string,
	wisp: string
): Promise<ProxyTransport> {
	const { default: Transport } = await import(moduleUrl);
	const transport: ProxyTransport = new Transport({ wisp });
	await transport.init();
	return transport;
}
