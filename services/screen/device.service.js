"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const crypto = require('crypto');

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "device",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("devices"),
		CacheCleanerMixin([
			"cache.clean.devices",
			"devices"
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
			"screen",
			"fingerprint",
			"serial",
			"meta",
			"status"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			fingerprint: "string",
			meta: "string"
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
				ctx.params.status = true;
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		},
		after: {
			create: [
				// Add a new virtual field to the entity
				/*async function (ctx, res) {

				},*/
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
		pre_create: {
			rest: "POST /pre_create",
			params: {
				fingerprint: {type: "string", required: true},
				meta: {type: "object", required:true}
			},
			async handler(ctx){
				const entity = ctx.params;
				const serial_number_first_part = crypto.randomBytes(2).toString("hex");
				const serial_number_second_part = crypto.randomBytes(2).toString("hex");
				const serial = `${serial_number_first_part}-${serial_number_second_part}`;

				const device_data = {...entity, serial};

				await this.broker.cacher.set(`new_device:${entity.serial}`, device_data, 60);

				return await this.transformDocuments(ctx, device_data, device_data);
			}
		},
		create: {
			auth: "required",
			async handler(ctx) {
				const entity = ctx.params;

				return {entity};
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
