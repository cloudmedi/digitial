"use strict";
const {ObjectId} = require("mongodb");
const DbMixin = require("../../../mixins/db.mixin");
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
				if(!check) {
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
		list: false,
		get: false,
		count: false,
		insert: false,
		update: false,
		remove: false
	},

	/**
	 * Methods
	 */
	methods: {},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
