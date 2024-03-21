"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "screen",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("screens")],
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
				ctx.params.user = new ObjectId(ctx.meta.user.id);
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
console.log(ctx.meta.user);
					res.subscription_detail = await ctx.call("v1.package.get", {"id": ctx.meta.user.subscription});

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
		list: {
			auth: "required",
			async handler(ctx) {
				return await this.adapter.findOne({user: ctx.params.user});
			}
		},
		count: false,
		insert: false,
		update: false,
		remove: false
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
