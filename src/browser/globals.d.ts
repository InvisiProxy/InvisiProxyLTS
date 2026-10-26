import type { Controller, Frame } from '@mercuryworkshop/scramjet-controller';
import '@mercuryworkshop/scramjet-utils';
import '@mercuryworkshop/scramjet';

declare global {
	interface InvisiScramjet {
		controller: Controller;
		frame: Frame;
		createFrame: (
			element: HTMLIFrameElement,
			onUrl?: (url: string) => void
		) => Frame;
		ready: boolean;
	}

	interface Window {
		$invisiScramjet?: InvisiScramjet;
		$invisiScramjetError?: unknown;
		$invisiScramjetInitializing?: Promise<void>;
		$invisiParticles?: () => void;
	}
	const AOS: { init(options?: Record<string, unknown>): void };
}
