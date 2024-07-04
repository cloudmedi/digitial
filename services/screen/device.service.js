"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const DbMixin = require("../../mixins/db.mixin");
const {ObjectId} = require("mongodb");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const crypto = require("crypto");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "device",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("devices"),
		CacheCleanerMixin([
			"cache.clean.devices",
			"devices"
		])],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"screen",
			"fingerprint",
			"serial",
			"meta",
			"status",
			"createdAt",
			"updatedAt"
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
				ctx.params.status = true;
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
		status: {
			rest: "POST /status",
			params: {
				serial: "string",
				state: "string"
			},
			async handler(ctx) {
				const device = await this.broker.call("v1.screen.findByDeviceSerial", {serial: ctx.params.serial});
				if (device) {
					console.log("device", device);
					await ctx.call("io.broadcast", {
						namespace: "/", //optional
						event: "device-status",
						args: ["device-status", {status: ctx.params.state, device: {...device}}], //optional
						volatile: false, //optional
						local: true, //optional
						rooms: ["lobby", `user-${device.user._id}-devices`] //optional
					});
				}
			}
		},
		pre_create: {
			rest: "POST /pre_create",
			params: {
				fingerprint: {type: "string", min: 3, max: 255},
				meta: {type: "object", required: true}
			},
			async handler(ctx) {
				const entity = ctx.params;
				await this.validateEntity(entity);

				const is_recorded_before = await this.broker.cacher.get(`new_device:fingerprint:${entity.fingerprint}`);
				if (is_recorded_before) {
					return await this.transformDocuments(ctx, is_recorded_before, is_recorded_before);
				} else {
					let serial = "";
					const check_device_has = await this.adapter.findOne({fingerprint: entity.fingerprint});

					if(check_device_has) {
						serial = check_device_has.serial;
					} else {
						const serial_number_first_part = crypto.randomBytes(2).toString("hex");
						const serial_number_second_part = crypto.randomBytes(2).toString("hex");
						serial = `${serial_number_first_part}-${serial_number_second_part}`;
					}

					const device_data = {...entity, serial};
					await this.broker.cacher.set(`new_device:${serial}`, device_data, 60 * 100);
					await this.broker.cacher.set(`new_device:fingerprint:${entity.fingerprint}`, device_data, 60 * 100);

					return await this.transformDocuments(ctx, device_data, device_data);
				}
			}
		},
		check_serial: {
			rest: "POST /check_serial",
			params: {
				serial: {type: "string", min: 9, max: 16}
			},
			async handler(ctx) {
				await this.validateEntity(ctx.params);

				const is_serial_binded = await ctx.call("v1.screen.is_serial_binded", {serial: ctx.params.serial});
				if (is_serial_binded) {
					return {status: false, message: "Used Serial Number", data: null};
				}

				const pre_register_data = await this.broker.cacher.get(`new_device:${ctx.params.serial}`);
				if (pre_register_data) {
					const check_device = await this.adapter.findOne({serial: pre_register_data.serial});
					if (check_device) {
						return {status: true, message: "Correct serial number", data: pre_register_data};
					} else {
						await this.adapter.insert(pre_register_data);
						return {status: true, message: "Correct serial number", data: pre_register_data};
					}

				} else {
					const check_db = await this.adapter.findOne({serial: ctx.params.serial});

					if (check_db) {
						return check_db;
					} else {
						return {status: false, message: "Wrong serial number", data: null};
					}
				}
			}
		},
		list: {
			auth: "required",
			async handler(ctx) {
				return await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
			}
		},
		get_device_by_seraial: {
			rest: "GET by_serial/:serial",
			params: {
				serial: {type: "string"}
			},
			async handler(ctx) {
				return this.adapter.findOne({serial: ctx.params.serial});
			}
		},
		get: true,
		create: false,
		insert: false,
		update: false,
		remove: false
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Find an wallet by user
		 *
		 * @param {String} user - Article slug
		 *
		 * @results {Object} Promise<Article
		 */
		findByUser(user) {
			return this.adapter.findOne({user});
		},

		/**
		 * Transform the result entities to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Array} entities
		 * @param {Object} user - Logged in user
		 */
		async transformResult(ctx, entities, user) {
			if (Array.isArray(entities)) {
				const currency = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					currency
				};
			} else {
				const currency = await this.transformEntity(ctx, entities);
				return {currency};
			}
		},

		/**
		 * Transform a result entity to follow the API spec
		 *
		 * @param {Context} ctx
		 * @param {Object} entity
		 * @param {Object} user - Logged in user
		 */
		async transformEntity(ctx, entity) {
			if (!entity) return null;

			return entity;
		},
		/**
		 * Loading sample data to the collection.
		 * It is called in the DB.mixin after the database
		 * connection establishing & the collection is empty.
		 */
		async seedDB() {
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		await this.adapter.collection.createIndex({serial: 1});
	}
};
