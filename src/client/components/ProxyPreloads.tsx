import { route } from '../document-helpers.tsx';

export default function ProxyPreloads() {
	return (
		<>
			<link
				rel="preload"
				as="script"
				href={route('/scram3/scramjet3.js')}
			/>
			<link
				rel="preload"
				as="script"
				href={route('/scram3/controller3.api.js')}
			/>
		</>
	);
}
