"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const axios = require("axios");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "ip_location",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("ips"),
		CacheCleanerMixin([
			"cache.clean.ips",
		])],
	whitelist: [
		"ip_location.list",
		"ip_location.get",
	],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"request",
			"status",
			"delay",
			"credit",
			"city",
			"region",
			"regionCode",
			"regionName",
			"areaCode",
			"dmaCode",
			"countryCode",
			"countryName",
			"inEU",
			"euVATrate",
			"continentCode",
			"continentName",
			"latitude",
			"longitude",
			"locationAccuracyRadius",
			"timezone",
			"currencyCode",
			"currencySymbol",
			"currencySymbol_UTF8",
			"currencyConverter",
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			ip: {type: "string"}
		},
		populates: {}
	},

	/**
	 * Actions
	 */
	actions: {
		ipInfo: {
			rest: "POST /query",
			cache: {
				keys: ["ip"],
				ttl: 60 * 60 * 24// 1 hour
			},
			params: {
				ip: {type: "string"}
			},
			async handler(ctx) {
				let entity = ctx.params;
				await this.validateEntity(entity);

				const doc = await this.adapter.findOne({ip: entity.ip});
				let json = await this.transformEntity(ctx, doc, {});
				if (!json) {
					let config = {
						method: "get",
						url: `http://www.geoplugin.net/json.gp?ip=${entity.ip}`,
						headers: {}
					};

					const ip_info = await axios(config);
					let getop_data = JSON.stringify(ip_info.data).replace("geoplugin_request", "ip").replaceAll("geoplugin_", "");
					let data = JSON.parse(getop_data);
					delete data.credit;

					await this.adapter.updateOne({ip: data.geoplugin_request}, {$set: data}, {upsert: true});

					return data;
				}
				//json = await this.transformResult(ctx, json, ctx.meta.user);
				return json;
			}
		},
		get: false,
		list: false,
		create: false,
		find: false,
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
		 * Transform the result entities to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Array} entities
		 * @param {Object} user - Logged in user
		 */
		async transformResult(ctx, entities, user) {
			if (Array.isArray(entities)) {
				const airports = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					airports
				};
			} else {
				const airports = await this.transformEntity(ctx, entities, user);
				return {airports};
			}
		},

		/**
		 * Transform a result entity to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Object} entity
		 * @param {Object} user - Logged in user
		 */
		async transformEntity(ctx, entity, user) {
			if (!entity) return null;

			return entity;
		},
		/**
		 * Loading sample data to the collection.
		 * It is called in the DB.mixin after the database
		 * connection establishing & the collection is empty.
		 */
		async seedDB() {
			/*const counties = require("../../data/countries.json");
			await this.adapter.insertMany(counties);*/
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
