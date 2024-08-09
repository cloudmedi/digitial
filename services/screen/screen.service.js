"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const {offer} = require("../../lib/ripple-0.22.0");
const _ = require("lodash");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "screen",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("screens"),
		CacheCleanerMixin([
			"cache.clean.screens",
			"screens"
		])],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"device",
			"source",
			"name",
			"direction",
			"serial",
			"place",
			"status"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			name: "string",
			serial: "string",
			direction: "string",
			place: "string"
		},
		populates: {
			user: {
				action: "users.get"
			},
			device: {
				action: "v1.device.get"
			},
			source: {
				action: "v1.source.get"
			}
		}
	},

	/**
	 * Action Hooks
	 */
	hooks: {
		before: {
			/**
			 * Register a before hook for the `create` action.
			 * It sets a default value for the quantity field.
			 *
			 * @param {Context} ctx
			 */
			create(ctx) {
				ctx.params.createdAt = new Date();
				ctx.params.updatedAt = new Date();
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.status = true;
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		},
		after: {
			create: [
				// Add a new virtual field to the entity

				// Populate the `referrer` field
				/*
				async function (ctx, res) {
					if (res.referrer)
						res.referrer = await ctx.call("users.get", { id: res._id });

					return res;
				}
				 */
			]
		}
	},
	events: {
		// Subscribe to `user.created` event
		"source.removed"(data) {
			this.adapter.updateMany({source: new ObjectId(data.source)}, {
				$set: {
					source: null
				}
			});
		},
		// Subscribe to all internal events
		/*
		"$**"(payload, sender, event) {
			console.log(`Event '${event}' received from ${sender} node:`, payload);
		}
		 */
	},
	/**
	 * Actions
	 */
	actions: {
		create: {
			auth: "required",
			hooks: {
				after(ctx, res) {
					return ctx.call("v1.package.get", {"id": ctx.meta.user.subscription}).then((detail) => {
						res.subscription_detail = detail;
						return res;
					});
				},
			},
			async handler(ctx) {
				const entity = ctx.params;
				const subscription_expire_At = ctx.meta.user.subscription_expire;
				console.log("expire", subscription_expire_At);

				const subscription_detail = await ctx.call("v1.package.get", {"id": ctx.meta.user.subscription.toString()});
				const screens_count = await ctx.call("v1.screen.count_for_me");
				if (screens_count >= subscription_detail.serial_count) {
					throw new MoleculerClientError("You can't add more screen", 400, "", [{
						field: "Screen.Count",
						message: "more screen than subscription"
					}]);
				}

				const check_serial = await ctx.call("v1.device.check_serial", {serial: entity.serial});
				const is_device_connected_screen = await this.adapter.findOne({serial: entity.serial});
				if (is_device_connected_screen) {
					throw new MoleculerClientError("This serial number used before", 400, "", [{
						field: "Screen.Serial",
						message: "This serial number used before"
					}]);
				}

				if (check_serial.status === true) {
					const device = await ctx.call("v1.device.get_device_by_seraial", {serial: entity.serial});
					ctx.params.device = new ObjectId(device._id);
					const doc = await this.adapter.insert(ctx.params);
					const screen = await this.transformEntity(ctx, doc);
					await this.broker.broadcast("screen.created", {screen: doc, user: ctx.meta.user}, ["mail"]);

					await this.entityChanged("updated", screen, ctx);

					return screen;
				} else {
					throw new MoleculerClientError(check_serial.message, 400, "", [{
						field: "Screen.Serial",
						message: check_serial.message
					}]);
				}
			}
		},
		count_for_me: {
			auth: "required",
			/*
			cache: {
				keys: ["#userID"],
				ttl: 60 * 60 * 24 * 1 // 1 day
			},
			* */
			async handler(ctx) {
				const res = await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
				//console.log(ctx.meta.user._id, res.length);
				return res.length;
			}
		},
		list: {
			auth: "required",
			cache: false /*{
				keys: ["#userID"],
				ttl: 60 * 5  // 5 minutes
			}*/,
			params: {
				limit: {type: "string", required: false, default: "25"},
				page: {type: "string", required: false, default: "1"},
			},
			async handler(ctx) {
				return await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});

				/*
				const limit = Number(ctx.params.limit);
				const page = Number(ctx.params.page) - 1;
				const offset = limit * page;

				let screens = await this.adapter.find({
					query: {user: new ObjectId(ctx.meta.user._id)},
					limit: limit,
					offset: offset
				});

				let total = await this.adapter.count({
					query: {user: new ObjectId(ctx.meta.user._id)}
				});

				let screen_copy = await Promise.all(screens.map(async (screen) => {
					const device_status = await this.broker.cacher.get(`device:status:${screen._id}`) ?? "offline";
					return { ...screen, device_status };
				}));

				const total_page = Math.round(total / limit);
				return {
					limit: limit,
					page: page + 1,
					total_page: total_page,
					rows: [...screen_copy]
				};*/
			}
		},
		is_serial_binded: {
			params: {
				serial: "string"
			},
			async handler(ctx) {
				const screen = await this.adapter.findOne({serial: ctx.params.serial});
				return !!screen;
			}
		},
		findByName: {
			rest: "POST /search",
			auth: "required",
			/*visibility: "protected",*/
			params: {
				"name": "string|required|min:3"
			},
			async handler(ctx) {
				const screens = await this.adapter.findOne({name: ctx.params.name});
				let doc = this.transformEntity(ctx, screens);
				if (doc) {
					return doc;
				}
			}
		},
		findByDeviceSerial: {
			rest: "POST /find_by_device_serial",
			cache: false,
			params: {
				serial: "string"
			},
			async handler(ctx) {
				const serial = ctx.params.serial;

				const doc = await this.adapter.findOne({serial});
				const screen = await this.transformDocuments(ctx, {populate: ["user", "device", "source"]}, doc);
				return screen;
			}
		},
		"add.source": {
			rest: "POST /add/source",
			cache: false,
			params: {
				screens: {type: "array"},
				source: {type: "string"}
			},
			async handler(ctx) {
				/* entity */
				const e = ctx.params;
				for (const screen of e.screens) {
					const screen_detail = await ctx.call("v1.screen.update", {
						id: screen,
						source: new ObjectId(e.source)
					});

					const screen_full_detail = await this.broker.call("v1.screen.findByDeviceSerial", {serial: screen_detail.serial});
					try {
						console.log(`device-${screen_full_detail.device._id}`);

						await this.broker.call("io.broadcast", {
							namespace: "/", //optional
							event: "device",
							args: [screen_full_detail], //optional
							volatile: false, //optional
							local: false, //optional
							rooms: [`device-${screen_full_detail.device._id}`] //optional
						});
					} catch (e) {
						console.log(e);
					}

				}
				return {status: true, message: "Screen content published"};
			}
		},
		update: {
			auth: "required",
		},
		insert: false,
		remove: {
			auth: "required",
			params: {
				id: "string"
			},
			async handler(ctx) {
				const doc = await this.adapter.findOne({
					_id: new ObjectId(ctx.params.id),
					user: new ObjectId(ctx.meta.user._id)
				});
				const screen = await this.transformDocuments(ctx, {populate: ["user", "device", "source"]}, doc);

				if (screen) {
					if (screen.device) {
						await this.broker.call("v1.device.status", {
							serial: screen.device.serial,
							state: "deleting"
						});

						await ctx.call("v1.device.remove", {id: screen.device._id});

						await this.broker.call("v1.device.status", {
							serial: screen.device.serial,
							state: "offline"
						});
					}

					/*if (screen.source) {
						await ctx.call("v1.source.remove", {id: screen.source._id});
					}*/

					await this.adapter.removeById(screen._id);

					await this.broker.broadcast("screen.removed", {screen: doc, user: ctx.meta.user}, ["mail"]);

					return {status: true, message: "Screen removed successfully", id: screen._id};

				} else {
					throw new MoleculerClientError("Restricted access ", 400, "Unauthorized", [{
						field: "Screen",
						message: "Restricted access"
					}]);
				}
			}
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Find an wallet by user
		 *
		 * @param {String} user - Article slug
		 *
		 * @results {Object} Promise<Article
		 */
		findByUser(user) {
			return this.adapter.findOne({user});
		},

		/**
		 * Transform the result entities to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Array} entities
		 * @param {Object} user - Logged in user
		 */
		async transformResult(ctx, entities, user) {
			if (Array.isArray(entities)) {
				const currency = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					currency
				};
			} else {
				const currency = await this.transformEntity(ctx, entities);
				return {currency};
			}
		},

		/**
		 * Transform a result entity to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Object} entity
		 * @param {Object} user - Logged in user
		 */
		async transformEntity(ctx, entity) {
			if (!entity) return null;

			return entity;
		},
		/**
		 * Loading sample data to the collection.
		 * It is called in the DB.mixin after the database
		 * connection establishing & the collection is empty.
		 */
		async seedDB() {
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		//await this.adapter.collection.createIndex({ name: 1 });
	}
};
