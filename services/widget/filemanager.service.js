"use strict";

const {MoleculerClientError} = require("moleculer").Errors;
const {ForbiddenError} = require("moleculer-web").Errors;
const fs = require("fs");
const path = require("path");
const {ObjectId} = require("mongodb");

const config = require("config");
const domains = config.get("DOMAINS");

const DbMixin = require("../../mixins/db.mixin");


/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "filemanager",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("folders")],
	whitelist: [],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"user",
			"name",
			"parent",
			"left",
			"right",
			"updatedAt",
			"createdAt"
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
		}
	},
	events: {
		// Subscribe to `user.created` event
		async "image.created"(image_row) {
			//console.log("User created:", user);
			await this.updateImage(image_row);
			setTimeout(() => {
				try {
					console.log("image_row", image_row,);
					console.log("silme başladı");
					const file = path.join(__dirname, "../../", "/public", image_row.path, image_row.file);
					fs.unlinkSync(file);

					console.log(file, "deleted");
				} catch (e) {
					console.log(e);
				}
			}, 1000 * 60 * 2);

		},

		"user.created"(user) {
			//console.log("User created:", user);
			const user_id = user.user._id;
			this.broker.call("v1.filemanager.create", {
				user: user_id,
				name: "default",
				parent: null,
				left: 0,
				right: 0,
				createdAt: new Date(),
				updatedAt: null,
				status: true,

			}).catch(e => console.log(e));

		},
	},
	/**
	 * Actions
	 */
	actions: {
		create: {
			auth: "required",
			params: {
				name: {type: "string"},
				parent: {type: "string", default: null},
			},
			async handler(ctx) {
				const {name, parent, createdAt, updatedAt, status, user} = ctx.params;
				let left = 0, right = 0, setted_parent = null;
				if (parent !== "") {
					left = 1;
					right = 0;
					setted_parent = (parent === "" ? null : new ObjectId(parent));
				}

				const data = {
					name,
					parent: setted_parent,
					left: left,
					right: right,
					createdAt,
					updatedAt,
					status,
					user
				};

				const check_folder = await ctx.call("v1.filemanager.find", {
					query: {
						name: name,
						user: new ObjectId(ctx.meta.user._id),
						parent: setted_parent,
					}
				});

				let folder = {};
				if (check_folder.length === 0) {
					folder = await this.adapter.insert(data);
				} else {
					folder = await ctx.call("v1.filemanager.update", {id: check_folder[0]._id, ...data});
				}

				return folder;
			}
		},
		/**
		 * Upload Files action.
		 *
		 * @returns
		 */
		list: {
			auth: "required",
			rest: "GET /list/:parent?",
			params: {
				parent: {type: "string", default: null, optional: true}
			},
			async handler(ctx) {
				const parent = (ctx.params.parent === undefined ? null : new ObjectId(ctx.params.parent));
				console.log("ctx.params.parent",ctx.params.parent);
				let limit = 20;
				let offset = 0;
				const entities = await this.adapter.find({
					sort: {createdAt: -1},
					limit: limit,
					offset: offset,
					query: {user: new ObjectId(ctx.meta.user._id), parent: parent}
				});
				console.log(entities);
				return await this.transformResult(ctx, entities, ctx.meta.user);
			}
		},
		getDefaultFolder: {
			auth: "required",
			rest: "GET /folder/default",
			async handler(ctx) {
				const default_folder = await ctx.call("v1.filemanager.find", {
					query: {
						user: new ObjectId(ctx.meta.user._id),
						name: "default"
					}
				});
				if (default_folder.length > 0) {
					return default_folder;
				} else {
					return await ctx.call("v1.filemanager.setDefaultFolder");
				}
			}
		},
		setDefaultFolder: {
			auth: "required",
			rest: "POST /folder/default",
			visible: "private",
			async handler(ctx) {
				const data = {
					name: "default",
					parent: ""
				};
				return await ctx.call("v1.filemanager.create", data);
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
		async updateImage(image_row) {
			await this.broker.call("v1.widget.image.update", {
				id: image_row._id,
				domain: domains.cdn,
				provider: "bunny_net",
				updatedAt: new Date()
			});
		},
		async insertFolder(data) {
			return await this.adapter.updateOne({name: data.name}, {$set: data}, {upsert: true});
		},
		async transformResult(ctx, entities, user) {
			if (Array.isArray(entities)) {
				const folders = await this.Promise.all(entities.map(item => this.transformEntity(ctx, item, user)));
				return {
					folders
				};
			} else {
				const folders = await this.transformEntity(ctx, entities);
				return {folders};
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
		await this.adapter.collection.createIndex({name: 1});
	}
};
