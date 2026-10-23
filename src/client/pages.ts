import { route } from './document-helpers.tsx';
import type { PageDefinition } from './types';
import PageTemplate, {
	Head as PageTemplateHead,
} from './pages/PageTemplate.tsx';
import EntryPoint, { Head as EntryPointHead } from './pages/EntryPoint.tsx';
import Loader, { Head as LoaderHead } from './pages/Loader.tsx';
import ScramjetError, {
	Head as ScramjetErrorHead,
} from './pages/ScramjetError.tsx';
import Home, { Head as HomeHead } from './pages/Home.tsx';
import DocumentationPage, {
	Head as DocumentationPageHead,
} from './pages/DocumentationPage.tsx';
import FAQPage, { Head as FAQPageHead } from './pages/FAQPage.tsx';
import NotFound, { Head as NotFoundHead } from './pages/NotFound.tsx';
import ProxyFrame, { Head as ProxyFrameHead } from './pages/ProxyFrame.tsx';
import Credits, { Head as CreditsHead } from './pages/Credits.tsx';
import Privacy, { Head as PrivacyHead } from './pages/Privacy.tsx';
import Partners, { Head as PartnersHead } from './pages/Partners.tsx';
import Icons, { Head as IconsHead } from './pages/Icons.tsx';
import Scramjet, { Head as ScramjetHead } from './pages/Scramjet.tsx';
import Applications, {
	Head as ApplicationsHead,
} from './pages/Applications.tsx';

export const pageDefinitions = {
	'pages/misc/template.html': {
		Page: PageTemplate,
		Head: PageTemplateHead,
	},
	'pages/misc/deobf/entry-point.html': {
		Page: EntryPoint,
		Head: EntryPointHead,
		bodyStyle: 'background-color: #0d1117',
	},
	'pages/misc/deobf/loader.html': {
		Page: Loader,
		Head: LoaderHead,
		bodyStyle: 'background-color: #0d1117',
	},
	'pages/proxnav/scramjet-error.html': {
		route: 'sjerror',
		Page: ScramjetError,
		Head: ScramjetErrorHead,
	},
	'index.html': {
		route: ['', 'links'],
		indexed: true,
		Page: Home,
		Head: HomeHead,
	},
	'docs.html': {
		route: 'documentation',
		indexed: true,
		Page: DocumentationPage,
		Head: DocumentationPageHead,
	},
	'faq.html': {
		route: 'questions',
		indexed: true,
		Page: FAQPage,
		Head: FAQPageHead,
		bodyScripts: [
			{
				get src() {
					return route('assets/js/faq-search.js');
				},
				defer: true,
			},
		],
	},
	'error.html': { route: 'test-404', Page: NotFound, Head: NotFoundHead },
	'pages/frame.html': {
		route: 's',
		Page: ProxyFrame,
		Head: ProxyFrameHead,
	},
	'pages/nav/credits.html': {
		route: 'credits',
		indexed: true,
		Page: Credits,
		Head: CreditsHead,
	},
	'pages/nav/privacy.html': {
		route: 'privacy',
		indexed: true,
		Page: Privacy,
		Head: PrivacyHead,
	},
	'pages/nav/partners.html': {
		route: 'partners',
		indexed: true,
		Page: Partners,
		Head: PartnersHead,
	},
	'pages/nav/icons.html': { Page: Icons, Head: IconsHead },
	'pages/proxnav/scramjet.html': {
		route: ['browsing', 'scramjet'],
		indexed: true,
		Page: Scramjet,
		Head: ScramjetHead,
	},
	'pages/proxnav/preset/applications.html': {
		route: 'apps',
		indexed: true,
		Page: Applications,
		Head: ApplicationsHead,
	},
} satisfies Record<string, PageDefinition>;
