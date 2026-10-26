export type ExternalPages = Record<string, string | Record<string, string>> & {
	github: Record<string, string>;
};

const repo = 'https://github.com/InvisiProxy/InvisiProxyLTS';
const guides = 'https://docs.titaniumnetwork.org/guides';

export const docsPages: Record<string, string> = {
	'source-readme': `${repo}/blob/master/locales/README.md`,
	'source-todo': `${repo}/blob/master/TODO.md`,
	'source-games': `${repo}/blob/master/views/GAMES.md`,
	'source-deploy': `${repo}#deploy-InvisiProxy`,
	'source-tor': `${repo}#toronionsocks5-routing-setup`,
	'source-config': `${repo}#configuration`,
	crowdin: 'https://crowdin.com/project/invisiproxy',
	'deploy-koyeb':
		'https://app.koyeb.com/deploy?name=InvisiProxyLTS&type=git&repository=InvisiProxy%2FInvisiProxyLTS&branch=production&builder=dockerfile&ports=8080%3Bhttp%3B%2F',
	'deploy-render': `https://render.com/deploy?repo=${repo}`,
	'deploy-fly': `https://fly.io/launch?repo=${repo}`,
	'deploy-azure': `https://deploy.azure.com/?repository=${repo}`,
	'deploy-ibm': `https://cloud.ibm.com/devops/setup/deploy?repository=${repo}`,
	'deploy-aws': `https://console.aws.amazon.com/amplify/home#/deploy?repo=${repo}`,
	'deploy-cloudrun': `https://deploy.cloud.run/?git_repo=${repo}`,
	'truffled-source': 'https://github.com/aukak/truffled',
	obsidian: 'https://github.com/titaniumnetwork-dev/Obsidian',
	'guide-vps': `${guides}/vps-hosting/`,
	'guide-dns': `${guides}/dns-setup/`,
	'guide-nginx': `${guides}/nginx/`,
	'tor-browser': 'https://tb-manual.torproject.org/installation/',
	'tor-onion':
		'https://community.torproject.org/onion-services/setup/install/',
	'tn-github': 'https://github.com/titaniumnetwork-dev/',
	'tn-site': 'https://titaniumnetwork.org/',
};

export const externalPages: ExternalPages = {
	...docsPages,
	github: {
		default: 'https://github.com/InvisiProxy/InvisiProxyLTS',
		aos: 'https://github.com/michalsnik/aos',
		solidjs: 'https://github.com/solidjs/solid',
		vite: 'https://github.com/vitejs/vite',
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
