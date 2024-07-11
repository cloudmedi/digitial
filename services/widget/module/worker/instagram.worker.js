"use strict";
const DbMixin = require("../../../../mixins/db.mixin");
const _ = require("lodash");
const Cron = require("@r2d2bzh/moleculer-cron");
const config = require("config");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.instagram.worker",
	version: 1,
	dependencies: [
		"v1.widget", // shorthand w/o version
		"v1.widget.instagram", // shorthand w/o version
	],
	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_instagram"), Cron],
	crons: [
		{
			name: "JobIGCheckList",
			cronTime: "*/30 * * * * *",
			onTick: function () {

				this.logger.info("JobIGCheckList ticked");

				this.getLocalService("v1.widget.instagram.worker").broker.cacher.get("widget:instagram:check").then((checklist) => {
					if(checklist) {

						checklist.map(ig_profile => {
							this.getLocalService("v1.widget.instagram.worker")
								.actions.startProcess({ig_profile})
								.then((data) => {
									this.logger.info("Job Added to Queue", data);
								});
						});
					} else {
						console.log(checklist);
					}
				});


			},
			runOnInit: function () {
				console.log("JobIGCheckList created");
			},
			manualStart: false,
		},
		/*{
			name: "JobWhoStartAnother",
			cronTime: "* * * * *",
			onTick: function () {

				console.log("JobWhoStartAnother ticked");

				const job = this.getJob("JobHelloWorld");
				console.log("job.lastDate()", job.lastDate());
				if (!job.lastDate()) {
					job.start();
				} else {
					console.log("JobHelloWorld is already started!");
				}

			},
			runOnInit: function () {
				console.log("JobWhoStartAnother is created");
			},
		}*/
	],
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

	/*events: {
		// Subscribe to `user.created` event
		async "instagram.created"(entity) {
			console.log("Instagram created:", entity);
			await this.upsertCheckList(entity);
		},	// Subscribe to `user.created` event
	},*/	// Subscribe to `user.created` event
	/**
	 * Actions
	 */
	actions: {
		say: {
			handler(ctx) {
				return "HelloWorld!";
			}
		},
		startProcess: {
			params: {
				"ig_profile": "object",
			},
			async handler(ctx) {
				//const api_info = (config.get("provider_creds"))["instagram"];
				//this.logger.info("Checking account", api_info);
				try {
					this.addCheckItemToQueue(ctx.params.ig_profile);
					return true;
				} catch (e) {
					console.error(e);
					return false;
				}

			}
		},
		list: {
			async handler(ctx) {
				return await this.adapter.find({query: {status: true}});
			}
		},
		create: false,
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
		},
		/**
		 * Add Queue
		 * */
		addCheckItemToQueue(entity) {
			console.log("entity", entity);
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
