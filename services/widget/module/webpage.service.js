"use strict";
const {ObjectId} = require("mongodb");
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../../mixins/db.mixin");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.webpage",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_webpage")],
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
			"url",
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
			create(ctx) {
				ctx.params.createdAt = new Date();
				ctx.params.updatedAt = new Date();
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.status = true;
				ctx.params.path = "";
				ctx.params.domain = "";
				ctx.params.folder = "";
				ctx.params.provider = "webpage";
				ctx.params.type = "url";
				ctx.params.file = "";
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
