"use strict";
const {ObjectId} = require("mongodb");
const DbMixin = require("../../../mixins/db.mixin");
const _ = require("lodash");
const {MoleculerClientError} = require("moleculer").Errors;

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.instagram.worker",
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

		populates: {}
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
		create: false,
		list: {
			async handler(ctx) {
				return await this.adapter.find({query: {status: true}});
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
				if (!has_inserted) {
					data.push(entity);
					await this.broker.cacher.set("widget:instagram:check", data);
				}
			} else {
				// checklist hiç oluşmamışsa, oluştur
				const list = await this.adapter.find();
				let data = [];
				if (list.length > 0) {
					data = list;
				} else {
					data = [entity];
				}

				await this.broker.cacher.set("widget:instagram:check", data, 3600 * 12);
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
