import { route, SEO } from '../document-helpers.tsx';

export default function Documentation() {
	return (
		<>
			<h1>InvisiProxy LTS</h1>
			<SEO>
				<p>
					<img
						src="https://github.com/QuiteAFancyEmerald/InvisiProxy/workflows/CI-Production/badge.svg"
						alt="GitHub Actions Status"
					/>
					<img
						src="https://github.com/QuiteAFancyEmerald/InvisiProxy/workflows/CI-Win/badge.svg"
						alt="GitHub Actions Status"
					/>
				</p>
			</SEO>
			<br />
			<p>
				Simply click on the Links icon for more mirrors. Can't deploy
				using any of the free options below? Check out Railway or look
				into cheap, paid VPS hosting solutions.
			</p>
			<br />
			<p>
				Try using{' '}
				<a
					href={route('/chemicaljs')}
					target="_blank"
					rel="noopener noreferrer"
				>
					Chemical
				</a>{' '}
				if you want to create your own web proxy service from scratch.
			</p>
			<br></br>
			<div>
				<a
					href={route('/chemicaljs')}
					target="_blank"
						rel="noopener noreferrer"
						class="fancybutton fb-l glowbutton"
				>
					Build Your Proxy Site with Chemical
				</a>
			</div>
			<br />
			<h3>GitHub Codespaces</h3>
			<details>
				<summary>Setup Instructions</summary>
				{'\n\n  - '}
				Fork (and star!) this repository to your GitHub account
				<br />
				{'\n  - '}
				Head to the official{' '}
				<a
					href={route('/codespaces')}
					target="_blank"
					rel="noopener noreferrer"
				>
					Codespaces
				</a>
				{' website (ensure you\n  have a GitHub account already made)'}
				<br />
				{'\n  - Select '}
				<strong>New Codespaces</strong>
				{' and look for\n  '}
				<em>[USERNAME]/InvisiProxy</em>
				{' on your account'}
				<br />
				{'\n  - Ensure the branch is set to '}
				<code>master</code>
				{' and the dev container\n  configuration is set to '}
				<strong>InvisiProxy LTS</strong>
				<br />
				{'\n  - Select '}
				<strong>Create Codespace</strong>
				{' and allow the container to setup'}
				<br />
				{'\n  - Type '}
				<code>pnpm run fresh-install</code>
				{' and '}
				<code>pnpm start</code>
				{' in the terminal'}
				<br />
				{
					'\n  - Click "Make public" on the application popup, then access the deployed\n  website via the ports tab.'
				}
				<br />
			</details>
			<br />
			<h2>How to Setup</h2>
			<h4>
				It is highly recommended you switch branches via your IDE to a
				production released branch. Often the master branch contains
				unstable or WIP changes.
			</h4>
			<h4>Example: v6.x_production instead of master</h4>
			<h3>Terminal</h3>
			<p>
				Either use the button above to deploy to the deployment options
				above or type the commands below on a dedicated server:
			</p>
			<pre>
				<code>{`pnpm run fresh-install
pnpm start

# Stop with Ctrl+C, then run pnpm start again to restart

# Build or develop
pnpm build
pnpm dev

# pm2 daemon
pm2 start ecosystem.config.cjs`}</code>
			</pre>
			<p>
				This website is hosted locally with Scramjet, Wisp, Proxy
				Transports, EpoxyTransport, and LibcurlTransport built-in.
			</p>
			<h3>Configuration</h3>
			<h4>Server Configuration Setup</h4>
			<p>
				The default place for the proxy when its started is{' '}
				<code>http://localhost:8080</code>
				{', but you can change it if needed in\n  '}
				<code>./config.json</code>
				{'. You can also modify the other\n  configuration values at '}
				<code>./config.json</code>
				{'. '}
				Set the port in configuration or override it with the PORT
				environment variable. Other settings are in{' '}
				<code>./config.json</code>
				{'.\n  '}
				Localized changes for source randomization, auto-minify, etc.
				are located in <code>./config.json</code>
				{'.\n'}
			</p>
			<br />
			<h4>Tor/Onion Routing Setup</h4>
			<p>
				Simply host Tor using this guide:{' '}
				<a
					href={route('/tor-project')}
					target="_blank"
					rel="noopener noreferrer"
				>
					https://support.torproject.org/little-t-tor/getting-started/installing/
				</a>
			</p>
			<p>
				If you are hosting InvisiProxy LTS on a VPS utilizing Ubuntu
				consider attaching Tor to systemctl for easier production
				management. Once Tor is up and running on either Linux or
				Windows it will work automatically with InvisiProxy LTS when
				enabled by the user via the Settings menu.
			</p>
			<br />
			<h4>Proxy Configuration</h4>
			<p>
				The primary location for tweaking any web proxy related settings
				assigned via the Settings menu is{' '}
				<code>./views/assets/js/register-sw.js</code>
				{'.'} Here you can modify the provided transport options set
				locally via localStorage, swap out SOCKS5 proxies, change Onion
				routing ports, specify a blacklist, and more.
			</p>
			<table class="documentation-table">
				<thead>
					<tr>
						<th scope="col">Option</th>
						<th scope="col">Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>getSWRoute</code>
						</td>
						<td>
							Selects the Scramjet service worker based on
							adblocking.
						</td>
					</tr>
					<tr>
						<td>
							<code>proxyUrl</code>
						</td>
						<td>
							Specifies a SOCKS5 protocol URL defaulting to the
							default Tor proxy port.
						</td>
					</tr>
					<tr>
						<td>
							<code>transportUrl</code>
						</td>
						<td>
							The selected libcurl or Epoxy module implementing
							Proxy Transports for use with Wisp. Mobile browsers
							always use Epoxy.
						</td>
					</tr>
					<tr>
						<td>
							<code>wispUrl</code>
						</td>
						<td>Modify the pathname or url handling for Wisp.</td>
					</tr>
					<tr>
						<td>
							<code>getTransportOptions</code>
						</td>
						<td>
							Configures Wisp and the optional SOCKS5 proxy for
							Libcurl.
						</td>
					</tr>
					<tr>
						<td>
							<code>Controller</code>
						</td>
						<td>
							This constructor allows you to swap out the prefix
							used for Scramjet dynamically and specify file
							locations.
						</td>
					</tr>
				</tbody>
			</table>
		</>
	);
}
