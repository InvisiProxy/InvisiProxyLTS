import { Cooking, Inline, route } from '../document-helpers.tsx';
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
import { partners } from '../../site.ts';
import App from '../components/AppButton.tsx';

export default function Partners() {
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
							<h1 class="bigtitle">Partner Services</h1>
							<p>
								Explore our partner projects. Our partners
								feature a similar model to InvisiProxy so be
								sure to join their respective discords for more
								links.
							</p>
						</div>
						<div class="proxy-form text-center">
							<div class="glist">
								{partners.map((partner) => (
									<App
										url={partner.url}
										name={partner.name}
										newtab={partner.newtab}
									/>
								))}
							</div>
							<br></br>
							<p>
								{' '}
								Our partners have features like unblocked games,
								web ports and emulation. All partners are open
								source and free to use. Consider joining their
								communities and supporting them if you can.
							</p>
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
			<title>InvisiProxy LTS | Partners</title>
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
