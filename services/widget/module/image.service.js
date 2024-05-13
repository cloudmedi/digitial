"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const fs = require("fs");
const path = require("path");
const {ObjectId} = require("mongodb");
const https = require("https");

const DbMixin = require("../../../mixins/db.mixin");
const config = require("config");
const domains = config.get("DOMAINS");


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
				ctx.params.createdAt = new Date();
				ctx.params.updatedAt = null;
				ctx.params.user = new ObjectId(ctx.meta.user._id);
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
			async upload(ctx, res) {
				if (res.fileUrls.length >= 1) {

					const data = [];
					res.fileUrls.forEach((val, key) => {
						const image_row = {
							user: new ObjectId(res.meta.user._id),
							path: val.path,
							domain: domains.pre_cdn,
							folder: val.folder,
							name: val.name,
							slug: this.randomName(),
							provider: "local",
							file: val.file,
							status: 1,
							createdAt: new Date(),
							updatedAt: null
						};
						data.push(image_row);

						this.bunnyUpload(image_row).then(() => {
							this.broker.broadcast("image.created", {...image_row}, ["filemanager"]);
						});
					});
					let entity = ctx.params;

					//await this.validateEntity(entity);
					entity.createdAt = new Date();
					entity.updatedAt = new Date();
					const doc = await this.adapter.insertMany(data);
					//let json = await this.transformDocuments(ctx, {populate: ["user"]}, doc);

					//json = await this.transformResult(ctx, json, ctx.meta.user);
					await this.entityChanged("created", doc, ctx);
					return doc.reverse()[0];
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
			async handler(ctx) {

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
					},
					folder: {type: "string"}
				}
			},
			async handler(ctx) {
				let folder = null;
				if (ctx.meta.$params.folder === undefined) {
					const folder_data = await ctx.call("v1.filemanager.getDefaultFolder");
					folder = folder_data._id;
				}

				return new this.Promise((resolve, reject) => {
					let fileUrls = [];

					let uploadDir = `./public/upload/${ctx.meta.user._id.toString()}/${folder}`;

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
					const fileName = this.randomName() + "." + ext;
					const filePath = path.join(uploadDir, fileName);
					const f = fs.createWriteStream(filePath);
					f.on("close", () => {
						this.logger.info(`Uploaded file stored in '${filePath}'`);
						fileUrls.push({
							path: uploadDir.replace("./public/", ""),
							name: ctx.meta.filename,
							file: fileName,
							folder: new ObjectId(folder)
						});
						resolve({fileUrls, meta: ctx.meta});
					});
					f.on("error", err => reject(err));

					ctx.params.pipe(f);
				});
			}
		},
		list: {
			auth: "required",
			async handler(ctx) {
				let limit = 20;
				let offset = 0;
				const entities = await this.adapter.find({
					sort: {createdAt: -1},
					limit: limit,
					offset: offset,
					query: {user: new ObjectId(ctx.meta.user._id)}
				});
				return await this.transformResult(ctx, entities, ctx.meta.user);
			}
		},
		listByFolder: {
			auth: "required",
			params: {
				folder: {type: "string", optional: true}
			},
			async handler(ctx) {
				let limit = 20;
				let offset = 0;
				let query = {user: new ObjectId(ctx.meta.user._id)};
				if(ctx.params.folder) {
					query.folder = new ObjectId(ctx.params.folder);
				}
				console.log(query);
				const entities = await this.adapter.find({
					sort: {createdAt: -1},
					limit: limit,
					offset: offset,
					query: query
				});
				return await this.transformResult(ctx, entities, ctx.meta.user);
			}
		},
		get: {
			auth: "required",
			params: {
				id: {type: "string"}
			},
			async handler(ctx) {
				const entity = await this.adapter.findOne({_id: new ObjectId(ctx.params.id)});
				return {image: entity};
			}
		},
		count: false,
		insert: false,
		update: {
			auth: "required",
		},
		remove: false
	},

	/**
	 * Methods
	 */
	methods: {
		async bunnyUpload(file_info) {
			/*
			console.log("bunny", file_info);

				curl --request PUT --url https://storage.bunnycdn.com/maiasignage/layouts.png --header 'AccessKey: 0f7cf934-031e-4561-bc9bb9420448-a1ea-48ee' --header 'Content-Type: application/octet-stream' --header 'accept: application/json' --data-binary ./layouts.png
				* */
			const api_info = (config.get("provider_creds"))["bunny_net"];
			const HOSTNAME = api_info.region ? `${api_info.region}.${api_info.hostname}` : api_info.hostname;
			const STORAGE_ZONE_NAME = api_info.username;
			const FILENAME_TO_UPLOAD = file_info.file;
			const FILE_PATH = path.join(file_info.path);
			//const FILE_PATH = path.join("./public", file_info.path);
			const ACCESS_KEY = api_info.api_key;
			const filePath = path.join(FILE_PATH, FILENAME_TO_UPLOAD);

			const readStream = fs.createReadStream("./public/" + filePath);

			const options = {
				method: "PUT",
				host: HOSTNAME,
				path: `/${STORAGE_ZONE_NAME}/${FILE_PATH}/${FILENAME_TO_UPLOAD}`,
				headers: {
					AccessKey: ACCESS_KEY,
					"Content-Type": "application/octet-stream",
				},
			};

			const req = https.request(options, (res) => {
				res.on("data", (chunk) => {
					console.log(chunk.toString("utf8"));
				});
			});

			req.on("error", (error) => {
				console.error(error);
			});
			//fs.unlinkSync(filePath);
			readStream.pipe(req);
		},
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
		async findByUser(user) {
			return await this.adapter.find({query: {user: new ObjectId(user)}});
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
				const images = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					images
				};
			} else {
				const images = await this.transformEntity(ctx, entities);
				return {images};
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
