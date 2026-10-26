import { Keywords, Inline, route, translate } from '../document-helpers.tsx';
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
			<Keywords />
			<AntiExfil />
			<div id="header" class="fullwidth">
				<Header />
			</div>
			<div id="background" class="fullwidth"></div>
			<Keywords />
			<div data-aos="fade-right" class="hero-grid-container">
				<div class="box-hero">
					<div class="hero-content">
						<div class="proxy-header text-center">
							<h1 class="bigtitle">
								{translate('partners.title')}
							</h1>
							<p>{translate('partners.intro')}</p>
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
							<p>{translate('partners.features')}</p>
							<ProxySettings />
						</div>
					</div>
				</div>
			</div>
			<Keywords />
			<div id="footer" class="fullwidth">
				<Footer />
			</div>
			<Inline>
				<script src={route('assets/js/card.js', 'inline')} />
				<script>{`
					if (!localStorage.getItem("playobsidian.com@theme")) {
						localStorage.setItem("playobsidian.com@theme", "Top Hat");
					}
				`}</script>
			</Inline>
		</>
	);
}

export function Head() {
	return (
		<>
			<title>{`InvisiProxy LTS | ${translate('header.partners.label')}`}</title>
			<PageDescription />
			<ProxyPreloads />
			<HeadContent />
			<ScramjetScripts />
			<RegisterServiceWorkerScript />
			<ParticlesScript />
			<TooltipScripts />
			<PageScripts />
		</>
	);
}
