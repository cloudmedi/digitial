"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const fs = require("fs");
const path = require("path");
const {ObjectId} = require("mongodb");

const DbMixin = require("../../../mixins/db.mixin");

let fileUrls = [];

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.image",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_image")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"name",
			"provider",
			"slug",
			"path",
			"domain",
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			name: "string",
			slug: "string"
		},
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
				ctx.params.createddAt = new Date();
				ctx.params.updatedAt = null;
				ctx.params.user = new ObjectId(ctx.meta.user.id);
				ctx.params.status = true;
			},
			update(ctx) {
				ctx.params.updatedAt = new Date();
			}
		},
		after: {
			/**
			 * Register a before hook for the `create` action.
			 * It sets a default value for the quantity field.
			 *
			 * @param {Context} ctx
			 */
			async upload(ctx) {
				if(fileUrls.length === 3) {
					fileUrls.forEach((val, key) => {
						if(key === 0) {
							ctx.params.file_1 = val;
						}

						if(key === 1) {
							ctx.params.file_2 = val;
						}

						if(key === 2) {
							ctx.params.file_3 = val;
						}
					});
					let entity = ctx.params;
					await this.validateEntity(entity);
					const kyc = await this.findByUser(entity.user);
					if(!kyc) {
						entity.createdAt = new Date();
						entity.updatedAt = new Date();

						const doc = await this.adapter.insert(entity);

						let json = await this.transformDocuments(ctx, {populate: ["user"]}, doc);

						json = await this.transformResult(ctx, json, ctx.meta.user);
						await this.entityChanged("created", json, ctx);
						return json;
					}
				}
			}

		}
	},

	/**
	 * Actions
	 */
	actions: {
		properties: {
			rest: "GET /properties",
			auth: "required",
			async handler(ctx) {
				return {
					name: "image",
					params: ["path", "domain", "place", "width", "height"],
					status: true
				};
			}
		},
		create: {
			auth: "required",
			params: {
				file: {type: "string"},
				source: {type: "string", optional: true},
				meta: {type: "object"}
			},
			async handler(ctx){

			}
		},
		/**
		 * Upload Files action.
		 *
		 * @returns
		 */
		upload: {
			auth: "required",
			rest: {
				method: "POST",
				type: "multipart",
				path: "/upload",
				busboyConfig: {
					limits: {files: 3}
				},
				params: {
					files: {
						file_1: {type: "file"},
						file_2: {type: "file"},
						file_3: {type: "file"},
					}
				}
			},
			async handler(ctx, req, res) {
				return new this.Promise((resolve, reject) => {
					let uploadDir = "./public/upload/" + ctx.meta.user._id.toString();

					if (!fs.existsSync(uploadDir)) {
						fs.mkdirSync(uploadDir, {recursive: true});
					}

					//reject(new Error("Disk out of space"));
					const ext = ctx.meta.filename
						.split(".")
						.filter(Boolean) // removes empty extensions (e.g. `filename...txt`)
						.slice(1)
						.join(".");

					// ctx.meta.filename ||
					const filePath = path.join(uploadDir, this.randomName() + "." + ext);
					const f = fs.createWriteStream(filePath);
					f.on("close", () => {
						this.logger.info(`Uploaded file stored in '${filePath}'`);
						fileUrls.push(filePath);

						resolve({filePath, meta: ctx.meta});
					});
					f.on("error", err => reject(err));

					ctx.params.pipe(f);
				});
			}
		},
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
		randomName() {
			let length = 8;
			let result = "";
			const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			let charactersLength = characters.length;
			for (let i = 0; i < length; i++) {
				result += characters.charAt(Math.floor(Math.random() *
					charactersLength));
			}
			return result;
		},
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
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
