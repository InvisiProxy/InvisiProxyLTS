import { appPresets } from '../document-helpers.tsx';

export default function App(props: {
	url: string;
	name: string;
	newtab?: boolean;
	card?: boolean;
	group?: number;
}) {
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
				<img alt="" />
				<span class="app-name">{props.name}</span>
			</>
		) : (
			<img alt={props.name} />
		);
	return (
		<>
			{props.newtab ? (
				<a
					href={props.url}
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
