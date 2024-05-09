"use strict";

const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const fs = require("fs");
const path = require("path");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "filemanager",
	version: 1,
	/**
	 * Settings
	 */
	settings: {},
	events: {
		// Subscribe to `user.created` event
		"image.created"(image_row) {

			//console.log("User created:", user);
			setTimeout(() => {
				try {
					console.log("image_row",image_row, );
					console.log("silme başladı");
					const file = path.join(__dirname, "../../","/public", image_row.path, image_row.file);
					fs.unlinkSync(file);
					console.log(file, "deleted");
				} catch (e) {
					console.log(e);
				}
			}, 1000 * 30);

		},

		// Subscribe to all `user` events
		"user.*"(user) {
			//console.log("User event:", user);
		},

		// Subscribe to all internal events
		/*
		"$**"(payload, sender, event) {
			console.log(`Event '${event}' received from ${sender} node:`, payload);
		}
		 */
	},
	/**
	 * Actions
	 */
	actions: {

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
