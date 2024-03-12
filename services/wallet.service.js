"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../mixins/db.mixin");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "wallet",
	/*version: 1,*/

	/**
	 * Mixins
	 */
	mixins: [DbMixin("wallets")],
	whitelist: [
		"wallet.create",
		"wallet.deposit",
		"wallet.withdraw",
		"wallet.transferMoneyToWallet"
	],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"amount",
			"currency"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			amount: "number|positive|min:0|default:0",
			currency: "string|max:3"
		},
		populates: {
			user: {
				action: "users.get",
				params: {
					fields: ["username", "bio", "image"]
				}
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
				ctx.params.amount = 0;
			}
		}
	},

	/**
	 * Actions
	 */
	actions: {
		create: {
			auth: "required",
			rest: "POST /",
			params: {
				wallet: {type: "object"}
			},
			async handler(ctx) {
				let entity = ctx.params.wallet;
				await this.validateEntity(entity);

				const wallet = await this.findByUser(entity.user);
				if (!wallet) {
					entity.createdAt = new Date();
					entity.updatedAt = new Date();

					const doc = await this.adapter.insert(entity);
					let json = await this.transformDocuments(ctx, {populate: ["user"]}, doc);

					json = await this.transformResult(ctx, json, ctx.meta.user);
					await this.entityChanged("created", json, ctx);
					return json;
				}
			}
		},
		list: {
			auth: "required",
			visibility: "private",
		},
		find: {
			auth: "required",
			visibility: "private",
		},
		count: {
			auth: "required",
			visibility: "private",
		},
		insert: {
			auth: "required",
			visibility: "private",
		},
		update: {
			auth: "required",
			visibility: "private",
		},
		remove: {
			auth: "required",
			visibility: "private",
		},

		/**
		 * Deposit to Wallet.
		 */
		deposit: {
			auth: "required",
			rest: "PUT /:id/deposit",
			params: {
				id: "string",
				value: "number|integer|positive"
			},
			async handler(ctx) {
				const doc = await this.adapter.updateById(ctx.params.id, {$inc: {quantity: ctx.params.value}});
				const json = await this.transformDocuments(ctx, ctx.params, doc);
				await this.entityChanged("updated", json, ctx);

				return json;
			}
		},

		/**
		 * Withdraw from wallet
		 */
		withdraw: {
			auth: "required",
			rest: "PUT /:id/withdraw",
			params: {
				id: "string",
				value: "number|integer|positive"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const doc = await this.adapter.updateById(ctx.params.id, {$inc: {quantity: -ctx.params.value}});
				const json = await this.transformDocuments(ctx, ctx.params, doc);
				await this.entityChanged("updated", json, ctx);

				return json;
			}
		},
		/**
		 * Withdraw from wallet
		 */
		transferMoneyToWallet: {
			auth: "required",
			rest: "PUT /transferToWallet",
			params: {
				amount: "number|integer|positive",
				currency: "string|max:3",
				to_wallet: "string"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				/*

				Wallet to Wallet Transfer

				const doc = await this.adapter.updateById(ctx.params.id, {$inc: {quantity: -ctx.params.value}});
				const json = await this.transformDocuments(ctx, ctx.params, doc);
				await this.entityChanged("updated", json, ctx);

				return json;*/
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
				const wallet = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					wallet
				};
			} else {
				const wallet = await this.transformEntity(ctx, entities, user);
				return {wallet};
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
