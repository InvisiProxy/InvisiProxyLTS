import { route, SEO, translate, Translation } from '../document-helpers.tsx';

const externalLink = (path: string) => (text: string) => (
	<a href={route(path)} target="_blank" rel="noopener noreferrer">
		{text}
	</a>
);

const links = {
	chemical: externalLink('/chemicaljs'),
	codespaces: externalLink('/codespaces'),
};

export default function Documentation() {
	return (
		<>
			<h1>InvisiProxy LTS</h1>
			<SEO>
				<p>
					<img
						src="https://github.com/QuiteAFancyEmerald/InvisiProxy/workflows/CI-Production/badge.svg"
						alt={translate('docs.ciBadge')}
					/>
					<img
						src="https://github.com/QuiteAFancyEmerald/InvisiProxy/workflows/CI-Win/badge.svg"
						alt={translate('docs.ciBadge')}
					/>
				</p>
			</SEO>
			<br />
			<p>{translate('docs.mirrors')}</p>
			<br />
			<p>
				<Translation id="docs.chemical" tags={links} />
			</p>
			<br></br>
			<div>
				<a
					href={route('/chemicaljs')}
					target="_blank"
					rel="noopener noreferrer"
					class="fancybutton fb-l glowbutton"
				>
					{translate('docs.chemicalButton')}
				</a>
			</div>
			<br />
			<h3>GitHub Codespaces</h3>
			<details>
				<summary>{translate('docs.codespaces.title')}</summary>
				{'\n  - '}
				{translate('docs.codespaces.fork')}
				<br />
				{'\n  - '}
				<Translation id="docs.codespaces.open" tags={links} />
				<br />
				{'\n  - '}
				<Translation id="docs.codespaces.select" />
				<br />
				{'\n  - '}
				<Translation id="docs.codespaces.branch" />
				<br />
				{'\n  - '}
				<Translation id="docs.codespaces.create" />
				<br />
				{'\n  - '}
				<Translation id="docs.codespaces.install" />
				<br />
				{'\n  - '}
				{translate('docs.codespaces.ports')}
				<br />
			</details>
			<br />
			<h2>{translate('docs.setup.title')}</h2>
			<h4>{translate('docs.setup.branchWarning')}</h4>
			<h4>{translate('docs.setup.branchExample')}</h4>
			<h3>{translate('docs.setup.terminal')}</h3>
			<p>{translate('docs.setup.terminalIntro')}</p>
			<pre>
				<code>{`pnpm run fresh-install
pnpm start

# ${translate('docs.setup.restartComment')}

# ${translate('docs.setup.buildComment')}
pnpm build
pnpm dev

# ${translate('docs.setup.pm2Comment')}
pm2 start ecosystem.config.cjs`}</code>
			</pre>
			<p>{translate('docs.setup.builtIn')}</p>
			<h3>{translate('docs.config.title')}</h3>
			<h4>{translate('docs.config.server')}</h4>
			<p>
				<Translation id="docs.config.serverBody" />
			</p>
			<br />
			<h4>{translate('docs.config.tor')}</h4>
			<p>
				{translate('docs.config.torGuide')}{' '}
				<a
					href={route('/tor-project')}
					target="_blank"
					rel="noopener noreferrer"
				>
					https://support.torproject.org/little-t-tor/getting-started/installing/
				</a>
			</p>
			<p>{translate('docs.config.torBody')}</p>
			<br />
			<h4>{translate('docs.config.proxy')}</h4>
			<p>
				<Translation id="docs.config.proxyBody" />
			</p>
			<table class="documentation-table">
				<thead>
					<tr>
						<th scope="col">{translate('docs.options.option')}</th>
						<th scope="col">
							{translate('docs.options.description')}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>getSWRoute</code>
						</td>
						<td>{translate('docs.options.getSWRoute')}</td>
					</tr>
					<tr>
						<td>
							<code>proxyUrl</code>
						</td>
						<td>{translate('docs.options.proxyUrl')}</td>
					</tr>
					<tr>
						<td>
							<code>transportUrl</code>
						</td>
						<td>{translate('docs.options.transportUrl')}</td>
					</tr>
					<tr>
						<td>
							<code>wispUrl</code>
						</td>
						<td>{translate('docs.options.wispUrl')}</td>
					</tr>
					<tr>
						<td>
							<code>getTransportOptions</code>
						</td>
						<td>{translate('docs.options.getTransportOptions')}</td>
					</tr>
					<tr>
						<td>
							<code>Controller</code>
						</td>
						<td>{translate('docs.options.Controller')}</td>
					</tr>
				</tbody>
			</table>
		</>
	);
}
