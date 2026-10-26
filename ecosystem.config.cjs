module.exports = {
	apps: [
		{
			name: 'invisiproxy',
			cwd: __dirname,
			script: './dist/server.js',
			interpreter: process.execPath,
			exec_mode: 'fork',
			instances: 1,
			autorestart: true,
			watch: false,
			restart_delay: 3000,
			kill_timeout: 5000,
			time: true,
			cron_restart: '0 */6 * * *',
			env: {
				NODE_ENV: 'production',
			},
		},
	],
};
