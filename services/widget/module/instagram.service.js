"use strict";
const {ObjectId} = require("mongodb");
const DbMixin = require("../../../mixins/db.mixin");
const _ = require("lodash");
const {MoleculerClientError} = require("moleculer").Errors;

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.instagram",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_instagram")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"username",
			"content",
			"limit",
			"meta",
			"type",
			"status",
			"createdAt",
			"updatedAt"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			username: {type: "string", required: true},
			meta: {type: "object", required: true},
			limit: {type: "number", required: true, default: 5},
			content: {type: "array", required: false, default: []},
			type: {type: "string", required: false, default: "instagram"},
		},
		populates: {}
	},

	/**
	 * Action Hooks
	 */
	hooks: {
		before: {
			create(ctx) {
				ctx.params.createdAt = new Date();
				ctx.params.updatedAt = new Date();
				ctx.params.type = "instagram";
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.meta = {};
				ctx.params.content = [];
				ctx.params.status = true;
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();

			}
		}
	},
	events: {
		// Subscribe to `user.created` event
		async "instagram.created"(entity) {
			console.log("Instagram created:", entity);
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
				username: {type: "string", required: true},
				meta: {type: "object", required: true},
				limit: {type: "number", required: true, default: 5},
			},
			async handler(ctx) {
				const entity = ctx.params;
				const check = await this.adapter.findOne({username: entity.username, user: entity.user});
				if (!check) {
					const doc = await this.adapter.insert(entity);
					await this.broker.broadcast("instagram.created", {...doc}, ["widget.instagram"]);

					return {"instagram": {...doc}};
				} else {
					throw new MoleculerClientError(`Duplicated Record for IG user @${entity.username}`, 409, "", [{
						field: "widget.instagram",
						message: "Duplicated Record"
					}]);
				}
			}
		},
		list: {
			auth: "required",
			async handler(ctx) {
				return await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
			}
		},
		get: false,
		count: false,
		insert: false,
		update: false,
		remove: false
	},

	/**
	 * Methods
	 */
	methods: {
		async upsertCheckList(entity) {
			const check_list = await this.broker.cacher.get("widget:instagram:check");
			if (check_list?.length > 0) {
				// gelen veri checklist'de var mı?
				const has_inserted = _.find(check_list, {_id: entity._id});
				let data = [...check_list];
				if(!has_inserted) {
					data.push(entity);
					await this.broker.cacher.set("widget:instagram:check", data);
				}
			} else {
				// checklist hiç oluşmamışsa, oluştur
				const list = await this.adapter.find();
				let data = [];
				if(list.length > 0) {
					data = list;
				} else {
					data = [entity];
				}

				await this.broker.cacher.set("widget:instagram:check", data);
			}

			return true;
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
