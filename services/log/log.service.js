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
	name: "log",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("logs"),
		CacheCleanerMixin([
			"cache.clean.logs",
			"logs"
		])],
	whitelist: ["io"],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"module",
			"action",
			"meta",
			"createdAt"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			module: "string",
			action: "string",
			meta: "object",
		},
		populates: {
			user: {
				action: "users.get"
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
				ctx.params.user = new ObjectId(ctx.meta.user._id);
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		}
	},
	events: {

	},
	/**
	 * Actions
	 */
	actions: {
		create: {
			auth: "required",
			params: {
				module: "string",
				action: "string",
				meta: "object",
			},
			async handler(ctx) {
				const entity = ctx.params;

				return await this.adapter.insert({...entity});
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

				const total_page = Math.round(total / limit);
				return {
					limit: limit,
					page: page + 1,
					total_page: total_page,
					rows: [...screens]
				};
			}
		},
		"add.log": {
			rest: "POST /add",
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

						await this.broker.call("v1.device.status", {
							serial: screen.device.serial,
							state: "offline"
						});

						await ctx.call("v1.device.remove", {id: screen.device._id});
					}
					if (screen.source) {
						await ctx.call("v1.source.remove", {id: screen.source._id});
					}

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
