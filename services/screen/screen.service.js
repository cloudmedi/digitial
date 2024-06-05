"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");

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
					//await this.entityChanged("created", res, ctx);

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
			cache: {
				keys: ["#userID"],
				ttl: 60 * 5  // 5 minutes
			},
			async handler(ctx) {
				return await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
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
				console.log(serial);
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
					const screen_detail = await ctx.call("v1.screen.update", {id: screen, source: new ObjectId(e.source)});

					const screen_full_detail = await this.broker.call("v1.screen.findByDeviceSerial", {serial: screen_detail.serial});
					console.log(screen_full_detail);
					try {
						console.log(screen, `device-${screen_full_detail.device._id}`);

						await this.broker.call("io.broadcast", {
							namespace: "/", //optional
							event: "device",
							args: [screen_full_detail], //optional
							volatile: false, //optional
							local: false, //optional
							rooms: [`device-${screen_full_detail.device._id}`, `user-${screen_full_detail.user._id}`] //optional
						});
					} catch (e) {
						console.log(e);
					}

				}
				return {status: true, message: "Screen content published"};
			}
		},
		update: {
			visibility: "protected"
		},
		insert: false,
		remove: false,
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
