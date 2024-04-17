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
		populates: {}
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
				ctx.params.createddAt = new Date();
				ctx.params.updatedAt = null;
				ctx.params.user = new ObjectId(ctx.meta.userID);
				ctx.params.status = true;
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		},
		after: {
			create: [
				// Add a new virtual field to the entity
				async function (ctx, res) {
					res.subscription_detail = await ctx.call("v1.package.get", {"id": ctx.meta.user.subscription});
					await this.entityChanged("created", res, ctx);
					return res;
				},
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
			async handler(ctx) {
				const entity = ctx.params;
				const subscription_expire_At = ctx.meta.user.subscription_expire;
				console.log(subscription_expire_At);
				const subscription_detail = await ctx.call("v1.package.get", {"id": ctx.meta.user.subscription.toString()});
				const screens_count = await ctx.call("v1.screen.count_for_me");
				console.log("screens_count", screens_count);
				if (screens_count >= subscription_detail.serial_count) {
					throw new MoleculerClientError("You can't add more screen", 400, "", [{
						field: "Screen.Count",
						message: "more screen than subscription"
					}]);
				}

				const doc = await this.adapter.insert(ctx.params);
				const screen = await this.transformEntity(ctx, doc);
				await this.broker.broadcast("screen.created", {screen: doc, user: ctx.meta.user}, ["mail"]);

				return screen;
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
				console.log(ctx.meta.user._id,res.length);
				return res.length;
			}
		},
		list: {
			auth: "required",
			async handler(ctx) {
				return await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
			}
		},
		insert: false,
		update: false,
		remove: false,
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
		}
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
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
