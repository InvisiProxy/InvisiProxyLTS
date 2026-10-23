import {
	Keywords,
	Inline,
	route,
	values,
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

const links = {
	scramjet: (text: string) => (
		<a
			href={route('/github/scramjet')}
			target="_blank"
			rel="noopener noreferrer"
		>
			<strong>{text}</strong>
		</a>
	),
	faq: (text: string) => <a href={route('/questions')}>{text}</a>,
};

export default function Scramjet() {
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
							<img
								class="pr-logo"
								src={route('/assets/img/scramjet.webp')}
								alt="Scramjet"
							/>
							<p>
								<Translation id="scramjet.intro" tags={links} />
							</p>
						</div>
						<div class="proxy-form text-center">
							<div id="pr-sj" class="pr-form">
								<select
									id="search-engine"
									name="search-engine"
									aria-label={translate(
										'settings.browsing.searchEngine'
									)}
									class="pr-button glowbutton search-engine-list"
								>
									{[
										values.labels.Startpage,
										values.labels.Brave,
										values.labels.Google,
										values.labels.Bing,
										values.labels.DuckDuckGo,
									].map((engine) => (
										<option
											value={engine}
											selected={
												engine === values.defaultSearch
											}
										>
											{engine}
										</option>
									))}
								</select>
								<div class="search-box">
									<input
										type="text"
										spellcheck="false"
										autocomplete="off"
										placeholder={translate(
											'scramjet.searchPlaceholder'
										)}
										id="search-input"
									/>
									<ul id="autocomplete"></ul>
								</div>
								<button
									type="button"
									class="pr-button glowbutton pr-go2 link-button"
									id="search-btn"
								>
									{translate('scramjet.search')}
								</button>
							</div>
							<ProxySettings />
						</div>
					</div>
				</div>
			</div>
			<div id="footer" class="fullwidth">
				<Footer />
			</div>
			<Keywords />
			<Inline>
				<script src={route('assets/js/card.js', 'inline')} />
			</Inline>
		</>
	);
}

export function Head() {
	return (
		<>
			<title>{`InvisiProxy LTS | ${translate('scramjet.pageTitle')}`}</title>
			<PageDescription content={translate('scramjet.description')} />
			<ProxyPreloads />
			<HeadContent />
			<ScramjetScripts utilities />
			<RegisterServiceWorkerScript />
			<ParticlesScript />
			<TooltipScripts />
			<PageScripts />
		</>
	);
}
