import {
	Keywords,
	Inline,
	route,
	SEO,
	translate,
} from '../document-helpers.tsx';
import {
	ParticlesScript,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Header from '../components/Header.tsx';
import FAQ from '../components/FAQ.tsx';
import Footer from '../components/Footer.tsx';

export default function FAQPage() {
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
							<FAQ />
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
			<title>{translate('faq.meta.title')}</title>
			<SEO>
				<meta
					name="robots"
					content="index, follow, max-image-preview:large"
				/>
				<meta
					name="description"
					content={translate('faq.meta.description')}
				/>
				<meta property="og:site_name" content="InvisiProxy LTS" />
				<meta
					property="og:title"
					content={translate('faq.meta.title')}
				/>
				<meta property="og:type" content="website" />
				<meta
					property="og:description"
					content={translate('faq.meta.social')}
				/>
			</SEO>
			<meta property="og:image" content={route('assets/img/hero.webp')} />
			<meta
				property="og:image:secure_url"
				content={route('assets/img/hero.webp')}
			/>
			<SEO>
				<meta
					property="og:image:alt"
					content={translate('common.logoAlt')}
				/>
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:site" content="@titaniumnetdev" />
				<meta name="twitter:creator" content="@titaniumnetdev" />
				<meta
					name="twitter:title"
					content={translate('faq.meta.title')}
				/>
				<meta
					name="twitter:description"
					content={translate('faq.meta.social')}
				/>
				<meta
					name="twitter:image"
					content={route('assets/img/hero.webp')}
				/>
				<meta
					name="twitter:image:alt"
					content={translate('common.logoAlt')}
				/>
			</SEO>
			<HeadContent />
			<ParticlesScript />
			<PageScripts />
		</>
	);
}
