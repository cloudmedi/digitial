"use strict";
const DbMixin = require("../../../../mixins/db.mixin");
const _ = require("lodash");
const Cron = require("@r2d2bzh/moleculer-cron");
const config = require("config");
const {TwitterApi} = require("twitter-api-v2");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.twitter.worker",
	version: 1,
	dependencies: [
		"v1.widget", // shorthand w/o version
		"v1.widget.twitter", // shorthand w/o version
	],
	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_twitter"), Cron],
	crons: [
		{
			name: "JobTWCheckList",
			cronTime: "*/30 * * * * *",
			onTick: function () {

				this.logger.info("JobTWCheckList ticked");

				this.getLocalService("v1.widget.twitter.worker").broker.cacher.get("widget:twitter:check").then((checklist) => {
					if (checklist) {
						checklist.map(twitter_profile => {
							this.getLocalService("v1.widget.twitter.worker")
								.actions.startProcess({twitter_profile})
								.then((data) => {
									this.logger.info("Job Added to Queue", data);
								});
						});
					} else {
						console.log("TW checklist", checklist);
					}
				});


			},
			runOnInit: function () {
				console.log("JobIGCheckList created");
			},
			manualStart: false,
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
				"twitter_profile": "object",
			},
			async handler(ctx) {
				try {
					this.addCheckItemToQueue(ctx.params.twitter_profile);
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
		/**
		 * Add Queue
		 * */
		async addCheckItemToQueue(entity) {
			const api_info = (config.get("provider_creds"))["twitter"];

			const twitterClient = new TwitterApi(api_info.bearer);
			//const readOnlyClient = twitterClient.readOnly;

			//const user_profile = await readOnlyClient.v2.userByUsername("bulentalkan");
			const user_profile = await twitterClient.v2.me();
			console.log("user_profile", user_profile);

			/*const user_timeline = await client.v2.userTimeline('12', {
				expansions: ['attachments.media_keys', 'attachments.poll_ids', 'referenced_tweets.id'],
				'media.fields': ['url'],
			});*/
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
