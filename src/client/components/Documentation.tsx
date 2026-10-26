import type { JSX, ParentProps } from 'solid-js';
import { docsPages } from '../../server/links.ts';
import { route, SEO, translate, Translation } from '../document-helpers.tsx';

const repo = 'https://github.com/InvisiProxy/InvisiProxyLTS';

const hidden = (name: string) =>
	Object.hasOwn(docsPages, name) ? route(`/${name}`) : name;

function Ext(props: ParentProps<{ href: string }>) {
	return (
		<a href={props.href} target="_blank" rel="noopener noreferrer">
			{props.children}
		</a>
	);
}

const ext = (href: string) => (text: string) => <Ext href={href}>{text}</Ext>;

const routed = (path: string) => (text: string) => (
	<Ext href={route(path)}>{text}</Ext>
);

const tags = {
	chemical: routed('/chemicaljs'),
	codespaces: routed('/codespaces'),
	scramjet: routed('/github/scramjet'),
	wisp: routed('/github/wisp'),
	merp: routed('/github/merp'),
	epoxy: routed('/github/epoxy'),
	libcurl: routed('/github/libcurl'),
	crowdin: (text: string) => (
		<strong>
			<Ext href={hidden('crowdin')}>{text}</Ext>
		</strong>
	),
	readme: () => (
		<Ext href={hidden('source-readme')}>
			<code>locales/README.md</code>
		</Ext>
	),
	todo: routed('/source-todo'),
	games: routed('/source-games'),
	porkbun: ext('https://porkbun.com'),
	node: ext('https://nodejs.org/'),
	vsc: (text: string) => <span id="vsc">{text}</span>,
	deploy: (text: string) => <a href="#deploy-InvisiProxy">{text}</a>,
};

function T(props: { id: string; params?: Record<string, string> }) {
	return <Translation id={props.id} params={props.params} tags={tags} />;
}

function DeployButton(props: {
	href: string;
	src: string;
	name: string;
	run?: boolean;
}) {
	return (
		<Ext href={props.href}>
			<img
				src={props.src}
				alt={translate(
					props.run ? 'docs.deploy.run' : 'docs.deploy.to',
					{
						name: props.name,
					}
				)}
			/>
		</Ext>
	);
}

function Options(props: { prefix: string; names: [string, string?][] }) {
	return (
		<ul>
			{props.names.map(([name, label]) => (
				<li>
					<code>{label ?? name}</code>:{' '}
					<T id={`${props.prefix}.${name}`} />
				</li>
			))}
		</ul>
	);
}

function Paths(props: { prefix: string; paths: [string, string][] }) {
	return (
		<ul>
			{props.paths.map(([key, path]) => (
				<li>
					<code>{path}</code> <T id={`${props.prefix}.${key}`} />
				</li>
			))}
		</ul>
	);
}

function Links(props: { urls: string[] }) {
	return (
		<ul>
			{props.urls.map((url) => (
				<li>
					<Ext href={hidden(url)}>{docsPages[url] ?? url}</Ext>
				</li>
			))}
		</ul>
	);
}

type TocEntry = [string, string, TocEntry[]?];

function Toc(props: { entries: TocEntry[] }): JSX.Element {
	return (
		<ul>
			{props.entries.map(([anchor, key, children]) => (
				<li>
					<a href={`#${anchor}`}>{translate(`docs.toc.${key}`)}</a>
					{children && <Toc entries={children} />}
				</li>
			))}
		</ul>
	);
}

const toc: TocEntry[] = [
	[
		'how-to-setup',
		'setup',
		[
			['terminal', 'terminal'],
			[
				'configuration',
				'configuration',
				[
					['server-configuration-setup', 'server'],
					['toronionsocks5-routing-setup', 'tor'],
					['proxy-configuration', 'proxy'],
					['client-navigation-configuration', 'navigation'],
					['translations', 'translations'],
				],
			],
			[
				'structure',
				'structure',
				[
					['structure-information', 'structureInfo'],
					['details-of-views', 'views'],
					['scripts-located-in-viewsassetsjs', 'scripts'],
				],
			],
			['future-additions', 'future'],
			[
				'vague-explanation-for-beginners-with-external-proxies-and-hosting',
				'beginners',
				[
					['list-of-some-good-hosting-options', 'hosting'],
					['domain-steps', 'domain'],
					['cloudflare-steps', 'cloudflare'],
					['workspace-configurations', 'workspace'],
				],
			],
			['detailed-faq', 'faq'],
			['more-information', 'more'],
		],
	],
];

const supportedSites: [string | null, string][] = [
	['Youtube', 'youtube'],
	['Reddit', 'reddit'],
	['Discord', 'discord'],
	['Instagram', 'instagram'],
	['Reddit', 'tor'],
	['GeForce NOW', 'geforce'],
	['ChatGPT', 'chatgpt'],
	['Spotify', 'spotify'],
	[null, 'more'],
];

const comment = (key: string) => `# ${translate(`docs.commands.${key}`)}`;

const terminalCommands = () => `git clone ${repo}.git

cd InvisiProxyLTS

${comment('pm2Config')}
pnpm install
pnpm fetch-adblock
pnpm build
pnpm start

${comment('pm2')}
pm2 start ecosystem.config.cjs

${comment('restart')}
pnpm restart

${comment('kill')}
pnpm run kill

${comment('buildErrors')}
pnpm run build

${comment('serviceErrors')}
pnpm run test`;

const ubuntuDependencies = () => `sudo apt update
sudo apt upgrade
sudo apt install curl git nginx musl

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

${comment('nodeVersion')}
nvm install 26
nvm use 26`;

const cloneAndRun = `git clone ${repo}.git
cd InvisiProxy

pnpm run fresh-start`;

const restartServices = `sudo systemctl restart nginx
sudo systemctl restart tor`;

const wispProxies = `export const wispProxies = {
  tor: 'socks5h://127.0.0.1:9050',
  eu: 'socks5h://127.0.0.1:7000',
  jp: 'socks5h://127.0.0.1:7001',
}`;

const goProxExample = `const goProx = Object.freeze({
  ultraviolet: urlHandler(uvUrl),

  scramjet: urlHandler(sjUrl),

  // \`location.protocol + "//" + getDomain()\` more like \`location.origin\`

  examplepath: urlHandler(location.protocol + \`//c.\${getDomain()}/example/\`),

  examplesubdomain: urlHandler(location.protocol + '//c.' + getDomain()),

  example: urlHandler(sjUrl('https://example.com')),
});`;

const prSetExample = () => `// ${translate('docs.commands.prSet')}

prSet('pr-uv', 'ultraviolet');
prSet('pr-sj', 'scramjet');
prSet('pr-yt', 'youtube');
prSet('pr-example', 'example');`;

const workspaceCommands = () => `git clone ${repo}.git

cd InvisiProxy

pnpm run fresh-install

${comment('start')}

pnpm start

${comment('test')}

pnpm run test`;

export default function Documentation() {
	return (
		<>
			<img
				class="docs-banner"
				src={route('assets/img/github_banner.png')}
				alt="InvisiProxy LTS"
			/>
			<div class="docs-title">
				<img
					class="docs-logo"
					src={route('assets/img/logo_github.png')}
					alt="InvisiProxy LTS"
				/>
				<div>
					<h1>InvisiProxy LTS (v8.x.x)</h1>
					<h4>{translate('docs.formerly')}</h4>
				</div>
			</div>
			<SEO>
				<p class="docs-badges">
					<img
						src={`${repo}/workflows/CI-Production/badge.svg`}
						alt={translate('docs.badges.ci')}
					/>
					<img
						src={`${repo}/workflows/CI-Win/badge.svg`}
						alt={translate('docs.badges.ci')}
					/>
					<Ext href="https://hub.docker.com/r/quiteafancyemerald/InvisiProxy">
						<img
							src="https://img.shields.io/docker/v/quiteafancyemerald/invisiproxy.svg"
							alt={translate('docs.badges.dockerVersion')}
						/>
					</Ext>
					<Ext href="https://hub.docker.com/r/quiteafancyemerald/InvisiProxy">
						<img
							src="https://img.shields.io/docker/pulls/quiteafancyemerald/invisiproxy.svg"
							alt={translate('docs.badges.dockerPulls')}
						/>
					</Ext>
					<Ext href="https://hub.docker.com/r/quiteafancyemerald/holy-unblocker">
						<img
							src="https://img.shields.io/docker/pulls/quiteafancyemerald/holy-unblocker.svg"
							alt={translate('docs.badges.dockerPulls')}
						/>
					</Ext>
				</p>
			</SEO>
			<p>
				<T id="docs.intro" />
			</p>
			<p>
				<T id="docs.chemical" />
			</p>
			<div class="docs-actions">
				<a
					href={route('/chemicaljs')}
					target="_blank"
					rel="noopener noreferrer"
					class="fancybutton fb-l glowbutton"
				>
					{translate('docs.chemicalButton')}
				</a>
			</div>
			<h2>{translate('docs.star')}</h2>
			<p>{translate('docs.about')}</p>
			<h4>{translate('docs.users')}</h4>
			<h4>{translate('docs.branches.current')}</h4>
			<details>
				<summary>{translate('docs.branches.title')}</summary>
				<ul>
					<li>{translate('docs.branches.latest')}</li>
					<li>{translate('docs.branches.beta')}</li>
					<li>{translate('docs.branches.production')}</li>
				</ul>
			</details>
			<h4>{translate('docs.branches.switch')}</h4>
			<p>
				<T id="docs.selfHost" />
			</p>
			<p class="docs-discord">
				<img
					class="docs-icon"
					src={route('assets/img/mirrors.png')}
					alt=""
				/>
				<span>
					<strong>{translate('docs.discord')}</strong>{' '}
					<Ext href={route('/titaniumnetwork')}>
						https://discord.gg/unblock
					</Ext>
				</span>
			</p>
			<blockquote class="docs-callout docs-caution">
				<p>
					<strong>{translate('docs.caution.title')}</strong>
				</p>
				<p>{translate('docs.caution.body')}</p>
			</blockquote>
			<blockquote class="docs-callout docs-tip">
				<p>
					<strong>{translate('docs.tip.title')}</strong>
				</p>
				<p>{translate('docs.tip.body')}</p>
			</blockquote>
			<table class="documentation-table">
				<thead>
					<tr>
						<th scope="col">{translate('docs.sites.site')}</th>
						<th scope="col">{translate('docs.sites.features')}</th>
					</tr>
				</thead>
				<tbody>
					{supportedSites.map(([site, key]) => (
						<tr>
							<td>{site ?? translate(`docs.sites.${key}`)}</td>
							<td>
								{translate(
									site
										? `docs.sites.${key}`
										: 'docs.sites.moreFeature'
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<img
				class="docs-preview"
				src={route('assets/img/preview/invisi-v8.1.0-preview.png')}
				alt="InvisiProxy LTS"
			/>
			<img
				class="docs-preview"
				src={route(
					'assets/img/preview/invisi-v8.1.0-preview-settings.png'
				)}
				alt="InvisiProxy LTS"
			/>
			<h2 id="deploy-InvisiProxy">{translate('docs.deploy.title')}</h2>
			<h3>{translate('docs.deploy.free')}</h3>
			<p class="docs-badges">
				<DeployButton
					href={hidden('deploy-koyeb')}
					src="https://binbashbanana.github.io/deploy-buttons/buttons/remade/koyeb.svg"
					name="Koyeb"
				/>
				<DeployButton
					href="https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/BinBashBanana/deploy-buttons/archive/refs/heads/main.zip"
					src="https://binbashbanana.github.io/deploy-buttons/buttons/remade/oraclecloud.svg"
					name="Oracle Cloud"
				/>
			</p>
			<details>
				<summary>{translate('docs.deploy.alternatives')}</summary>
				<p class="docs-badges">
					<DeployButton
						href={hidden('deploy-render')}
						src="https://render.com/images/deploy-to-render-button.svg"
						name="Render"
					/>
					<DeployButton
						href={hidden('deploy-fly')}
						src="https://img.shields.io/badge/Deploy%20to-Fly.io-blue?logo=fly.io"
						name="Fly.io"
					/>
				</p>
			</details>
			<h3>{translate('docs.deploy.paid')}</h3>
			<p class="docs-badges">
				<DeployButton
					href={hidden('deploy-azure')}
					src="https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/azure.svg"
					name="Azure"
				/>
				<DeployButton
					href={hidden('deploy-ibm')}
					src="https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/ibmcloud.svg"
					name="IBM Cloud"
				/>
				<DeployButton
					href={hidden('deploy-aws')}
					src="https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/amplifyconsole.svg"
					name="Amplify Console"
				/>
				<DeployButton
					href={hidden('deploy-cloudrun')}
					src="https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/googlecloud.svg"
					name="Google Cloud"
					run
				/>
			</p>
			<h4>{translate('docs.deploy.replitTitle')}</h4>
			<p>{translate('docs.deploy.replit')}</p>
			<h3>GitHub Codespaces</h3>
			<details>
				<summary>{translate('docs.codespaces.title')}</summary>
				<ul>
					{[
						'fork',
						'open',
						'select',
						'branch',
						'create',
						'install',
						'ports',
					].map((key) => (
						<li>
							<T id={`docs.codespaces.${key}`} />
						</li>
					))}
				</ul>
			</details>
			<h3>{translate('docs.partners.title')}</h3>
			<ul>
				<li>
					<Ext href="https://gitlab.com/fp-production/fp">
						{translate('docs.partners.hardFork', {
							name: 'The Freedom Project',
						})}
					</Ext>
				</li>
				<li>
					<Ext href={hidden('truffled-source')}>
						{translate('docs.partners.partner', {
							name: 'Truffled',
						})}
					</Ext>
				</li>
				<li>
					<Ext href={hidden('obsidian')}>
						{translate('docs.partners.partner', {
							name: 'Obsidian',
						})}
					</Ext>
				</li>
			</ul>
			<h2>{translate('docs.toc.title')}</h2>
			<Toc entries={toc} />
			<h2 id="how-to-setup">{translate('docs.setup.title')}</h2>
			<h4>{translate('docs.setup.branchWarning')}</h4>
			<h4>{translate('docs.setup.branchExample')}</h4>
			<h3 id="terminal">{translate('docs.setup.terminal')}</h3>
			<p>{translate('docs.setup.terminalIntro')}</p>
			<p>
				<strong>{translate('docs.setup.nginxOnly')}</strong>
			</p>
			<p>
				<T id="docs.setup.requirements" />
			</p>
			<pre>
				<code>{terminalCommands()}</code>
			</pre>
			<p>
				<T id="docs.setup.builtIn" />
			</p>
			<h3>{translate('docs.setup.caddyWarning')}</h3>
			<h4>{translate('docs.ubuntu.title')}</h4>
			<p>
				<T id="docs.ubuntu.intro" />
			</p>
			<details>
				<summary>{translate('docs.ubuntu.summary')}</summary>
				<p>{translate('docs.ubuntu.mirrors')}</p>
				<h3>{translate('docs.ubuntu.hosting')}</h3>
				<p>{translate('docs.ubuntu.hostingBody')}</p>
				<Links urls={['guide-vps', 'source-deploy', 'guide-dns']} />
				<h3>{translate('docs.ubuntu.dependencies')}</h3>
				<p>{translate('docs.ubuntu.dependenciesBody')}</p>
				<pre>
					<code>{ubuntuDependencies()}</code>
				</pre>
				<Links
					urls={['https://github.com/nvm-sh/nvm', 'guide-nginx']}
				/>
				<h3>{translate('docs.ubuntu.tor')}</h3>
				<p>
					<Ext href={hidden('source-tor')}>
						{`${repo}#toronionsocks5-routing-setup`}
					</Ext>
				</p>
				<h3>{translate('docs.ubuntu.configure')}</h3>
				<p>{translate('docs.ubuntu.configureBody')}</p>
				<p>
					{translate('docs.ubuntu.configureMore')}{' '}
					<Ext
						href={hidden('source-config')}
					>{`${repo}#configuration`}</Ext>
				</p>
				<h3>{translate('docs.ubuntu.run')}</h3>
				<p>{translate('docs.ubuntu.runBody')}</p>
				<pre>
					<code>{cloneAndRun}</code>
				</pre>
				<p>{translate('docs.ubuntu.restart')}</p>
				<pre>
					<code>{restartServices}</code>
				</pre>
			</details>
			<p>{translate('docs.setup.resources')}</p>
			<Links
				urls={[
					'https://github.com/nvm-sh/nvm',
					'guide-nginx',
					'guide-vps',
					'guide-dns',
				]}
			/>
			<h3 id="configuration">{translate('docs.config.title')}</h3>
			<h4 id="server-configuration-setup">
				{translate('docs.config.server')}
			</h4>
			<p>
				<T id="docs.config.port" />
			</p>
			<p>
				<T id="docs.config.local" />
			</p>
			<p>
				<strong>config.json</strong>
			</p>
			<Options
				prefix="docs.config.options"
				names={[
					['minifyScripts'],
					['randomizeIdentifiers'],
					['production'],
					['disguiseFiles'],
					['usingSEO'],
					['verbose'],
					['mirrorLinksFile'],
					['geoLanguage'],
					['singleLanguage'],
					['language'],
				]}
			/>
			<h4 id="translations">{translate('docs.translations.title')}</h4>
			<p>
				<T id="docs.translations.crowdin" />
			</p>
			<p>
				<T id="docs.translations.rules" />
			</p>
			<h4 id="toronionsocks5-routing-setup">
				{translate('docs.tor.title')}
			</h4>
			<p>{translate('docs.tor.intro')}</p>
			<p>
				{translate('docs.tor.guide')}{' '}
				<Ext href={hidden('tor-browser')}>
					https://tb-manual.torproject.org/installation/
				</Ext>
			</p>
			<p>
				{translate('docs.tor.cliGuide')}{' '}
				<Ext href={hidden('tor-onion')}>
					https://community.torproject.org/onion-services/setup/install/
				</Ext>
			</p>
			<p>{translate('docs.tor.body')}</p>
			<p>{translate('docs.tor.customWisp')}</p>
			<p>
				<T id="docs.tor.customProxy" />
			</p>
			<pre>
				<code>{wispProxies}</code>
			</pre>
			<h4 id="proxy-configuration">{translate('docs.proxy.title')}</h4>
			<p>
				<T id="docs.proxy.body" />
			</p>
			<Options
				prefix="docs.proxy.options"
				names={[
					['stockSW'],
					['blacklistSW'],
					['proxyUrl'],
					['transports'],
					['wispUrl'],
					['defaultMode'],
					['ScramjetController'],
				]}
			/>
			<h4 id="client-navigation-configuration">
				{translate('docs.navigation.title')}
			</h4>
			<p>
				<T id="docs.navigation.body" />
			</p>
			<Options
				prefix="docs.navigation.options"
				names={[
					['getDomain'],
					['goFrame'],
					['sx'],
					['search', 'search/uvUrl/sjUrl'],
					['urlHandler', 'urlHandler/asyncUrlHandler'],
					['goProx'],
				]}
			/>
			<pre>
				<code>{goProxExample}</code>
			</pre>
			<Options prefix="docs.navigation.options" names={[['prSet']]} />
			<pre>
				<code>{prSetExample()}</code>
			</pre>
			<Options
				prefix="docs.navigation.options"
				names={[['huLinks', 'huLinks/navLists']]}
			/>
			<h2 id="structure">{translate('docs.structure.title')}</h2>
			<details>
				<summary>{translate('docs.structure.summary')}</summary>
				<h3 id="structure-information">
					{translate('docs.structure.info')}
				</h3>
				<Options
					prefix="docs.structure.root"
					names={[
						['views', '/views/'],
						['src', '/src/'],
					]}
				/>
				<h4 id="details-of-views">
					<T id="docs.structure.views" />
				</h4>
				<Paths
					prefix="docs.structure.folders"
					paths={[
						['dist', '/dist/'],
						['pages', '/pages/'],
						['assets', '/assets/'],
						['scram', '/scram/'],
						['uv', '/uv/'],
					]}
				/>
				<h4 id="scripts-located-in-viewsassetsjs">
					<T id="docs.structure.scripts" />
				</h4>
				<Paths
					prefix="docs.structure.files"
					paths={[
						['card', 'card.js'],
						['common', 'common.js'],
						['csel', 'csel.js'],
						['loader', 'loader.js'],
						['registerSw', 'register-sw.js'],
					]}
				/>
			</details>
			<h2 id="future-additions">{translate('docs.future.title')}</h2>
			<p>
				<T id="docs.future.body" />
			</p>
			<h2 id="vague-explanation-for-beginners-with-external-proxies-and-hosting">
				{translate('docs.beginners.title')}
			</h2>
			<p>{translate('docs.beginners.intro')}</p>
			<h4 id="list-of-some-good-hosting-options">
				{translate('docs.beginners.hosting')}
			</h4>
			<ul>
				<li>
					<Ext href="https://synteq.com/">Synteq</Ext> (
					{translate('docs.beginners.current')})
				</li>
				<li>
					<Ext href="https://greencloudvps.com">Greencloud</Ext> (
					{translate('docs.beginners.paid')})
				</li>
				<li>
					<Ext href="https://www.oracle.com/cloud">Oracle Cloud</Ext>{' '}
					({translate('docs.beginners.freePaidDedicated')})
				</li>
				<li>
					<Ext href="https://azure.microsoft.com">Azure</Ext> (
					{translate('docs.beginners.freeAndPaid')})
				</li>
			</ul>
			<p>{translate('docs.beginners.preference')}</p>
			<p>{translate('docs.beginners.cloudflare')}</p>
			<p>
				<T id="docs.beginners.dns" />
			</p>
			<img
				class="docs-dns"
				src={route('assets/img/dnssetup.png')}
				alt={translate('docs.beginners.dnsAlt')}
			/>
			<ul>
				<li>
					<T id="docs.beginners.root" />
				</li>
				<li>
					<T id="docs.beginners.subdomain" />
				</li>
			</ul>
			<p>{translate('docs.beginners.local')}</p>
			<h4 id="domain-steps">{translate('docs.domain.title')}</h4>
			<ul>
				<li>
					<T id="docs.domain.porkbun" />
				</li>
			</ul>
			<h4 id="cloudflare-steps">{translate('docs.cloudflare.title')}</h4>
			<ul>
				<li>{translate('docs.cloudflare.account')}</li>
			</ul>
			<p>{translate('docs.cloudflare.records')}</p>
			<p>
				<strong>{translate('docs.cloudflare.columns')}</strong>
			</p>
			<p>
				{['@', 'www', 'a'].map((name, index) => (
					<>
						{index > 0 && <br />}
						<code>{`A | ${name} | ${translate('docs.cloudflare.ip')}`}</code>
					</>
				))}
			</p>
			<p>{translate('docs.cloudflare.ssl')}</p>
			<h4 id="workspace-configurations">
				{translate('docs.workspace.title')}
			</h4>
			<p>
				<T id="docs.workspace.vsc" />
			</p>
			<p>{translate('docs.workspace.fork')}</p>
			<pre>
				<code>{workspaceCommands()}</code>
			</pre>
			<p>
				<T id="docs.workspace.gitignore" />
			</p>
			<pre>
				<code>node_modules</code>
			</pre>
			<p>{translate('docs.workspace.deploy')}</p>
			<p>{translate('docs.workspace.gitpod')}</p>
			<ul>
				<li>
					{translate('docs.workspace.gitpodAccount')}{' '}
					<code>https://gitpod.io/</code>
				</li>
				<li>
					{translate('docs.workspace.gitpodFork')}{' '}
					<code>
						https://gitpod.io#https://github.com/YourNameHere/InvisiProxy/
					</code>
				</li>
			</ul>
			<p>
				<T id="docs.workspace.gitpodSteps" />
			</p>
			<h2 id="detailed-faq">{translate('docs.faq.title')}</h2>
			<details>
				<summary>{translate('docs.faq.summary')}</summary>
				<h4>{translate('docs.faq.games')}</h4>
				<p>
					<T id="docs.faq.gamesBody" />
				</p>
				<p>
					<strong>{translate('docs.faq.captcha')}</strong>
				</p>
				<p>{translate('docs.faq.captchaBody')}</p>
				<p>
					<strong>{translate('docs.faq.badGateway')}</strong>
				</p>
				<p>{translate('docs.faq.badGatewayBody')}</p>
				<p>{translate('docs.faq.questions')}</p>
			</details>
			<h3>{translate('docs.faq.domains')}</h3>
			<p>{translate('docs.faq.domainsBody')}</p>
			<details>
				<summary>{translate('docs.closing.summary')}</summary>
				<p>{translate('docs.closing.announcement')}</p>
				<p>{translate('docs.closing.reasons')}</p>
				<p>{translate('docs.closing.secrets')}</p>
				<p>{translate('docs.closing.future')}</p>
				<p>{translate('docs.closing.patreon')}</p>
				<p>
					{translate('docs.closing.signoff')}
					<br />
					Emerald :HuTaoHype:
				</p>
			</details>
			<h2 id="more-information">{translate('docs.more.title')}</h2>
			<p>{translate('docs.more.maintained')}</p>
			<Links urls={['tn-github', 'tn-site']} />
			<p>{translate('docs.more.website')}</p>
			<h3>{translate('docs.more.sources')}</h3>
			<p>{translate('docs.more.sourcesBody')}</p>
			<ul>
				<li>
					<Ext href={route('/wispurr')}>wispurr</Ext>
				</li>
				<li>
					<Ext href={route('/github/scramjet')}>Scramjet</Ext>
				</li>
				<li>
					<Ext href={route('/github/wisp')}>
						{translate('docs.more.wispProtocol')}
					</Ext>
				</li>
				<li>
					<Ext href={route('/github/epoxy')}>EpoxyTransport</Ext>
				</li>
				<li>
					<Ext href={route('/github/libcurl')}>libcurl-transport</Ext>
				</li>
				<li>
					<Ext href={route('/github/merp')}>
						{translate('docs.more.merp')}
					</Ext>
				</li>
				<li>
					<Ext href="https://gitlab.com/fp-production/fp">
						{translate('docs.partners.hardFork', {
							name: 'The Freedom Project',
						})}
					</Ext>
				</li>
			</ul>
			<h3>{translate('docs.more.dependencies')}</h3>
			<ul>
				<li>
					<Ext href={route('/github/solidjs')}>SolidJS</Ext>
				</li>
				<li>
					<Ext href={route('/github/vite')}>vite</Ext>
				</li>
				<li>
					<Ext href="https://github.com/tsparticles/tsparticles">
						tsparticles
					</Ext>
				</li>
				<li>
					<Ext href="https://github.com/DerpmanDev/modal">Modal</Ext>
				</li>
				<li>
					<Ext href="https://github.com/hagezi/dns-blocklists">
						{translate('docs.more.dnsBlocklists')}
					</Ext>
				</li>
				<li>
					<Ext href={route('/github/aos')}>AOS</Ext>
				</li>
				<li>
					<Ext href={route('/github/nord-theme')}>Nord Theme</Ext>
				</li>
				<li>
					<Ext href="https://fontawesome.com/">Font Awesome</Ext>
				</li>
			</ul>
			<h3>{translate('docs.more.mentions')}</h3>
			<ul>
				<li>
					<Ext href="https://synteq.com/">Synteq</Ext> (
					{translate('docs.more.hostingProvider')})
				</li>
			</ul>
		</>
	);
}
