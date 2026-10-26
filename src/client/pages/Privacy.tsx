import { Keywords } from '../document-helpers.tsx';
import {
	ParticlesScript,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Header from '../components/Header.tsx';
import Terms from '../components/Terms.tsx';
import Footer from '../components/Footer.tsx';

export default function Privacy() {
	return (
		<>
			<Keywords />
			<AntiExfil />
			<div id="header" class="fullwidth">
				<Header />
			</div>
			<div id="background" class="fullwidth"></div>
			<Keywords />
			<div id="mainbody" class="box-hero">
				<div id="documentation" class="hero-grid-container">
					<div class="box-hero">
						<div class="box-noflex">
							<Terms />
						</div>
					</div>
				</div>
			</div>
			<Keywords />
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
			<PageScripts common={false} />
		</>
	);
}
