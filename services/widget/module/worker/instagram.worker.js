"use strict";
const DbMixin = require("../../../../mixins/db.mixin");
const _ = require("lodash");
const Cron = require("@r2d2bzh/moleculer-cron");
const QueueService = require("moleculer-bull");
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
	mixins: [DbMixin("widget_instagram"), Cron, QueueService()],
	crons: [
		{
			name: "JobHelloWorld",
			cronTime: "*/30 * * * * *",
			onTick: function () {

				console.log("JobHelloWorld ticked");

				this.getLocalService("v1.widget.instagram.worker").broker.cacher.get("widget:instagram:check").then((checklist) => {
					checklist.map(r => {
						console.log(r);
					});
					/*this.getLocalService("v1.widget.instagram.worker")
						.actions.check_account({username: "lazysickartist", limit: 5})
						.then((data) => {
							console.log("Oh!", data);
						});*/
				});


			},
			runOnInit: function () {
				console.log("JobHelloWorld is created");
			},
			manualStart: true,
		},
		{
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
		}
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
		check_account: {
			params: {
				"username": "string",
				"limit": "number",
			},
			async handler(ctx) {
				const api_info = (config.get("provider_creds"))["instagram"];
				// istek gidecek
				this.logger.info("Checking account", api_info);
				console.log(ctx.params);
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
		addCheckItemToQueue(entity) {
			this.createJob("check.instagram", "important", entity, {});

			this.getQueue("mail.send").on("global:progress", (jobID, progress) => {
				this.logger.info(`Job #${jobID} progress is ${progress}%`);
			});

			this.getQueue("mail.send").on("global:completed", (job, res) => {
				this.logger.info(`Job #${job.id} completed!. Result:`, res);
			});
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
