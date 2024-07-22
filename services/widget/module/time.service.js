"use strict";
const {ObjectId} = require("mongodb");
const DbMixin = require("../../../mixins/db.mixin");
const {MoleculerClientError} = require("moleculer").Errors;

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.time",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_time")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"timezone",
			"meta",
			"createdAt",
			"updatedAt"
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
				timezone: {type: "string", required: true},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const count = await this.adapter.count({user: ObjectId(entity.user)});
				const check = await this.adapter.findOne({timezone: entity.timezone, user: ctx.meta.user._id});
				if (!check && count < 6 ) {
					const doc = await this.adapter.insert(entity);
					await this.broker.broadcast("Time.created", {...doc}, ["widget.time"]);

					return {"time": {...doc}};
				} else {
					throw new MoleculerClientError(`Duplicated Record for Timezone @${entity.timezone}`, 409, "", [{
						field: "widget.time",
						message: "Duplicated Record"
					}]);
				}
			}
		},
		update: {
			auth: "required",
			params: {
				id: {type: "string", required: true},
				timezone: {type: "string", required: true},
				meta: {type: "object", required: false, default: {}}
			},
			async handler(ctx) {
				const entity = ctx.params;
				const check = await this.adapter.findOne({_id: ObjectId(entity.id), user: ctx.meta.user._id});
				if (check) {
					const doc = await this.adapter.updateById(entity);
					await this.broker.broadcast("Time.created", {...doc}, ["widget.time"]);

					return {"time": {...doc}};
				} else {
					throw new MoleculerClientError("Restricted", 409, "", [{
						field: "widget.time",
						message: "Restricted Record"
					}]);
				}
			}
		},
		list: false,
		get: false,
		count: false,
		insert: false,
		remove: false
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
