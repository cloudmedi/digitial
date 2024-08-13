"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const config = require("config");
const Iyzipay = require("iyzipay");
const axios = require("axios");
const path = require("node:path");
const crypto = require("crypto");
const slugify = require("slugify");
const moment = require("moment");
const {ObjectId} = require("mongodb");

const provider_configs = config.get("provider_creds");
const iyzico_conf = provider_configs["iyzico"];

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "payment",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("payments")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"package",
			"amount",
			"currency",
			"country",
			"status",
			"createdAt",
			"updatedAt",
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			user: "object",
			email: "string",
			address: "string",
			phone: "string",
			identity_number: "string",
			city: "string",
			country: "string",
			zip_code: "string",
			state: "string",
			basket_items: "array",
			locale: "string",
			provider_request_data: "object",
			amount: {type: "string"},
			currency: {type: "string", default: "USD"},
			ip: {type: "string", default: "85.34.78.112"}
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
				ctx.params.status = null;
				ctx.params.createdAt = new Date();
				ctx.params.user = new ObjectId(ctx.params.user);
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
			visible: "protected",
		},
		get: {
			visible: "protected",
		},
		list: false,
		find: false,
		count: false,
		insert: false,
		update: {visible: "protected",},
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
				const payments = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					payments
				};
			} else {
				const payment = await this.transformEntity(ctx, entities, user);
				return {payment};
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
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
