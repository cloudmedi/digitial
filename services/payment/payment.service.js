"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const _ = require("lodash");

const STATUS = {
	WAITING: "WAITING",
	PROCESSING: "PROCESSING",
	PAID: "PAID",
	FAILED: "FAILED"
};

const CURRENCY = {
	TRY: "TRY",
	EUR: "EUR",
	USD: "USD",
	IRR: "IRR",
	GBP: "GBP",
	NOK: "NOK",
	RUB: "RUB",
	CHF: "CHF"
};

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
			"subscription",
			"card",
			"amount",
			"currency",
			"payment_status", /* waiting, processing, paid, fail*/
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
			currency: {type: "string", default: CURRENCY.USD},
			ip: {type: "string", default: "85.34.78.112"}
		},
		populates: {
			user: {
				action: "users.get"
			},
			subscription: {
				action: "v1.package.get"
			},
			card: {
				action: "v1.card.get"
			},
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
		subscribe: {
			rest: "POST /subscription",
			params: {
				subscription: {type: "string"},
				card: {type: "string", default: null, required: false},
			},
			async handler(ctx) {
				const subscription_id = ctx.params.subscription;
				const card_id = ctx.params.card;
				const subscription = await ctx.call("v1.package.get", {id: subscription_id, is_trial: false});
				if (subscription) {
					let card;
					if (!card_id || card_id === "") {
						const users_cards = await ctx.call("v1.payment.cards.list");
						card = _.find(users_cards, {is_default: true}) || _.first(users_cards);
					} else {
						card = await ctx.call("v1.payment.cards.get", {id: card_id});
					}
					if (card) {
						const user = await ctx.call("v1.profile.getUser", {user: ctx.meta.user._id});
						const new_user_entity = {...user.user, profile: user.profile};

						const payment = await this.adapter.insert({
							user: new ObjectId(user._id),
							subscription: new ObjectId(subscription._id),
							card: new ObjectId(card._id),
							amount: subscription.price,
							currency: CURRENCY.USD,
							payment_status: STATUS.WAITING,
							status: false,
							createdAt: new Date(),
							updatedAt: new Date(),
						});

						const output = {...payment, subscription, card, user: new_user_entity};

						return await ctx.call("v1.payment.iyzico.start_subscription", {payment: {...output}});
					} else {
						return "kart bulunamadı";
					}
				}
			}
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
