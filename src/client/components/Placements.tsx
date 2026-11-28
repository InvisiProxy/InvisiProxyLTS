import { route, translate, values } from '../document-helpers.tsx';

function Slot(props: { class: string; fill: string }) {
	return (
		<aside
			class={props.class}
			data-fill={props.fill}
			data-source={route('/api/units')}
			aria-label={translate('common.advertisement')}
		>
			<span class="placement-label">
				{translate('common.advertisement')}
			</span>
		</aside>
	);
}

function Rails() {
	return (
		<>
			<Slot class="placement placement-rail placement-left" fill="rail" />
			<Slot
				class="placement placement-rail placement-right"
				fill="rail"
			/>
		</>
	);
}

export default function Placements() {
	if (values.patreon) return null;
	return (
		<>
			<Rails />
			<Slot class="placement placement-strip" fill="banner" />
		</>
	);
}

export function LoaderPlacements() {
	if (values.patreon) return null;
	return (
		<>
			<Rails />
			<Slot class="placement placement-card" fill="loader" />
		</>
	);
}
