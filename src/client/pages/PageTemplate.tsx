import { Keywords } from '../document-helpers.tsx';
import {
	ParticlesScript,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';

export default function PageTemplate() {
	return (
		<>
			<Keywords />
			<AntiExfil />
			<div id="header" class="fullwidth">
				<Header />
			</div>
			<div id="background" class="fullwidth"></div>
			<div id="mainbody" class="fullwidth">
				<div class="box text-center"></div>
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
