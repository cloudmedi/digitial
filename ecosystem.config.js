module.exports = {
	apps: [
		{
			name: "apibase",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/api.service.js services/io.service.js services/room.service.js services/lab.service.js services/profile.service.js services/room.service.js services/users.service.js services/wallet.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "apibase"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "apibase"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-apibase"
			}
		},
		{
			name: "partials",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/_partial/currency.service.js services/_partial/ip_location.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "partials"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "partials"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-partials"
			}
		},
		{
			name: "admin",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/admin/country.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "admin"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "admin"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-admin"
			}
		},
		{
			name: "screens",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/screen/screen.service.js services/screen/device.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "screens"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "screens"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-screens"
			}
		},
		{
			name: "package",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/package/packages.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "package"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "package"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-package"
			}
		},
		{
			name: "email",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/email/email.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "email"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "email"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-email"
			}
		},
		{
			name: "source",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/source/source.service.js services/source/layout.service.js services/source/channel.service.js services/source/playlist.service.js services/source/program.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "source"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "source"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-source"
			}
		},
		{
			name: "widget",
			script: "./node_modules/.bin/moleculer-runner",
			args: "services/widget/widget.service.js services/widget/filemanager.service.js services/widget/module/image.service.js services/widget/module/video.service.js services/widget/module/instagram.service.js",
			exec_mode: "cluster",
			instances: 1,
			env: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "widget"
			},
			env_production: {
				NODE_ENV: "production",
				LAB_PORT: 3211,
				NODE_ID: "widget"
			},
			env_development: {
				NODE_ENV: "development",
				LAB_PORT: 3211,
				NODE_ID: "dev-widget"
			}
		}
	]
};
