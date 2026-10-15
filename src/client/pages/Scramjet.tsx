import { Cooking, Inline, route, values } from '../document-helpers.tsx';
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

export default function Scramjet() {
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
							<img
								class="pr-logo"
								src={route('/assets/img/scramjet.webp')}
								alt="Scramjet"
							/>
							<p>
								<a
									href={route('/github/scramjet')}
									target="_blank"
									rel="noopener noreferrer"
								>
									<strong>Scramjet</strong>
								</a>{' '}
								is a web proxy designed with performance and
								security in mind to evade internet censorship,{' '}
								bypass arbitrary web browser restrictions and
								innovate web proxy technologies. This allows you
								to browse various websites with higher level of
								privacy and access popular resources like
								Discord, GeForce NOW, Twitter and YouTube on
								restricted networks.
								<br />
								<br />
								For CAPTCHA challenges please solve them slowly.
								Scramjet is so fast you might get stuck in a loop.
								<br></br>
								Enable Tor routing if you are struggling to
								login to services or view
								<br />
								{'\n              View the '}
								<a href={route('/questions')}>FAQ</a> page if
								you have any issues with the proxy.
							</p>
						</div>
						<div class="proxy-form text-center">
							<div id="pr-sj" class="pr-form">
								<select
									id="search-engine"
									name="search-engine"
									aria-label="Search engine"
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
										placeholder="Type a URL here or enter a search query!"
										id="search-input"
									/>
									<ul id="autocomplete"></ul>
								</div>
								<button
									type="button"
									class="pr-button glowbutton pr-go2 link-button"
									id="search-btn"
								>
									SEARCH
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
			<Cooking />
			<Inline>
				<script src={route('assets/js/card.js', 'inline')} />
			</Inline>
		</>
	);
}

export function Head() {
	return (
		<>
			<title>InvisiProxy LTS | Scramjet Proxy</title>
			<PageDescription content="The new highly innovative proxy of Mercury Workshop using technologies such as service workers and sophisticated rewriting techniques with CAPTCHA support. Scramjet focuses on speed with YouTube, now.gg, Spotify, CoolMathGames and various .io sites!" />
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
