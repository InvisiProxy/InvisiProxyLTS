import { values } from '../site.ts';
import LocaleLinks from './components/LocaleLinks.tsx';
import type { PageDefinition } from './types';

export default function Document(props: PageDefinition) {
	const Head = props.Head;
	const Page = props.Page;
	return (
		<html lang={values.locale}>
			<head>
				{values.usingSEO && <meta charset="utf-8" />}
				<Head />
				{props.indexed && (
					<LocaleLinks route={[props.route ?? ''].flat()[0]} />
				)}
			</head>
			<body id="top" style={props.bodyStyle}>
				<Page />
				{(props.bodyScripts || []).map((script) => (
					<script {...script} />
				))}
			</body>
		</html>
	);
}
