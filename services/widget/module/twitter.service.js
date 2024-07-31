"use strict";
const {ObjectId} = require("mongodb");
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
	/*mixins: [DbMixin("widget_image")],*/
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [],

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
			create(ctx) {},
			update(ctx) {}
		}
	},

	/**
	 * Actions
	 */
	actions: {
		create: false,
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
	methods: {

	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
