import type { Controller, Frame } from '@mercuryworkshop/scramjet-controller';
import '@mercuryworkshop/scramjet-utils';
import '@mercuryworkshop/scramjet';

declare global {
	interface InvisiScramjet {
		controller: Controller;
		frame: Frame;
		ready: boolean;
	}

	interface Window {
		__invisiStorageDelegated?: boolean;
	}

	interface Window {
		$invisiScramjet?: InvisiScramjet;
		$invisiScramjetError?: unknown;
		$invisiScramjetInitializing?: Promise<void>;
		loadFull: typeof loadFull;
	}
	function tippy(
		target: string | Element | Element[],
		options: Record<string, unknown>
	): unknown;
	const AOS: { init(options?: Record<string, unknown>): void };
	const tsParticles: {
		load(options: {
			id: string;
			options: Record<string, unknown>;
		}): Promise<unknown>;
	};
	function loadFull(engine: typeof tsParticles): Promise<void>;
}
