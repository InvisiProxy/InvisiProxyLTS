import { appPresets, route } from '../document-helpers.tsx';

export default function App(props: {
	url: string;
	name: string;
	newtab?: boolean;
	local?: boolean;
	card?: boolean;
	group?: number;
}) {
	const publicUrl = () => (props.local ? route(props.url) : props.url);
	// Locally hosted apps embed the site favicon server-side, so no icon
	// request ever leaves the origin.
	const siteFavicon = () =>
		props.local ? route('assets/ico/favicon.ico') : undefined;
	const shared = {
		class: props.card ? 'app-card' : 'dependencylogo tippy-button',
		'data-app': appPresets.findIndex((app) => app.url === props.url),
		'data-group': props.group,
		'data-tippy-content': props.card ? undefined : props.name,
		'aria-label': props.card ? undefined : props.name,
	};
	const content = () =>
		props.card ? (
			<>
				<img alt="" src={siteFavicon()} />
				<span class="app-name">{props.name}</span>
			</>
		) : (
			<img alt={props.name} src={siteFavicon()} />
		);
	return (
		<>
			{props.newtab || props.local ? (
				<a
					href={publicUrl()}
					target="_blank"
					rel="noopener noreferrer"
					{...shared}
				>
					{content()}
				</a>
			) : (
				<button type="button" {...shared}>
					{content()}
				</button>
			)}
		</>
	);
}
