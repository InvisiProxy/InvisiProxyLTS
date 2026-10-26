import { route } from '../document-helpers.tsx';

export default function ProxyPreloads() {
	return (
		<>
			<link
				rel="preload"
				as="script"
				href={route('/scram/scramjet.js')}
			/>
			<link
				rel="preload"
				as="script"
				href={route('/scram/controller.api.js')}
			/>
		</>
	);
}
