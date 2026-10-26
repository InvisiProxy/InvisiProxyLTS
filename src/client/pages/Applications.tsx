import {
	appLibrary,
	Keywords,
	Inline,
	route,
	translate,
	Translation,
} from '../document-helpers.tsx';
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

const links = {
	patreon: (text: string) => (
		<a href={route('/patreon')} target="_blank" rel="noopener noreferrer">
			{text}
		</a>
	),
	faq: (text: string) => <a href={route('/questions')}>{text}</a>,
};

export default function Applications() {
	return (
		<>
			<div id="apps-loader" class="apps-loader" role="status">
				<span class="loader-w" aria-hidden="true"></span>
				<p>{translate('apps.loading')}</p>
			</div>
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
								{translate('header.apps.mobileLabel')}
							</h1>
							<p>{translate('apps.intro')}</p>
							<br />
							<p>
								<Translation id="apps.patreon" tags={links} />
							</p>
							<br />
							<Translation id="apps.faq" tags={links} />
						</div>
						<div class="proxy-form text-center">
							<div class="app-tabs" role="tablist">
								{['all', ...appLibrary.map((category) => category.id)].map(
									(id, index) => (
										<button
											type="button"
											role="tab"
											class={index ? 'app-tab' : 'app-tab is-active'}
											aria-selected={index ? 'false' : 'true'}
										>
											{translate(`apps.categories.${id}`)}
										</button>
									)
								)}
							</div>
							<div class="glist app-grid">
								{appLibrary.flatMap((category, group) =>
									category.apps.map((app) => (
										<App
											url={app.url}
											name={app.name}
											group={group}
											card
										/>
									))
								)}
							</div>
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
			</Inline>
		</>
	);
}

export function Head() {
	return (
		<>
			<title>{`InvisiProxy LTS | ${translate('header.apps.mobileLabel')}`}</title>
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
