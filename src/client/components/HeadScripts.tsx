import { Inline, route, SEO, translate } from '../document-helpers.tsx';

export function PageDescription(props: { content?: string }) {
	return (
		<SEO>
			<meta
				name="description"
				content={props.content ?? translate('common.description')}
			/>
		</SEO>
	);
}

export function ParticlesScript() {
	return (
		<script
			src={route('assets/js/particles.js')}
			defer={true}
			innerHTML=""
		/>
	);
}

export function AosScripts() {
	return (
		<>
			<Inline>
				<link
					rel="stylesheet"
					href={route('assets/css/aos.css', 'inline')}
				/>
			</Inline>
			<script
				src={route('assets/js/aos.js')}
				defer={true}
				innerHTML=""
			/>
		</>
	);
}

export function TooltipScripts() {
	return (
		<script
			src={route('assets/js/tooltips.js')}
			defer={true}
			innerHTML=""
		/>
	);
}

export function ScramjetScripts(props: { utilities?: boolean }) {
	return (
		<>
			<script
				src={route('/scram/scramjet.js')}
				defer={true}
				data-module=""
				innerHTML=""
			/>
			<script
				src={route('/scram/controller.api.js')}
				defer={true}
				data-module=""
				innerHTML=""
			/>
			{props.utilities && (
				<script
					src={route('/scram/scramjet-utils.js')}
					defer={true}
					data-module=""
					innerHTML=""
				/>
			)}
		</>
	);
}

export function RegisterServiceWorkerScript() {
	return (
		<Inline>
			<script
				src={route('/assets/js/register-sw.js', 'inline')}
				defer={true}
				innerHTML=""
			/>
		</Inline>
	);
}

export function PageScripts(props: {
	common?: boolean;
	registerServiceWorker?: boolean;
}) {
	const scripts = [
		<script
			src={route('assets/js/link.js', 'inline')}
			defer={true}
			innerHTML=""
		/>,
		<script
			src={route('assets/js/csel.js', 'inline')}
			defer={true}
			innerHTML=""
		/>,
	];
	if (props.registerServiceWorker) {
		scripts.unshift(
			<script
				src={route('/assets/js/register-sw.js', 'inline')}
				defer={true}
				innerHTML=""
			/>
		);
	}
	if (props.common !== false) {
		scripts.push(
			<script
				src={route('assets/js/common.js', 'inline')}
				defer={true}
				innerHTML=""
			/>
		);
	}
	return <Inline>{scripts}</Inline>;
}
