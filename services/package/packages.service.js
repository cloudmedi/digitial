"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const {ObjectId} = require("mongodb");
const _ = require("lodash");
const moment = require("moment/moment");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "package",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("packages"),
		CacheCleanerMixin([
			"cache.clean.packages",
		])],
	whitelist: [
		"package.list",
		"package.get",
	],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"name",
			"description",
			"old_price",
			"price",
			"annual_discount",
			"serial_count",
			"is_trial",
			"trial_days",
			"package_properties",
			"order",
			"status",
			"updatedAt",
			"createdAt"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {},
		populates: {},
	},

	events: {
		// Subscribe to `user.created` event
		"user.created"(user) {
			//console.log("User created:", user);
			this.broker.call("v1.package.getTrialPackage").then((res) => {
				const package_info = res.data;
				this.broker.call("users.update", {
					"id": user.user._id,
					subscription: new ObjectId(package_info.packages._id),
					subscription_expire: new Date(moment(new Date()).add(package_info.packages.trial_days, "days").toDate())
				}).then((updated_user => {
					this.broker.broadcast("user.subscribed", {user, subscription: {...package_info}}, ["email"]);
				}));
			});
		},

		// Subscribe to all `user` events
		"user.*"(user) {
			//console.log("User event:", user);
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
			async handler(ctx) {
				//
			}
		},
		getTrialPackage: {
			rest: "GET /trial_package",
			cache: {
				ttl: 60 * 60 * 24// 24 hour
			},
			async handler(ctx) {
				const trial_package = await this.adapter.findOne({is_trial: true, status: true});
				if (trial_package) {
					const doc = await this.transformDocuments(ctx, {}, trial_package);
					return await this.transformResult(ctx, doc, ctx.meta.user);
				} else {
					throw new MoleculerClientError("There is no active trial package", 404, "", [{
						field: "trial_package",
						message: "Not found"
					}]);
				}
			}
		},
		get: {
			auth: "required"
		},
		list: {
			auth: "required",
		},
		update: {
			auth: "required"
		},
		find: {
			auth: "required"
		},
		count: {
			auth: "required"
		},
		insert: {
			auth: "required"
		},
		remove: {
			auth: "required"
		}
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
			let output = {};
			if (Array.isArray(entities)) {
				output = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
			} else {
				const packages = await this.transformEntity(ctx, entities, user);
				output = {packages};
			}

			return {
				"service": `v${this.version}.${this.name}`,
				"message": "Success",
				"code": 200,
				"type": "single_data",
				"data": output
			};
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
			try {
				const packages = [{
					name: "Free Trial",
					description: "7 days free trial",
					old_price: 100,
					price: 0,
					annual_discount: 0,
					serial_count: 1,
					is_trial: true,
					trial_days: 7,
					package_properties: [
						{name: "150 serial number", description: ""},
						{name: "10 req/min", description: ""},
						{name: "Cancel when you want", description: ""}
					],
					order: 0,
					status: true,
					updatedAt: null,
					createdAt: new Date()
				}];
				await this.adapter.insertMany(packages);
			} catch (e) {
				console.error("Error seeding database:", e);
				throw e; // Re-throw to allow error handling at a higher level
			}
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
