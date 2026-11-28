import { createServer } from 'node:http';
import { Socket } from 'node:net';
import { config, serverPort } from '../config.ts';
import { entryPointFile } from '../constants.ts';
import type { Relay } from 'dlpcc';
import {
	type FinalwispInstances,
	startFinalwispInstances,
	stopFinalwispInstances,
} from './finalwisp.ts';
import { startDlpcc, withDlpcc } from './dlpcc.ts';
import { createSiteHandler } from './handler.ts';
import { fromOwnSite, wispRegion } from './wisp.ts';

// manageWisp (default): this process runs the finalwisp instances. The
// nginx + pm2 setup replaces it; see FINALWISP.md.
const manageWisp = config.manageWisp !== false;
const wisps: FinalwispInstances = manageWisp
	? await startFinalwispInstances()
	: new Map();

let relay: Relay | null = null;
const server = createServer(withDlpcc(() => relay, createSiteHandler())).on(
	'upgrade',
	(req, socket, head) => {
		const region = wispRegion(req.url);
		if (socket instanceof Socket && region !== null && fromOwnSite(req)) {
			const wisp = wisps.get(region);
			if (wisp) return wisp.route(req, socket, head);
		}
		socket.destroy();
	}
);

let shuttingDown = false;
const stopServer = async () => {
	if (shuttingDown) return;
	shuttingDown = true;
	server.close();
	await Promise.all([stopFinalwispInstances(wisps), relay?.stop()]);
	server.closeAllConnections();
	process.exit(0);
};
process.once('SIGTERM', () => void stopServer());
process.once('SIGINT', () => void stopServer());
process.once('exit', () => {
	for (const wisp of wisps.values()) wisp.kill();
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
	if (manageWisp)
		console.log(
			'manageWisp is on: this process runs the finalwisp instances. For nginx + pm2 instead, set manageWisp to false in config.json and follow FINALWISP.md.'
		);
	console.log(
		'When hosting with a reverse proxy please ensure you are using NGINX only.\nCaddy and Apache have security risks due to loopbacks. Please configure them correctly.\nNGINX is recommended and used for production. Ports are whitelisted and security is maintained with NGINX only.'
	);
	if (config.disguiseFiles)
		console.log(
			`disguiseFiles is enabled. The site root now serves the entry point (views/dist/${entryPointFile}), which unlocks the page loader.`
		);
});
relay = await startDlpcc(server);
if (relay) console.log('DLPCC WebRTC relay is running.');
server.listen(serverPort, '0.0.0.0');
