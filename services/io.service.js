"use strict";

const _ = require("lodash");
const SocketIOService = require("moleculer-io");
const ApiGateway = require("moleculer-web");
const {UnAuthorizedError} = ApiGateway.Errors;
const config = require("config");
const {SocketMoleculerIO} = require("moleculer-io");
const RedisConfig = config.get("REDIS");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 * @typedef {import("http").IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import("http").ServerResponse} ServerResponse HTTP Server Response
 */

module.exports = {
	name: "io",
	mixins: [SocketIOService],

	// More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
	settings: {
		// Exposed port
		port: process.env.SOCKET_PORT || config.get("SOCKET_PORT") || 3000,

		// Exposed IP
		ip: "0.0.0.0",
		server: true,
		logClientConnection: "warn",

		cors: {
			// Configures the Access-Control-Allow-Origin CORS header.
			origin: "*",
			// Configures the Access-Control-Allow-Methods CORS header.
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			// Configures the Access-Control-Allow-Headers CORS header.
			allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
			// Configures the Access-Control-Expose-Headers CORS header.
			exposedHeaders: [],
			// Configures the Access-Control-Allow-Credentials CORS header.
			credentials: false,
			// Configures the Access-Control-Max-Age CORS header.
			maxAge: 3600
		},
		io: {
			options: {
				adapter: require("socket.io-redis")(RedisConfig)
			},
			namespaces: {
				"/": {
					fallbackResponse: (ctx, err) => {
						console.log(err);
					},
					authorization: true,
					events: {
						"call": {
							whitelist: [
								"users.me",
								"screen.list",
								"room.*",
							],
							onBeforeCall: async function (ctx, socket, action, params, callOptions) { //before hook
								this.logger.info("before socket hook");
							},
							onAfterCall: async function (ctx, socket, res) { //after hook
								this.logger.info("after socket hook");
								ctx.meta.$join = ctx.meta.user._id.toString();
								return {
									status: 200,
									message: "ok"
								};
								// res: The respose data.
							}
						}
					}
				}
			}

		},
		/**
		 * Events
		 */
		events: {
			"user.connected": {
				handler(ctx) {
					console.log("User: ",ctx.meta.user);
					console.log("event fired");
					let socket = this;
					socket.emit("hello", "world");

				}
			},
		},
		onError(req, res, err) {
			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");
			res.writeHead(err.code || 500);

			if (err.code === 422) {
				let o = {};
				err.data.forEach(e => {
					let field = e.field.split(".").pop();
					o[field] = e.message;
				});

				res.end(JSON.stringify({errors: o}, null, 2));
			} else {
				const errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
				res.end(JSON.stringify(errObj, null, 2));
			}
			this.logResponse(req, res, err ? err.ctx : null);
		}
	},
	actions: { // Write your actions here!

	},
	methods: {
		async socketAuthorize(socket, eventHandler) {
			let accessToken = socket.handshake.query.token;
			if (accessToken) {
				let user = await this.broker.call("users.resolveToken", {token: accessToken});
				if (user) {
					let filtered_user = _.pick(user, ["_id", "username", "email", "image"]);
					filtered_user.token = accessToken;
					socket.client.user = filtered_user;
					socket.join("lobby");
					await this.broker.call("io.broadcast", {
						namespace:"/", //optional
						event:"hello",
						args: ["my", "friends","!"], //optional
						volatile: false, //optional
						local: false, //optional
						rooms: ["lobby"] //optional
					});
					console.log("welcome " + filtered_user.username);

					return filtered_user;
				} else {
					throw new UnAuthorizedError();
				}

			} else {
				// anonymous user
				return;
			}
		},
		socketGetMeta(socket) {
			return {
				user: socket.client.user,
				$rooms: Object.keys(socket.rooms)
			};
		},
		socketSaveMeta(socket, ctx) {
			this.logger.info("Socket save meta for user: " + ctx.meta.user._id);
			socket.client.user = ctx.meta.user;
		}
	}
};
