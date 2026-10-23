import { languageTag, pageUrl, SEO, values } from '../document-helpers.tsx';

const ogLocale = (code: string) => languageTag(code).replace('-', '_');

export default function LocaleLinks(props: { route: string }) {
	const others = values.locales.filter(({ code }) => code !== values.locale);
	return (
		<SEO>
			<link rel="canonical" href={pageUrl(props.route)} />
			{others.length > 0 && (
				<>
					{values.locales.map(({ code }) => (
						<link
							rel="alternate"
							hreflang={code}
							href={pageUrl(props.route, code)}
						/>
					))}
					<link
						rel="alternate"
						hreflang="x-default"
						href={pageUrl(props.route, values.locales[0].code)}
					/>
				</>
			)}
			<meta property="og:url" content={pageUrl(props.route)} />
			<meta property="og:locale" content={ogLocale(values.locale)} />
			{others.map(({ code }) => (
				<meta property="og:locale:alternate" content={ogLocale(code)} />
			))}
		</SEO>
	);
}
