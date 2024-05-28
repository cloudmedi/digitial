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
			"type",
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
				ctx.params.updatedAt = new Date();
				ctx.params.user = new ObjectId(ctx.meta.user._id);
				ctx.params.type = "image";
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
			 * @param {Response} res
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
							type: "image",
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

	events: {
		// Subscribe to `user.created` event
		async "folder.created"(folder) {
			console.log("event_fired");
			console.log(folder.folder);
			const user_id = folder.folder.user;
			const default_images = [
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "cdn.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "chalo-gallardo-6uCy44FbdqM-unsplash.jpg",
					"slug": "HuQe7jZw",
					"provider": "local",
					"file": "YFfxuBOm.jpg",
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": null,
				},
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "cdn.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "clay-banks-FPhpVpwUviA-unsplash.jpg",
					"slug": "uXnwZdmw",
					"provider": "local",
					"file": "9EEi70Nz.jpg",
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": null,
				},
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "cdn.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "anton-lammert-UH2V6BYBHtU-unsplash.jpg",
					"slug": "PKBsfIal",
					"provider": "local",
					"file": "rGmMKbOc.jpg",
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": null,
				},
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "cdn.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "omar-ram-z0VdFXfyhOk-unsplash.jpg",
					"slug": "rzjd11C2",
					"provider": "local",
					"file": "NepYRUWx.jpg",
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": null,
				},
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "cdn.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "wolfgang-hasselmann-R5hhJYZoBRA-unsplash.jpg",
					"slug": "fwE59w3L",
					"provider": "local",
					"file": "0qaLpDSU.jpg",
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": null,
				},
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "cdn.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "shiqi-zhao-18RECWIobXw-unsplash.jpg",
					"slug": "vS5VG6KH",
					"provider": "local",
					"file": "PNepmkTf.jpg",
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": null,
				}
			];

			await this.adapter.insertMany(default_images);
		},

		"user.created"(user) {
			//console.log("User created:", user);
			const user_id = user.user._id;
			this.broker.call("v1.filemanager.create", {
				user: user_id,
				name: "default",
				parent: null,
				left: 1,
				right: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				status: true,

			}).catch(e => console.log(e));

		},
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
				} else {
					folder = ctx.meta.$params.folder;
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
			rest: "GET /list",
			cache: false,
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
			cache: false,
			params: {
				folder: {type: "string", optional: true}
			},
			async handler(ctx) {
				let limit = 20;
				let offset = 0;
				let query = {user: new ObjectId(ctx.meta.user._id)};
				if (ctx.params.folder) {
					query.folder = new ObjectId(ctx.params.folder);
				}
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
			cache: false,
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
		updateByFolder: {
			rest: "PUT /update/byFolder",
			auth: "required",
			params: {
				folder: "string",
				entity: "object"
			},
			async handler(ctx) {
				return await this.adapter.updateMany({folder: new ObjectId(ctx.params.folder)}, {$set: ctx.params.entity});
			}
		},
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
