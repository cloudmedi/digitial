"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../../mixins/db.mixin");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "currency",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("currencies")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"n_id",
			"display_name",
			"name",
			"alt_name",
			"network_name",
			"short_description",
			"decimals",
			"display_decimals"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			amount: "number|positive|min:0|default:0",
			currency: "string|max:3"
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
			visibility: "public",
		},
		findByName: {
			rest: "POST /",
			auth: "required",
			/*visibility: "protected",*/
			params: {
				"currency": "string|required|min:3"
			},
			async handler(ctx) {
				let currency_name = ctx.params.currency;
				let currency = await this.adapter.findOne({name: currency_name});
				let doc = this.transformEntity(ctx, currency);
				if (doc) {
					return doc;
				}

			}
		},
		list: {},
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
			await this.adapter.insertMany([
				{
					"display_name": "Bitcoin",
					"name": "BTC",
					"network_name": "BTC",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 5,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 11:25:39"
				}, {
					"display_name": "LiteCoin",
					"name": "LTC",
					"network_name": "LTC",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 5,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 11:25:39"
				}, {
					"display_name": "Bitcoin Cash",
					"name": "BCH",
					"network_name": "BCH",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 5,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 12:27:32"
				},
				{
					"display_name": "Ethereum",
					"name": "ETH",
					"network_name": "ETH",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 5,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 11:25:39"
				},
				{
					"display_name": "DogeCoin",
					"name": "DOGE",
					"network_name": "DOGE",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 2,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 12:27:32"
				},
				{
					"display_name": "Dash",
					"name": "DASH",
					"network_name": "DASH",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 2,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 12:27:32"
				},
				{
					"display_name": "Tether ERC20",
					"name": "USDT",
					"network_name": "ERC20",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 4,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 11:25:39"
				},
				{
					"display_name": "Tether TRC20",
					"name": "USDT",
					"network_name": "TRC20",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 4,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 11:25:39"
				},
				{
					"display_name": "Tron",
					"name": "TRX",
					"network_name": "TRX",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 6,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 12:27:32"
				},
				{
					"display_name": "Monero",
					"name": "XMR",
					"network_name": "XMR",
					"short_description": null,
					"decimals": 2,
					"display_decimals": 5,
					"status": 0,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 12:27:32"
				},
				{
					"display_name": "Turkish Lira",
					"name": "TRY",
					"network_name": "TRY",
					"short_description": null,
					"decimals": 4,
					"display_decimals": 4,
					"status": 1,
					"deletedAt": null,
					"createdAt": "2022-02-10 13:45:19",
					"updatedAt": "2022-03-28 12:27:32"
				}
			]);
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
