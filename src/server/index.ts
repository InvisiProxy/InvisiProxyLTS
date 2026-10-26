import { createServer } from 'node:http';
import { Socket } from 'node:net';
import { config, serverPort } from '../config.ts';
import { entryPointFile } from '../constants.ts';
import { createSiteHandler } from './handler.ts';
import {
	fromOwnSite,
	wispPath,
	wispOptions,
	wispProxies,
	wispRegion,
	wispRegions,
} from './wisp.ts';
import {
	forgetWorkers,
	reapOrphanedWorkers,
	recordWorkers,
	SupervisedWisp,
} from './wisp-supervisor.ts';

reapOrphanedWorkers();
const recordAll = () =>
	recordWorkers([...wisps.values()].flatMap((wisp) => wisp.pids));
const wisps = new Map<string, SupervisedWisp>([
	['', new SupervisedWisp('default', wispOptions, recordAll)],
	...wispRegions.map(
		(region) =>
			[
				region,
				new SupervisedWisp(
					region,
					{ ...wispOptions, proxy: wispProxies[region] },
					recordAll
				),
			] as const
	),
]);

const server = createServer(createSiteHandler()).on(
	'upgrade',
	(req, socket, head) => {
		const region = wispRegion(req.url);
		if (socket instanceof Socket && region !== null && fromOwnSite(req)) {
			req.url = wispPath();
			wisps.get(region)?.route(req, socket, head);
		} else socket.destroy();
	}
);

let shuttingDown = false;
const stopServer = async () => {
	if (shuttingDown) return;
	shuttingDown = true;
	server.close();
	await Promise.all([...wisps.values()].map((wisp) => wisp.stop()));
	server.closeAllConnections();
	process.exit(0);
};
process.once('SIGTERM', () => void stopServer());
process.once('SIGINT', () => void stopServer());
process.once('exit', () => {
	for (const wisp of wisps.values()) wisp.kill();
	forgetWorkers();
});

let listenAttempts = 0;
server.on('error', (error: NodeJS.ErrnoException) => {
	if (error.code !== 'EADDRINUSE' || ++listenAttempts > 10) throw error;
	console.error(`Port ${serverPort} is still in use, retrying.`);
	setTimeout(() => server.listen(serverPort, '0.0.0.0'), 1000);
});
server.once('listening', () => {
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
server.listen(serverPort, '0.0.0.0');
