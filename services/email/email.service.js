"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const _ = require("lodash");
const postmark = require("postmark");
const config = require("config");
const countries_json = require("../../data/countries-states-cities.json");
const creds = (config.get("provider_creds"))["postmarkapp"];
const env = (config.get("ENV")) ?? "test";

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
			"subject",
			"description",
			"html",
			"text",
			"status",
			"updatedAt",
			"createdAt"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			slug: {type: "string", min: 2},
			name: {type: "string", min: 6},
			description: {type: "email"},
			text: {type: "string"},
			html: {type: "string"},
			status: {type: "string"},
		},
		populates: {},
	},

	events: {
		// Subscribe to `user.created` event
		"user.created"(user) {
			const mail_subject = "user_welcome";

			this.broker.call("v1.email.find", {slug: mail_subject}).then((mail_template) => {
				if(mail_template) {
					this.broker.call("v1.email.send", {
						user: user.user,
						template: mail_template[0]
					});
				}

			});
		},
		"user.subscribed"(user, subscription) {

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
		send: {
			rest: "POST /send",
			params: {
				user: {type: "object"},
				template:{ type: "object"},
			},
			async handler(ctx) {
				const user = ctx.params.user;
				const template = ctx.params.template;
				let to = ctx.params.user.email;
				if(env === "test") {
					to = "murat.backend@maiasignage.com";
				}

				const mailClient = new postmark.ServerClient(`${creds.api_key}`);
				try {
					const mail_response = await mailClient.sendEmail({
						"From": "developer@maiasignage.com",
						"To": `${to}`,
						"Subject": template.subject,
						"TextBody": template.text,
						"HtmlBody": template.html
					});
				} catch (e) {
					console.log(e);
				}

				return true;
			}
		},
		create: false,
		get: {
			auth: "required"
		},
		list: false,
		update: false,
		find: {
			auth: "required"
		},
		count: false,
		insert: false,
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
				const mails_json = require("../../data/mails.json");
				await this.adapter.insertMany(mails_json);

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
