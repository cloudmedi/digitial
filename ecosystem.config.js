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
			args: "services/_partial/country.service.js services/_partial/currency.service.js services/_partial/ip_location.service.js",
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
		}
	]
};
