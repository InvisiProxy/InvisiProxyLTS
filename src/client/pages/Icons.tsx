import { Keywords, iconBookmarklet, translate } from '../document-helpers.tsx';
import {
	ParticlesScript,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';

export default function Icons() {
	return (
		<>
			<Keywords />
			<AntiExfil />
			<div id="header" class="fullwidth">
				<Header />
			</div>
			<div id="background" class="fullwidth"></div>
			<Keywords />
			<div id="mainbody" class="fullwidth">
				<div class="box-clear text-center textm">
					<Keywords />
					<h1 class="bigtitle">{translate('icons.title')}</h1>
					<h3>{translate('icons.subtitle')}</h3>
					<p>{translate('faq.icons.bookmarklet')}</p>
					<div id="bks-parent">
						<a
							href={iconBookmarklet()}
							id="iconfinder"
							class="fancybutton fb-l glowbutton"
						>
							{translate('faq.icons.button')}
						</a>
					</div>
					<p>{translate('icons.copy')}</p>
				</div>
			</div>
			<div id="footer" class="fullwidth">
				<Footer />
			</div>
			<Keywords />
		</>
	);
}

export function Head() {
	return (
		<>
			<title>InvisiProxy LTS</title>
			<PageDescription />
			<HeadContent />
			<ParticlesScript />
			<PageScripts />
		</>
	);
}
