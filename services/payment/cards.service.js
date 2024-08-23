"use strict";
const {ObjectId} = require("mongodb");
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const Encryption = require("../../shared/encryption");
const crypto = require("crypto");
const _ = require("lodash");
/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "payment.cards",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("payment_cards")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"name",
			"card_number",
			"exp_month",
			"exp_year",
			"cvv",
			"is_default",
			"card_last_six",
			"last_payment_date",
			"last_payment_status",
			"meta",
			"status",
			"createdAt",
			"updatedAt",
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {},
		populates: {}
	},
	dependencies: [
		"v1.payment", // shorthand w/o version
	],
	/**
	 * Action Hooks
	 */
	hooks: {
		before: {
			create(ctx) {
				ctx.params.last_payment_date = null;
				ctx.params.last_payment_status = null;

				ctx.params.is_default = ctx.params.is_default ?? false;

				ctx.params.updatedAt = new Date();
				ctx.params.createdAt = new Date();

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
			rest: "POST /",
			auth: "required",
			params: {
				name: {type: "string", required: true},
				card_number: {type: "string", required: true},
				exp_month: {type: "string", required: true},
				exp_year: {type: "string", required: true},
				cvv: {type: "string", required: true},
				is_default: {type: "boolean", required: false, default: false},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				const entity = ctx.params;
				ctx.params.card_last_six = ctx.params.card_number.slice(-6);

				const users_cards = await this.adapter.find({user: new ObjectId(ctx.meta.user._id)});
				const count = 0;// users_cards.length
				const check = false; //await this.adapter.findOne({card_last_six: ctx.params.card_last_six, user: ctx.params.user});
				const count_max = 3;

				if (users_cards) {
					const cardUserKey = _.chain(users_cards)
						.find(card => _.has(card, "meta.cardUserKey")) // 'meta.cardUserKey' alanına sahip ilk öğeyi bul
						.get("meta.cardUserKey") // 'meta.cardUserKey' değerini al
						.value();
					ctx.params.cardUserKey = cardUserKey;
				}

				if (!check && count < count_max) {
					ctx.params.alias = this.randomName();
					const key = crypto.randomBytes(32);
					const iv = crypto.randomBytes(16);

					const encryptionInstance = new Encryption(key, iv);
					ctx.params.user = new ObjectId(ctx.meta.user._id);
					ctx.params.email = ctx.meta.user.email;

					//ctx.params.name = encryptionInstance.encrypt(ctx.params.name);

					ctx.params.card_number = encryptionInstance.encrypt(ctx.params.card_number);

					ctx.params.exp_month = encryptionInstance.encrypt(ctx.params.exp_month);
					ctx.params.exp_year = encryptionInstance.encrypt(ctx.params.exp_year);
					ctx.params.cvv = encryptionInstance.encrypt(ctx.params.cvv);
					await this.broker.cacher.set(`card:secure:${ctx.params.card_last_six}:key`, key.toString("base64"), 0);
					await this.broker.cacher.set(`card:secure:${ctx.params.card_last_six}:iv`, iv.toString("base64"), 0);

					const doc = await this.adapter.insert(entity);
					await this.broker.broadcast("payment.card.stored", {...doc}, ["payment.cardstorage"]);
					const provider_response = await ctx.call("v1.payment.iyzico.card_save", doc);


					const meta = {
						status: provider_response.status,
						locale: provider_response.locale,
						systemTime: provider_response.systemTime,
						conversationId: provider_response.conversationId,
						externalId: provider_response.externalId,
						email: provider_response.email,
						cardUserKey: provider_response.cardUserKey,
						cardToken: provider_response.cardToken,
						cardAlias: provider_response.cardAlias,
						binNumber: provider_response.binNumber,
						lastFourDigits: provider_response.lastFourDigits,
						cardType: provider_response.cardType,
						cardAssociation: provider_response.cardAssociation,
						cardFamily: provider_response.cardFamily,
						cardBankCode: provider_response.cardBankCode,
						cardBankName: provider_response.cardBankName
					};

					const card_detail = await ctx.call("v1.payment.cards.update",
						{
							id: doc._id,
							meta: {...meta}
						});

					const response = card_detail ?? doc;

					return {"card": {...response}};
				} else {
					throw new MoleculerClientError("Duplicated Record ", 400, "Entity Error", [{
						field: "Payment.Cards",
						message: "Duplicated Record"
					}]);
					//return {"card": {...check}};
				}
			}
		},
		list: {
			auth: "required",
			cache: false,
			params: {},
			async handler(ctx) {
				const users_cards = await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});

				return users_cards;
			}
		},
		update: true,
		remove: {
			auth: "required",
			params: {id: {type: "string", required: true}},
			async handler(ctx) {
				const entity = ctx.params;
				const check = await this.adapter.findOne({
					_id: new ObjectId(entity.id),
					user: new ObjectId(ctx.meta.user._id)
				});
				if (check) {
					const removed = await this.adapter.removeById(entity.id);
					if (removed) {
						await ctx.call("v1.payment.iyzico.card_remove", {card: check});
						return {status: "success", message: "entity deleted"};
					}
					return {status: "error", message: "entity not deleted"};
				} else {
					throw new MoleculerClientError("Restricted access ", 400, "Auth Error", [{
						field: "Payment.Cards.remove",
						message: "Restricted access"
					}]);
				}
			}
		},
		get: {
			auth: "required",
			async handler(ctx) {
				const card_id = ctx.params.id;
				return await this.adapter.findOne({_id: new ObjectId(card_id), user: new ObjectId(ctx.meta.user._id)});
			}
		},
		count: false,
		insert: false
	},

	/**
	 * Methods
	 */
	methods: {
		randomName() {
			let length = 8;
			let result = "";
			const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			let charactersLength = characters.length;
			for (let i = 0; i < length; i++) {
				result += characters.charAt(Math.floor(Math.random() *
					charactersLength));
			}
			return result;
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
