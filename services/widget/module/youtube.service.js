"use strict";
const {ObjectId} = require("mongodb");
const DbMixin = require("../../../mixins/db.mixin");
const {MoleculerClientError} = require("moleculer").Errors;

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.youtube",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_youtube")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"title",
			"link",
			"thumb",
			"meta",
			"createdAt",
			"updatedAt",
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {},
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
				ctx.params.createdAt = new Date();
				ctx.params.updatedAt = new Date();
				ctx.params.user = new ObjectId(ctx.meta.user._id);
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
				link: {type: "string", required: true},
				title: {type: "string", required: false},
				thumb: {type: "string", required: false, default: null},
				meta: {type: "object", required: false}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const count = await this.adapter.count({user: new ObjectId(entity.user)});
				const check = await this.adapter.findOne({link: entity.link, user: ctx.meta.user._id});
				if (!check && count < 24 ) {
					const doc = await this.adapter.insert(entity);
					await this.broker.broadcast("youtube.created", {...doc}, ["widget.youtube"]);

					return {"youtube": {...doc}};
				} else {
					throw new MoleculerClientError(`Duplicated Record for Youtube @${entity.link}`, 409, "", [{
						field: "widget.youtube",
						message: "Duplicated Record"
					}]);
				}
			}
		},
		update: {
			auth: "required",
			params: {
				id: {type: "string", required: true},
				link: {type: "string", required: true},
				title: {type: "string", required: false},
				thumb: {type: "string", required: false, default: null},
				meta: {type: "object", required: false}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const check = await this.adapter.findOne({_id: new ObjectId(entity.id), user: ctx.meta.user._id});
				if (check) {
					const doc = await this.adapter.updateById(entity);
					await this.broker.broadcast("youtube.updated", {...doc}, ["widget.youtube"]);

					return {"time": {...doc}};
				} else {
					throw new MoleculerClientError("Restricted", 409, "", [{
						field: "widget.youtube",
						message: "Restricted Record"
					}]);
				}
			}
		},
		list: false,
		get: false,
		count: false,
		insert: false,
		remove: {
			auth: "required",
		}
	},

	/**
	 * Methods
	 */
	methods: {

	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
