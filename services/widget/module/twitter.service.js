"use strict";
const {ObjectId} = require("mongodb");
const _ = require("lodash");
const DbMixin = require("../../../mixins/db.mixin");
const {MoleculerClientError} = require("moleculer").Errors;

/**
 * @todo: https://www.npmjs.com/package/twitter-api-v2 modülü kullanılacak
 * */

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.twitter",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_twitter")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"path",
			"domain",
			"folder",
			"name",
			"slug",
			"provider",
			"type",
			"file",
			"twitter_username",
			"limit",
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
		"v1.widget", // shorthand w/o version
	],
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
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.status = true;
				ctx.params.path = "";
				ctx.params.domain = "";
				ctx.params.folder = "";
				ctx.params.provider = "twitter";
				ctx.params.type = "username";
				ctx.params.file = "";
			},
			update(ctx) {
			}
		}
	},
	events: {
		// Subscribe to `user.created` event
		async "Twitter.created"(entity) {
			console.log("Twitter created:", entity);
			await this.upsertCheckList(entity);

		},	// Subscribe to `user.created` event
	},	// Subscribe to `user.created` event
	/**
	 * Actions
	 */
	actions: {
		create: {
			rest: "POST /",
			auth: "required",
			params: {
				twitter_username: {type: "string", required: true},
				limit: {type: "number", required: false, default: 5},
				name: {type: "string", required: true},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				ctx.params.slug = this.randomName();

				const entity = ctx.params;
				const count = await this.adapter.count({user: new ObjectId(entity.user)});
				console.log("count", count);
				const check = await this.adapter.findOne({
					twitter_username: entity.twitter_username,
					user: ctx.meta.user._id
				});

				if (!check && count < 2) {
					const doc = await this.adapter.insert(entity);
					await this.broker.broadcast("Twitter.created", {...doc}, ["widget.twitter"]);

					return {"twitter": {...doc}};
				} else {
					throw new MoleculerClientError(`Duplicated Record or Account adding limit not enough Twitter Username @${entity.twitter_username}`, 409, "", [{
						field: "widget.twitter",
						message: "Duplicated Record"
					}]);
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
				twitter_username: {type: "string", required: true},
				name: {type: "string", required: true},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const check = await this.adapter.findOne({_id: ObjectId(entity.id), user: ctx.meta.user._id});
				if (check) {
					const doc = await this.adapter.updateById(entity.id, {
						twitter_username: entity.twitter_username,
						meta: entity.meta,
					});
					await this.broker.broadcast("Twitter.updated", {...doc}, ["widget.twitter"]);

					return {"webpage": {...doc}};
				} else {
					throw new MoleculerClientError("Restricted", 409, "", [{
						field: "widget.twitter",
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
		async upsertCheckList(entity) {
			const check_list = await this.broker.cacher.get("widget:twitter:check");
			if (check_list?.length > 0) {
				// gelen veri checklist'de var mı?
				const has_inserted = _.find(check_list, {_id: entity._id});
				let data = [...check_list];
				if (!has_inserted) {
					data.push(entity);
					await this.broker.cacher.set("widget:twitter:check", data);
				}
			} else {
				// checklist hiç oluşmamışsa, oluştur
				const list = await this.adapter.find({query: {status: 1}});
				let data = [];
				if (list.length > 0) {
					data = list;
				} else {
					data = [entity];
				}

				await this.broker.cacher.set("widget:twitter:check", data, 3600 * 12);
			}

			return true;
		},
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
