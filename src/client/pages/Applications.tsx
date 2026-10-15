import { Cooking, Inline, route, sites } from '../document-helpers.tsx';
import {
	ParticlesScript,
	TooltipScripts,
	ScramjetScripts,
	RegisterServiceWorkerScript,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import ProxyPreloads from '../components/ProxyPreloads.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Header from '../components/Header.tsx';
import ProxySettings from '../components/ProxySettings.tsx';
import Footer from '../components/Footer.tsx';
import App from '../components/AppButton.tsx';

export default function Applications() {
	return (
		<>
			<Cooking />
			<AntiExfil />
			<div id="header" class="fullwidth">
				<Header />
			</div>
			<div id="background" class="fullwidth"></div>
			<Cooking />
			<div data-aos="fade-right" class="hero-grid-container">
				<div class="box-hero">
					<div class="hero-content">
						<div class="proxy-header text-center">
							<h1 class="bigtitle">Applications</h1>
							<p>
								Select a website below to open it through the
								proxy. Be sure to avoid logging in with primary
								accounts, as this is a public proxy service. It
								is recommended you create alternative accounts
								and enable 2FA as some sites loosen restrictions
								under those requirements. Millions of requests
								are going through several IPs so some sites may
								block access.
							</p>
							<br />
							<p>
								Consider joining our{' '}
								<a
									href={route('/patreon')}
									target="_blank"
									rel="noopener noreferrer"
								>
									Patreon
								</a>{' '}
								if you wish to utilize traffic under a reputable
								residential ISP and faster speeds. You may also
								enable Tor routing or edit Regional Settings if
								you have any issues. For GeForce Now support
								please disable ads via the proxy settings.
							</p>
							<br />
							{'View the\n            '}
							<a href={route('/questions')}>FAQ</a> page if you
							have any issues with the proxy.
						</div>
						<div class="proxy-form text-center">
							<div class="glist">
								{sites.map((site) => (
									<App url={site.url} name={site.name} />
								))}
							</div>
							<ProxySettings />
						</div>
					</div>
				</div>
			</div>
			<Cooking />
			<div id="footer" class="fullwidth">
				<Footer />
			</div>
			<Inline>
				<script src={route('assets/js/card.js', 'inline')} />
			</Inline>
		</>
	);
}

export function Head() {
	return (
		<>
			<title>InvisiProxy LTS | Applications</title>
			<PageDescription />
			<ProxyPreloads />
			<HeadContent />
			<link
				rel="stylesheet"
				href="https://unpkg.com/tippy.js@6/dist/backdrop.css"
			/>
			<link
				rel="stylesheet"
				href="https://unpkg.com/tippy.js@6/animations/shift-away.css"
			/>
			<ScramjetScripts />
			<RegisterServiceWorkerScript />
			<ParticlesScript />
			<TooltipScripts />
			<PageScripts />
		</>
	);
}
