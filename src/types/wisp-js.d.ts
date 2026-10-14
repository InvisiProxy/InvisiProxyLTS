declare module '@mercuryworkshop/wisp-js/server' {
	import type { IncomingMessage } from 'node:http';
	import type { Duplex } from 'node:stream';

	export const server: {
		routeRequest(request: IncomingMessage, socket: Duplex, head: Buffer): void;
		options: Record<string, unknown>;
	};

	export const logging: {
		DEBUG: number;
		INFO: number;
		WARN: number;
		ERROR: number;
		NONE: number;
		set_level(level: number): void;
	};
}
