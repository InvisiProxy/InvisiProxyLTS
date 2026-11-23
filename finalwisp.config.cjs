// finalwisp.config.cjs: pm2 apps for finalwisp, one per region.
// Start: pm2 start finalwisp.config.cjs
//
// The shared settings (policy, limits, dns) come from /etc/finalwisp/common.conf,
// generated from config.json by scripts/finalwisp-config.ts. The instances only
// add --port and --upstream here; ports must match the finalwispRegions table in
// src/server/wisp.ts and scripts/wisp-nginx.ts. See FINALWISP.md.
const path = require('node:path');

// The site reads PATREON_PROXY from .env; read the same file here (Node 20.12+)
try {
	process.loadEnvFile(path.join(__dirname, '.env'));
} catch (error) {
	if (error.code !== 'ENOENT') throw error;
}

const bin = process.env.FINALWISP_BIN || '/usr/local/bin/finalwisp';
const common = [
	'--config',
	process.env.FINALWISP_COMMON_CONF || '/etc/finalwisp/common.conf',
];

// Each instance runs in its own cgroup with this memory limit, which finalwisp
// takes as its budget. Five instances x MEMORY_MAX should stay under about 60 %
// of RAM. Needs systemd and pm2 as root; as a normal user add '--user' after
// '--scope' (the memory controller must be delegated to your user session).
const MEMORY_MAX = '2G';
const scope = () => ['--scope', '--quiet', '-p', `MemoryMax=${MEMORY_MAX}`, bin];

// socks5:// has finalwisp resolve and check the name on this server;
// socks5h:// leaves that to the proxy (Tor needs it for .onion).
// If PATREON_PROXY holds a user:password, put it in a private config file
// instead of the command line (ps shows it).
const regions = {
	default: [6001, null, []],
	tor: [6002, 'socks5h://127.0.0.1:9050', ['--connect-timeout', '30', '--dns-threads', '2']],
	eu: [6003, 'socks5://127.0.0.1:7000', ['--dns-threads', '4']],
	jp: [6004, 'socks5://127.0.0.1:7001', ['--dns-threads', '4']],
	patreon: [6005, process.env.PATREON_PROXY || 'socks5://127.0.0.1:7002', ['--dns-threads', '4']],
};
const trustDns = (upstream) =>
	upstream && upstream.startsWith('socks5h://') ? ['--upstream-trust-dns'] : [];

module.exports = {
	apps: Object.entries(regions).map(([name, [port, upstream, extra]]) => ({
		name: `finalwisp-${name}`,
		script: 'systemd-run',
		interpreter: 'none',
		args: [
			...scope(),
			...common,
			'--port',
			String(port),
			...(upstream ? ['--upstream', upstream, ...trustDns(upstream)] : []),
			...extra,
		],
		exec_mode: 'fork',
		instances: 1,
		autorestart: true,
		restart_delay: 1000,
		// pm2 stops with SIGINT; finalwisp then drains for up to 30 s
		// (--drain-timeout) and exits <= 2 s later
		kill_timeout: 35000,
		time: true,
	})),
};
