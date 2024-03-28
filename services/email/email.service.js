"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const {ObjectId} = require("mongodb");
const _ = require("lodash");
const moment = require("moment/moment");
const postmark = require("postmark");
const config = require("config");
const creds = (config.get("provider_creds"))["postmarkapp"];
/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "email",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("email_templates"),
		CacheCleanerMixin([
			"cache.clean.email_templates",
		])],
	whitelist: [
		"email.list",
		"email.get",
	],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"slug",
			"name",
			"description",
			"html",
			"status",
			"updatedAt",
			"createdAt"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			slug: {type: "string", min: 2},
			name: {type: "string", min: 6},
			description: {type: "email"},
			html: {type: "string"},
			status: {type: "string"},
		},
		populates: {},
	},

	events: {
		// Subscribe to `user.created` event
		"user.created"(user) {
			//console.log("User created:", user);
			/*this.broker.call("v1.package.getTrialPackage").then((res) => {
				const package_info = res.data;
				this.broker.call("users.update", {
					"id": user.user._id,
					subscription: new ObjectId(package_info.packages._id),
					subscription_expire: new Date(moment(new Date()).add(package_info.packages.trial_days, "days").toDate())
				});
			});*/
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
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		},
		after: {
			create: [
				// Add a new virtual field to the entity
				/*
				async function (ctx, res) {
					res.subscription_detail = await ctx.call("v1.package.get", {"id": ctx.meta.user.subscription});
					await this.entityChanged("created", res, ctx);
					return res;
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
		send: {
			rest: "POST /send",
			params: {},
			async handler(ctx) {
				const mailClient = new postmark.ServerClient(`${creds.api_key}`);
				const mail_response = await mailClient.sendEmail({
					"From": "developer@maiasignage.com",
					"To": "murat.backend@maiasignage.com",
					"Subject": "Test",
					"TextBody": "Hello from Postmark!"
				});

				console.log(mail_response);
			}
		},
		create: {
			auth: "required"
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
		//async seedDB() {}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
