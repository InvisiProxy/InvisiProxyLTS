import {
	Keywords,
	route,
	translate,
	Translation,
} from '../document-helpers.tsx';
import {
	ParticlesScript,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Footer from '../components/Footer.tsx';

export default function NotFound() {
	return (
		<>
			<Keywords />
			<AntiExfil />
			<div id="background" class="fullwidth"></div>
			<Keywords />
			<div id="mainbody" class="fullwidth">
				<div class="box-error text-center">
					<h1>{translate('error.title')}</h1>
					<h2>{translate('error.reload')}</h2>
					<h2>{translate('error.unavailable')}</h2>
					<p>{translate('error.maintenance')}</p>
					<p>{translate('error.wait')}</p>
					<br />
					<p>
						<Translation
							id="error.faq"
							tags={{
								faq: (text) => (
									<a
										href={route('/questions')}
										class="bluelink"
									>
										{text}
									</a>
								),
							}}
						/>
					</p>
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
			<base href={route('/')} />
			<title>{`InvisiProxy LTS | ${translate('error.pageTitle')}`}</title>
			<meta itemprop="http-status" content="404" />
			<PageDescription />
			<HeadContent />
			<ParticlesScript />
			<PageScripts common={false} />
			<style
				innerHTML={
					"\n      body {\n        color: #eceff4;\n        background-color: #0d1117;\n        font-family: 'Figtree', sans-serif;\n        font-optical-sizing: auto;\n        background-image:\n          radial-gradient(\n            circle,\n            rgba(131, 131, 131, 0.02) 1px,\n            transparent 1px\n          ),\n          radial-gradient(\n            circle,\n            rgba(148, 148, 148, 0.02) 1px,\n            transparent 1px\n          );\n        background-position:\n          0 0,\n          5px 5px;\n        background-size: 10px 10px;\n      }\n\n      h1 {\n        color: #ff5861;\n        font-size: 84px;\n        font-weight: 900;\n        margin-top: 6%;\n      }\n    "
				}
			/>
		</>
	);
}
