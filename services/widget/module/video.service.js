"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const fs = require("fs");
const path = require("path");
const {ObjectId} = require("mongodb");
const https = require("https");
const ffmpeg = require("fluent-ffmpeg");

const DbMixin = require("../../../mixins/db.mixin");
const config = require("config");
const axios = require("axios");
const domains = config.get("DOMAINS");


/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "widget.video",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("widget_video")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"path",
			"domain",
			"folder",
			"name",
			"slug",
			"provider",
			"type",
			"file",
			"process_step",
			"meta",
			"status",
			"createdAt",
			"updatedAt",
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
				ctx.params.type = "video";
				ctx.params.meta = {};
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
					for (const val of res.fileUrls) {
						const video_row = {
							user: new ObjectId(res.meta.user._id),
							path: val.path,
							domain: domains.stream,
							folder: val.folder,
							name: val.name,
							slug: this.randomName(),
							provider: "local",
							file: val.file,
							type: "video",
							process_step: 0,
							status: true,
							meta: {},
							createdAt: new Date(),
							updatedAt: new Date()
						};

						const vid = await this.adapter.insert(video_row);
						data.push(vid);

						await this.broker.broadcast("video.create", {...video_row}, ["widget.video"]);

						this.entityChanged("created", vid, ctx);

					}
					return data[0];
				}
			}

		}
	},

	events: {
		// Subscribe to `user.created` event
		async "video.create"(video_row) {
			console.log("video_create event");
			this.bunnyUpload(video_row).then(() => {
				this.broker.broadcast("video.moved", {...video_row}, ["filemanager"]);
			});
		},
		async "folder.created"(folder) {
			const user_id = folder.folder.user;
			const default_videos = [
				{
					"user": user_id,
					"path": "upload/65ff33cdd9affc5019e9ca4f/663e998e1bd509ff62c5c669",
					"domain": "stream.maiasignage.com",
					"folder": new ObjectId(folder.folder._id),
					"name": "3320517-uhd_2160_3840_25fps.mp4",
					"slug": "defvid1",
					"provider": "bunny_net",
					"file": "defvid1.jpg",
					"type": "video",
					"process_step": 0,
					"status": 1,
					"createdAt": new Date(),
					"updatedAt": new Date(),
				}
			];

			//await this.adapter.insertMany(default_videos);
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
					name: "video",
					params: ["path", "domain", "place", "width", "height"],
					status: true
				};
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
			auth: "required",
			/*
			* cache: {
				keys: ["#userID", "folder", "page", "perPage"]
			},
			* */
			cache: false,
			params: {
				folder: {type: "string", default: null, optional: true},
				limit: {type: "string", default: 20},
				offset: {type: "string", default: 0}
			},
			async handler(ctx) {
				let limit = ctx.params.limit;
				let offset = ctx.params.offset;

				let list_query = {
					sort: {createdAt: -1},
					limit: limit,
					offset: offset,
					query: {user: new ObjectId(ctx.meta.user._id)}
				};

				if (ctx.params.folder) {
					list_query.query.folder = new ObjectId(ctx.params.folder);
				}

				const entities = await this.adapter.find(list_query);
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
				let query = {user: new ObjectId(ctx.meta.user._id), status: true};
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
				return {video: entity};
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
		remove: {
			auth: "required",
			params: {
				id: "string"
			},
			async handler(ctx) {
				const delete_bunny = await this.bunny_delete_video(ctx.params.id);
				if(delete_bunny) {
					await this.adapter.removeById( ctx.params.id);
				}

				return {
					status: "success",
					message: "Source Removed successfully",
					id: ctx.params.id,
				};
			}
		},
		create: false,
		webhook: {
			rest: "POST /webhook",
			auth: false,
			params: {
				VideoLibraryId: "number",
				VideoGuid: "string",
				Status: "number"
			},
			async handler(ctx) {

			}
		}

	},

	/**
	 * Methods
	 */
	methods: {
		async bunny_delete_video(id) {
			const api_info = (config.get("provider_creds"))["bunny_net"];
			const ACCESS_KEY = api_info.video.api_key;
			const DEFAULT_LIB_ID = api_info.video.default_lib_id ?? 239233;

			const video = await this.adapter.findOne({_id: new ObjectId(id)});
			if (video && video.process_step >= 2) {
				const options = {
					method: "DELETE",
					url: `https://video.bunnycdn.com/library/${DEFAULT_LIB_ID}/videos/${video.meta.video_id}`,
					headers: {
						accept: "application/json",
						AccessKey: ACCESS_KEY
					}
				};

				return axios
					.request(options)
					.then(function (response) {
						return response.data;
					})
					.catch(function (error) {
						throw new MoleculerClientError("Connection Error", error.statusCode, "", [{
							field: "widget.video",
							message: error.message
						}]);
					});
			}

			await this.adapter.removeById(video._id);
		},
		getVideoDuration(videoPath) {
			return new Promise((resolve, reject) => {
				ffmpeg.ffprobe(videoPath, (err, metadata) => {
					if (err) {
						return reject(err);
					}
					console.log(metadata.format.duration);
					resolve(metadata.format.duration);
				});
			});
		},
		process_step(step = null) {
			const steps = [
				{step: 0, description: "Video uploaded"},
				{step: 1, description: "Video meta created"},
				{step: 2, description: "Video moved to cdn"},
				{step: 3, description: "Transcoding"},
				{step: 4, description: "Process done."}
			];

			if (step) {
				return steps[Number(step)];
			} else {
				return steps;
			}
		},
		bunny_process_step(step = null) {
			const process_list = [
				{step: 0, label: "Queued", description: "The video has been queued for encoding."},
				{
					step: 1,
					label: "Processing",
					description: "The video has begun processing the preview and format details."
				},
				{step: 2, label: "Encoding", description: "The video is encoding."},
				{
					step: 3,
					label: "Finished",
					description: "The video encoding has finished and the video is fully available."
				},
				{
					step: 4,
					label: "Resolution finished",
					description: "The encoder has finished processing one of the resolutions. The first request also signals that the video is now playable.",
				},
				{
					step: 5,
					label: "Failed",
					description: "The video encoding failed. The video has finished processing."
				},
				{step: 6, label: "PresignedUploadStarted", description: ": A pre-signed upload has been initiated."},
				{step: 7, label: "PresignedUploadFinished", description: ": A pre-signed upload has been completed."},
				{step: 8, label: "PresignedUploadFailed", description: ": A pre-signed upload has failed."},
				{step: 9, label: "CaptionsGenerated", description: ": Automatic captions were generated."},
				{
					step: 10,
					label: "TitleOrDescriptionGenerated",
					description: ": Automatic generation of title or description has been completed.",
				}

			];
			if (step) {
				return process_list[Number(step)];
			} else {
				return process_list;
			}
		},
		embed_code(video_id) {
			const api_info = (config.get("provider_creds"))["bunny_net"];

			return `<div style="position:relative;padding-top:56.25%;"><iframe src="https://iframe.mediadelivery.net/embed/${api_info.video.default_lib_id}/${video_id}?autoplay=true&loop=true&muted=true&preload=true&responsive=true" loading="lazy" style="border:0;position:absolute;top:0;height:100%;width:100%;" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;" allowfullscreen="true"></iframe></div>`;
		},
		async bunnyUpload(file_info) {
			const api_info = (config.get("provider_creds"))["bunny_net"];
			const FILENAME_TO_UPLOAD = file_info.file;
			const FILE_PATH = path.join(file_info.path);
			const filePath = path.join(FILE_PATH, FILENAME_TO_UPLOAD);

			const video_info = await JSON.parse(await this.createVideo(file_info));
			const video_id = video_info.guid;
			if (video_info) {
				const video_path = path.join(__dirname, "../../../", "public", filePath);

				//const bvideo_detail = await videoDuration(video_path);
				let video_duration = await this.getVideoDuration(video_path);

				file_info.meta = {...file_info.meta, video_id: video_id, duration: video_duration};
				await this.broker.call("v1.widget.video.update", {
					id: file_info._id,
					meta: file_info.meta
				});
				await this.updateVideoProcess(file_info, 1);
				await this.uploadVideo(api_info.video.default_lib_id, video_id, filePath, file_info);
			}
		},
		async createVideo(file_info) {
			const api_info = (config.get("provider_creds"))["bunny_net"];
			const HOSTNAME = `${api_info.video.api_base}`;
			const FILENAME_TO_UPLOAD = file_info.file;
			const ACCESS_KEY = api_info.video.api_key;

			return new Promise((resolve, reject) => {
				const options = {
					hostname: HOSTNAME,
					path: `/library/${api_info.video.default_lib_id}/videos`,
					method: "POST",
					headers: {
						"AccessKey": ACCESS_KEY,
						"Accept": "application/json",
						"Content-Type": "application/json"
					}
				};

				const data = JSON.stringify({
					title: FILENAME_TO_UPLOAD
				});

				const req = https.request(options, (res) => {
					let responseBody = "";

					res.on("data", (chunk) => {
						responseBody += chunk;
					});

					res.on("end", () => {
						if (res.statusCode >= 200 && res.statusCode < 300) {
							resolve(responseBody);
						} else {
							reject(new Error(`Request failed with status code ${res.statusCode}: ${responseBody}`));
						}
					});
				});

				req.on("error", (e) => {
					reject(new Error(`Problem with request: ${e.message}`));
				});

				// Request body'yi gönder
				req.write(data);
				// İsteği sonlandır
				req.end();
			});
		},
		uploadVideo(libraryId, videoId, filePath, file_info) {
			const api_info = (config.get("provider_creds"))["bunny_net"];
			const ACCESS_KEY = api_info.video.api_key;

			return new Promise((resolve, reject) => {
				const options = {
					method: "PUT",
					hostname: "video.bunnycdn.com",
					port: null,
					path: `/library/${libraryId}/videos/${videoId}`,
					headers: {
						"AccessKey": ACCESS_KEY,
						"accept": "application/json"
					}
				};

				const req = https.request(options, (res) => {
					const chunks = [];

					res.on("data", (chunk) => {
						chunks.push(chunk);
					});

					res.on("end", () => {
						const body = Buffer.concat(chunks);
						if (res.statusCode >= 200 && res.statusCode < 300) {
							this.updateVideoProcess(file_info, 2);
							resolve(body.toString());
						} else {
							reject(new Error(`Request failed with status code ${res.statusCode}: ${body.toString()}`));
						}
					});
				});

				req.on("error", (e) => {
					reject(new Error(`Problem with request: ${e.message}`));
				});

				const readStream = fs.createReadStream(path.join(__dirname, "../../../", "public", filePath));
				readStream.on("error", (err) => {
					this.broker.call("v1.widget.video.remove", {id: file_info._id});
					reject(new Error(`Problem with file stream: ${err.message}`));
				});

				// Pipe the file stream to the request
				readStream.pipe(req);
			});
		},
		async updateVideoProcess(video, step) {
			return await this.adapter.updateById(video._id, {$set: {process_step: step}});
		},
		async getVideo(file_info) {
			const api_info = (config.get("provider_creds"))["bunny_net"];
			const HOSTNAME = `${api_info.video.api_base}`;
			const ACCESS_KEY = api_info.video.api_key;

			return new Promise((resolve, reject) => {
				const options = {
					hostname: HOSTNAME,
					path: `/library/${api_info.video.default_lib_id}/videos/${file_info.meta?.video_id}`,
					method: "GET",
					headers: {
						"AccessKey": ACCESS_KEY,
						"Accept": "application/json",
						"Content-Type": "application/json"
					}
				};

				const req = https.request(options, function (res) {
					const chunks = [];

					res.on("data", function (chunk) {
						chunks.push(chunk);
					});

					res.on("end", function () {
						const body = Buffer.concat(chunks);
						if (res.statusCode >= 200 && res.statusCode < 300) {
							resolve(body.toString());
						} else {
							reject(new Error(`Request failed with status code ${res.statusCode}: ${body.toString()}`));
						}

					});
				});

				req.end();
			});

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
				const videos = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					videos
				};
			} else {
				const videos = await this.transformEntity(ctx, entities);
				return {videos};
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
		await this.adapter.collection.createIndex({user: 1});
	}
};
