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
	name: "source",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("sources"),
		CacheCleanerMixin([
			"cache.clean.sources",
			"sources"
		])],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"name",
			"source_type",
			"layout",
			"content",
			"createdAt",
			"updatedAt",
			"status"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			name: "string",
			source_type: "string",
			source_meta: "object"
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
				ctx.params.createdAt = new Date();
				ctx.params.updatedAt = new Date();
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.status = true;
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		}
	},

	/**
	 * Actions
	 */
	actions: {
		create: {
			auth: "required",
			params: {
				layout: "string",
				name: "string",
				source_type: "string"
			},
			async handler(ctx) {
				const entity = ctx.params;

				// @todo: check screen
				// @todo: check screen has device
				// @todo: check screen has source
				ctx.params.layout = await ctx.call("v1.source.layout.get", {id: entity.layout});

				const new_source = await this.adapter.insert(ctx.params);
				await this.entityChanged("updated", new_source, ctx);
				return new_source;
			}
		},
		list: {
			auth: "required",
			cache: {
				keys: ["#userID"],
				ttl: 60 * 5  // 5 minutes
			},
			async handler(ctx) {
				if(!ctx.meta.user) {
					return [];
				}

				let limit = 20;
				let offset = 0;

				const entities = await this.adapter.find({
					sort: {createdAt: -1},
					limit: limit,
					offset: offset,
					query: {user: new ObjectId(ctx.meta.user._id)}
				});

				return await this.transformResult(ctx, entities, ctx.meta.user);
			}
		},
		count: false,
		insert: false,
		update: {
			auth: "required",
		},
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
				const source = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					source
				};
			} else {
				const source = await this.transformEntity(ctx, entities);
				return {source};
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
