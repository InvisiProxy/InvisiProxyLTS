import { createServer } from 'node:http';
import { Socket } from 'node:net';
import { wispurr } from 'wispurr';
import { config, serverPort, serverUrl } from '../config.ts';
import { entryPointFile } from '../constants.ts';
import { createSiteHandler } from './handler.ts';
import {
	wispPath,
	wispOptions,
	wispProxies,
	wispRegion,
	type WispRegion,
} from './wisp.ts';

const wisps = new Map<string, wispurr>([
	['', new wispurr(wispOptions)],
	...(Object.keys(wispProxies) as WispRegion[]).map(
		(region) =>
			[
				region,
				new wispurr({ ...wispOptions, proxy: wispProxies[region] }),
			] as const
	),
]);
for (const wisp of wisps.values()) await wisp.start(1);

const server = createServer(createSiteHandler()).on(
	'upgrade',
	(req, socket, head) => {
		const region = wispRegion(req.url);
		if (socket instanceof Socket && region !== null) {
			req.url = wispPath();
			wisps.get(region)?.route(req, socket, head);
		} else socket.destroy();
	}
);

let shuttingDown = false;
const stopServer = async () => {
	if (shuttingDown) return;
	shuttingDown = true;
	await Promise.all([...wisps.values()].map((wisp) => wisp.stop()));
	server.closeAllConnections();
	server.close();
};
process.once('SIGTERM', () => void stopServer());
process.once('SIGINT', () => void stopServer());
process.once('exit', () => {
	for (const wisp of wisps.values()) if (wisp.isRunning) wisp.kill();
});

server.listen(serverPort, '0.0.0.0', () => {
	process.send?.({ type: 'ready' });
	console.log(`InvisiProxy is listening on port ${serverPort}.`);
	console.log(
		'When hosting with a reverse proxy please ensure you are using NGINX only.\nCaddy and Apache have security risks due to wispurr and loopbacks. Please configure them correctly.\nNGINX is recommended and used for production. Ports are whitelisted and security is maintained with NGINX only.'
	);
	if (config.disguiseFiles)
		console.log(
			`disguiseFiles is enabled. The site root now serves the entry point (views/dist/${entryPointFile}), which unlocks the page loader.`
		);
});
