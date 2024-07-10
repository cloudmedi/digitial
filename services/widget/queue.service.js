"use strict";
const QueueService = require("moleculer-bull");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.queue",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [QueueService()],

	queues: {
		"check.instagram": {
			name: "important",
			concurrency: 5,
			process(job) {
				this.logger.info("New job received!", job.data);
				job.progress(10);

				return this.Promise.resolve({
					done: true,
					id: job.data.id,
					worker: process.pid
				});
			}
		}
	},

	/**
	 * Actions
	 */
	actions: {

	},

	/**
	 * Methods
	 */
	methods: {

	}
};
