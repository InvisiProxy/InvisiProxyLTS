import {
	createServer,
	request,
	type IncomingHttpHeaders,
	type IncomingMessage,
	type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

type Handler = (
	req: IncomingMessage,
	res: ServerResponse
) => void | Promise<void>;

export interface InjectOptions {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	remoteAddress?: string;
}

export interface InjectResponse {
	statusCode: number;
	headers: IncomingHttpHeaders;
	rawPayload: Buffer;
	body: string;
	json(): Record<string, string>;
}

const clientHeader = 'x-test-client-address';

export const testClientIp = (req: IncomingMessage) =>
	(req.headers[clientHeader] as string | undefined) ??
	req.socket.remoteAddress;

export async function serve(handler: Handler) {
	const server = createServer((req, res) => void handler(req, res));
	await new Promise<void>((resolve) =>
		server.listen(0, '127.0.0.1', resolve)
	);
	const { port } = server.address() as AddressInfo;
	const origin = `http://127.0.0.1:${port}`;

	const inject = (options: string | InjectOptions) => {
		const {
			url,
			method = 'GET',
			headers = {},
			remoteAddress,
		} = typeof options === 'string' ? { url: options } : options;
		if (remoteAddress) headers[clientHeader] = remoteAddress;
		return new Promise<InjectResponse>((resolve, reject) => {
			request(
				{ host: '127.0.0.1', port, path: url, method, headers },
				(res) => {
					const chunks: Buffer[] = [];
					res.on('data', (chunk) => chunks.push(chunk));
					res.on('end', () => {
						const rawPayload = Buffer.concat(chunks);
						const body = rawPayload.toString();
						resolve({
							statusCode: res.statusCode ?? 0,
							headers: res.headers,
							rawPayload,
							body,
							json: () => JSON.parse(body),
						});
					});
					res.on('error', reject);
				}
			)
				.on('error', reject)
				.end();
		});
	};

	return {
		origin,
		inject,
		close: () =>
			new Promise<void>((resolve) => {
				server.closeAllConnections();
				server.close(() => resolve());
			}),
	};
}
