"use strict";
const {ObjectId} = require("mongodb");
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const Encryption = require("../../shared/encryption");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "payment.cardstorage",
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
			"last_payment_date",
			"last_payment_status",
			"status",
			"createdAt",
			"updatedAt",
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {},
		populates: {}
	},
	dependencies: [
		"v1.widget", // shorthand w/o version
	],
	/**
	 * Action Hooks
	 */
	hooks: {
		before: {
			create(ctx) {
				const encryptionInstance = new Encryption();

				ctx.params.name = encryptionInstance.encrypt(name);
				ctx.params.card_number = encryptionInstance.encrypt(card_number);
				ctx.params.exp_month = encryptionInstance.encrypt(exp_month);
				ctx.params.exp_year = encryptionInstance.encrypt(exp_year);
				ctx.params.cvv = encryptionInstance.encrypt(cvv);
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
				url: {type: "string", required: true},
				name: {type: "string", required: true},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				ctx.params.slug = this.randomName();

				const entity = ctx.params;
				const count = await this.adapter.count({user: new ObjectId(ctx.meta.user._id)});
				const check = await this.adapter.findOne({url: entity.url, user: new ObjectId(ctx.meta.user._id)});
				if (!check && count < 8) {
					const doc = await this.adapter.insert(entity);
					await this.broker.broadcast("Webpage.created", {...doc}, ["widget.webpage"]);

					return {"webpage": {...doc}};
				} else {
					return {"webpage": {...check}};
					/*throw new MoleculerClientError(`Duplicated Record for URL @${entity.url}`, 409, "", [{
						field: "widget.webpage",
						message: "Duplicated Record"
					}]);*/
				}
			}
		},
		list: {
			auth: "required",
			params: {},
			async handler(ctx) {
				return await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
			}
		},
		update: {
			auth: "required",
			params: {
				id: {type: "string", required: true},
				url: {type: "string", required: true},
				name: {type: "string", required: true},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const check = await this.adapter.findOne({_id: ObjectId(entity.id), user: ctx.meta.user._id});
				if (check) {
					const doc = await this.adapter.updateById(entity.id, {
						url: entity.url,
						meta: entity.meta,
					});
					await this.broker.broadcast("webpage.updated", {...doc}, ["widget.webpage"]);

					return {"webpage": {...doc}};
				} else {
					throw new MoleculerClientError("Restricted", 409, "", [{
						field: "widget.time",
						message: "Restricted Record"
					}]);
				}
			}
		},
		remove: {
			auth: "required"
		},
		get: false,
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
