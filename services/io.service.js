"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const _ = require("lodash");
const SocketIOService = require("moleculer-io");
const ApiGateway = require("moleculer-web");
const {UnAuthorizedError} = ApiGateway.Errors;
const config = require("config");
const {ObjectId} = require("mongodb");
const moment = require("moment");
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
								"users.ping",
								"users.me",
								"v1.package.list",
								"v1.screen.list",
								"room.*",
								"v1.device.check_serial",
								"v1.device.status"
							],
							onBeforeCall: async function (ctx, socket, action, params, callOptions) { //before hook
								this.logger.info("before socket hook");
							},
							onAfterCall: async function (ctx, socket, res) { //after hook
								ctx.meta.$join = ctx.meta.user._id.toString();

								return {
									data: res,
									status: 200,
									message: "ok"
								};
								// res: The respose data.
							}
						},
						"disconnect": {
							async handler(socket) {
								console.log(socket.client.id);
								console.log("disconnect");
								process.exit();
							}
						}
					}
				}
			}

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
	/**
	 * Events
	 */
	events: {
		// Subscribe to `user.created` event
		async "user.joined"(data) {
			/**
			 * @todo: burada sokete bağlanan kullanıcıya ilk gönderilecek veriler gönderilir.
			 * */

			setTimeout(() => {
				this.broker.call("io.broadcast", {
					namespace: "/", //optional
					event: "joined",
					args: ["user", data.user], //optional
					volatile: false, //optional
					local: false, //optional
					rooms: ["lobby", `user-${data.user._id}`] //optional
				});
			}, 1000);
		},
	},
	actions: { // Write your actions here!

	},
	methods: {
		async socketAuthorize(socket, eventHandler) {
			let accessToken = socket.handshake.query.token;
			if (accessToken) {
				try {
					/**
					 * @description: token 16 haneden küçükse device serialdir.
					 * */
					if (accessToken.length < 16) {
						const screen = await this.checkDevice(accessToken);
						try {
							socket.client.user = null;
							socket.client.device = screen;
							const device_private_channel = `device-${screen.device._id}`;
							const all_devices_of_user_channel = `user-${screen.user._id}-devices`;
							// Cihaza özel mesajlar
							socket.join(device_private_channel);

							// kullanıcının tüm cihazlarının olduğu kanal
							socket.join(all_devices_of_user_channel);

							await this.broker.call("io.broadcast", {
								namespace: "/", //optional
								event: "device",
								args: ["device", screen], //optional
								volatile: false, //optional
								local: false, //optional
								rooms: [device_private_channel] //optional
							});

							await this.broker.call("v1.device.status", {
								serial: accessToken,
								state: "online"
							});

							socket.emit("device", screen);

						} catch (e) {
							console.log(e);
						}

						return screen;
					}
				} catch (e) {
					console.log(e);
				}

				let user = await this.broker.call("users.resolveToken", {token: accessToken});
				if (user) {
					let filtered_user = _.pick(user, ["_id", "username", "email", "image"]);
					filtered_user.token = accessToken;

					const user_private_room = `user-${filtered_user._id}`;

					socket.client.user = filtered_user;

					console.log("private room: ", `${user_private_room}`);

					// Herkese gidecek mesajlar
					socket.join("lobby");

					// Kullanıcıya Özel Gidecek Mesajlar
					socket.join(`${user_private_room}`);

					// Kullanıcının Cihazlarına gidecek ve cihazdan gelecek mesajlar için
					socket.join(`user-${filtered_user._id}-devices`);
					/*console.log(socket.rooms);*/
					//await this.broker.call("room.join", {room: user_private_room});

					//ctx.meta.$join = ctx.params.room;
					await this.broker.call("io.broadcast", {
						namespace: "/", //optional
						event: "hello",
						args: ["user", "Joined", "!"], //optional
						volatile: false, //optional
						local: false, //optional
						rooms: ["lobby"] //optional , `user-${filtered_user._id}-devices`
					});
					console.log("welcome " + filtered_user.username, socket.id);

					try {
						await this.broker.broadcast("user.joined", {user: filtered_user});
					} catch (e) {
						console.log(e);
					}

					return filtered_user;
				} else {
					throw new UnAuthorizedError();
				}

			} else {
				// anonymous user
				return;
			}
		},
		async checkDevice(serial) {
			if (serial.length < 16) {
				console.log(serial);
				const device = await this.broker.call("v1.screen.findByDeviceSerial", {serial: serial});
				//this.logger.info(device);
				if (device) {
					return device;
				} else {
					throw new MoleculerClientError("This Device haven't Recognized", 404, "", [{
						field: "device",
						message: "Not found"
					}]);
				}
			}

			return true;
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
		},
		listIOHandlers() {
			return this.settings.io.handlers;
		},
	}
};
