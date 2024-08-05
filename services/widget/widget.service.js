"use strict";

const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const {MoleculerClientError} = require("moleculer").Errors;

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widgets")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"icon",
			"name",
			"slug",
			"has_file",
			"provider",
			"service"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			name: "string",
			slug: "string"
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
		properties: {
			rest: "POST properties",
			auth: "required",
			params: {
				widget: {type: "string"}
			},
			async handler(ctx) {
				const entity = ctx.params;

				const check_module = await this.adapter.findOne({_id: new ObjectId(entity.widget)});
				if(check_module) {
					return await ctx.call(`v1.widget.${check_module.slug}.properties`);
				} else {
					return "non";
				}
			}
		},
		list: {
			auth: "required",
		},
		get: {
			auth: "required",
		},
		create: false,
		count: false,
		insert: false,
		update: false,
		remove: {
			auth: "required",
			params: {
				widget: {type: "string"},
				id: {type: "string"}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const check_module = await this.adapter.findOne({_id: new ObjectId(entity.widget)});
				if(check_module) {
					console.log(entity.id);
					return await ctx.call(`v1.widget.${check_module.slug}.remove`, {id: entity.id});
				} else {
					throw new MoleculerClientError("There is no widget like you want ", 404, "no-content", [{
						field: "Widget.*.remove",
						message: "Restricted access"
					}]);
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
			const data = [
				{icon: "fa-picture", name: "image", slug: "image", provider: "local", service: "image", has_file: true, meta: {}},
				{icon: "fa-video", name: "video", slug: "video", provider: "local", service: "video", has_file: true, meta: {}},
				{icon: "fa-instagram", name: "instagram", slug: "instagram", provider: "local", service: "instagram", has_file: false, meta: {}},
				{icon: "fa-clock", name: "time", slug: "time", provider: "local", service: "time", has_file: false, meta: {}},
				{icon: "fa-youtube", name: "youtube", slug: "youtube", provider: "local", service: "youtube", has_file: false, meta: {}}
			];
			await this.adapter.insertMany(data);
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		/*await this.adapter.collection.createIndex({ user: 1 });*/
	}
};
