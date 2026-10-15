export type ExternalPages = Record<string, string | Record<string, string>> & {
	github: Record<string, string>;
};

export const externalPages: ExternalPages = {
	github: {
		default: 'https://github.com/InvisiProxy/InvisiProxyLTS',
		aos: 'https://github.com/michalsnik/aos',
		solidjs: 'https://github.com/solidjs/solid',
		merp: 'https://github.com/sylvieisnton/merp',
		libcurl: 'https://github.com/MercuryWorkshop/libcurl-transport',
		epoxy: 'https://github.com/MercuryWorkshop/epoxy-transport',
		'nord-theme': 'https://github.com/nordtheme',
		'proxy-transports':
			'https://github.com/MercuryWorkshop/proxy-transports',
		scramjet: 'https://github.com/MercuryWorkshop/scramjet',
		wisp: 'https://github.com/MercuryWorkshop/wisp-protocol',
	},
	titaniumnetwork: 'https://discord.gg/unblock',
	chemicaljs: 'https://chemicaljs.github.io',
	codespaces: 'https://github.com/codespaces',
	'tor-project':
		'https://support.torproject.org/little-t-tor/getting-started/installing/',
	patreon: 'https://www.patreon.com/invisiproxy',
	kofi: 'https://ko-fi.com/quiteafancyemerald',
	truffled: 'https://truffled.lol',
	freedomproject: 'https://nullatenus.com',
	wispurr: 'https://github.com/sylvieisnton/wispurr',
};
