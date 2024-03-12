"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");
const {ObjectId} = require("mongodb");
const Promise = require("lodash/_Promise");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "profile",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("user_profiles"),
		CacheCleanerMixin([
			"cache.clean.user_profiles",
		])],
	whitelist: [
		"profile.list",
		"profile.get",
		"profile.getWUser",
	],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"birthdate",
			"skype",
			"image",
			"address",
			"country",
			"postcode",
			"city",
			"status"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			user: {type: "object"},
			birthdate: {type: "date", convert: true},
			skype: {type: "string"},
			image: {type: "string"},
			address: {type: "string"},
			country: {type: "string"},
			city: {type: "string"},
			postcode: {type: "string"},
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
				ctx.params.status = true;
				ctx.params.user = new ObjectId(ctx.meta.user._id);
			},
			update(ctx) {
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.updatedAt = new Date();
			}
		}
	},
	/**
	 * Actions
	 */
	actions: {
		getWUser: {
			rest: "POST /user",
			auth: "required",
			/*cache: {
				keys: ["user"],
				ttl: 60 * 60 // 1 hour
			},*/
			params: {
				user: {type: "string"}
			},
			async handler(ctx) {
				const user = new ObjectId(ctx.params.user);
				const doc = await this.adapter.findOne({user});
				const json = await this.transformDocuments(ctx, {populate: ["user"]}, doc);

				return json;
			}
		},
		get: false,
		list: false,
		create: {
			auth: "required",
			async handler(ctx){
				const entity = ctx.params;
				await this.validateEntity(entity);
				const profile_check = await this.adapter.findOne({user: entity.user});
				if(profile_check) {
					entity.updatedAt = new Date();
					delete ctx.params.createdAt;
					const profile = await this.adapter.updateById(profile_check._id.toString(), {$set: entity});
					await this.entityChanged("updated", profile, ctx);
					return profile;
				} else {
					const profile = await this.adapter.insert(entity);
					await this.entityChanged("created", profile, ctx);
					return profile;
				}
			}

		},
		find: false,
		count: false,
		insert: false,
		update: {},
		remove: false
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Transform the result entities to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Array} entities
		 * @param {Object} user - Logged in user
		 */
		async transformResult(ctx, entities, user) {
			if (Array.isArray(entities)) {
				const user_profiles = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					user_profiles
				};
			} else {
				const user_profiles = await this.transformEntity(ctx, entities, user);
				return {user_profiles};
			}
		},

		/**
		 * Transform a result entity to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Object} entity
		 * @param {Object} user - Logged in user
		 */
		async transformEntity(ctx, entity, user) {
			if (!entity) return null;

			return entity;
		},
		/**
		 * Loading sample data to the collection.
		 * It is called in the DB.mixin after the database
		 * connection establishing & the collection is empty.
		 */
		async seedDB() {
			/*const accommodations = require("../../data/user_profiles.json");
			await this.adapter.insertMany(accommodations);*/
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
