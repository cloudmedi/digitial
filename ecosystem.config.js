module.exports = {
	apps: [
		{
			name: "signage-apibase",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/api.service.js services/io.service.js services/lab.service.js services/profile.service.js services/room.service.js services/users.service.js services/wallet.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-apibase"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-apibase"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-apibase"
			}
		},
		{
			name: "signage-partials",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/_partial/currency.service.js services/_partial/ip_location.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-partials"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-partials"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-partials"
			}
		},
		{
			name: "signage-admin",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/admin/country.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-admin"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-admin"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-admin"
			}
		},
		{
			name: "signage-screens",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/screen/screen.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-screens"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-screens"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-screens"
			}
		},
		{
			name: "signage-package",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/package/packages.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-package"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-package"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-package"
			}
		},
		{
			name: "signage-email",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/email/email.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-email"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-email"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-email"
			}
		},
		{
			name: "signage-source",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/source/source.service.js services/source/channel.service.js services/source/playlist.service.js services/source/program.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-source"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "signage-source"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "signage-dev-source"
			}
		}
	]
};
