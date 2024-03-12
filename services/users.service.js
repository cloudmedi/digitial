"use strict";

const {MoleculerClientError} = require("moleculer").Errors;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");
const {ObjectId} = require("mongodb");

module.exports = {
	name: "users",
	mixins: [
		DbService("users"),
		CacheCleanerMixin([
			"cache.clean.users",
		])
	],

	/**
	 * Default settings
	 */
	settings: {
		/** REST Basepath */
		rest: "/",

		/** Secret for JWT */
		JWT_SECRET: process.env.JWT_SECRET || "jwt-conduit-secret",

		/** Public fields */
		fields: [
			"_id",
			"admin",
			"username",
			"email",
			"phone",
			"email_verified_at",
			"email_verify_code",
			"status"
		],

		/** Validator schema for entity */
		entityValidator: {
			admin: {type: "string", min: 2},
			username: {type: "string", min: 2},
			password: {type: "string", min: 6},
			email: {type: "email"},
			phone: {type: "string"},
		},
		populates: {
			profile: {
				action: "user_profile.getWUser"
			}
		}
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
		ping: {
			rest: "GET /ping",
			params: {},
			async handler(ctx) {
				ctx.call("io.broadcast", {
					namespace: "/", //optional
					event: "hello",
					args: ["my", "friends", "!"], //optional
					volatile: true, //optional
					local: true, //optional
					//rooms: ["room1", "room2"] //optional
				});
			}
		},
		/**
		 * Register a new user
		 *
		 * @actions
		 * @param {Object} user - User entity
		 *
		 * @returns {Object} Created entity & token
		 */
		create: {
			rest: "POST /users",
			params: {
				username: {type: "string", min: 2},
				password: {type: "string", min: 6},
				email: {type: "email"},
			},
			async handler(ctx) {
				let entity = ctx.params;
				//await this.validateEntity(entity);
				if (entity.username) {
					const found = await this.adapter.findOne({username: entity.username});
					if (found)
						throw new MoleculerClientError("Username is exist!", 422, "", [{
							field: "username",
							message: "is exist"
						}]);
				}

				if (entity.email) {
					const found = await this.adapter.findOne({email: entity.email});
					if (found)
						throw new MoleculerClientError("Email is exist!", 422, "", [{
							field: "email",
							message: "is exist"
						}]);
				}

				if (entity.phone) {
					const found = await this.adapter.findOne({phone: entity.phone});
					if (found)
						throw new MoleculerClientError("phone is exist!", 422, "", [{
							field: "phone",
							message: "is exist"
						}]);
				}

				entity.password = bcrypt.hashSync(entity.password, 10);
				entity.bio = entity.bio || "";
				entity.image = entity.image || null;
				entity.createdAt = new Date();
				entity.email_verified_at = null;
				entity.email_verify_code = this.randomCode();
				entity.status = false;

				const doc = await this.adapter.insert(entity);
				const user = await this.transformDocuments(ctx, {}, doc);

				const json = await this.transformEntity(user, true, ctx.meta.token);
				await this.entityChanged("created", json, ctx);
				await ctx.call("wallet.create", {
					wallet: {
						user: json.user._id.toString(),
						amount: 0.000001,
						currency: "try"
					}
				});

				return json;
			}
		},

		/**
		 * Login with username & password
		 *
		 * @actions
		 * @param {Object} user - User credentials
		 *
		 * @returns {Object} Logged in user with token
		 */
		login: {
			rest: "POST /users/login",
			params: {
				user: {
					type: "object",
					props: {
						email: {type: "email"},
						password: {type: "string", min: 1}
					}
				}
			},
			async handler(ctx) {
				const {email, password} = ctx.params.user;

				const user = await this.adapter.findOne({email});
				if (!user) {
					throw new MoleculerClientError("Email or password is invalid!", 422, "", [{
						field: "email",
						message: "is not found"
					}]);
				}

				const res = await bcrypt.compare(password, user.password);
				if (!res) {
					throw new MoleculerClientError("Wrong password!", 422, "", [{
						field: "password",
						message: "is not found"
					}]);
				}

				// Transform user entity (remove password and all protected fields)
				const doc = await this.transformDocuments(ctx, {}, user);
				if (doc.status) {
					ctx.meta.$join = doc._id;
					ctx.meta.$join = "lobby";
					return await this.transformEntity(doc, true, ctx.meta.token);
				} else {
					throw new MoleculerClientError("Verify E-mail!", 422, "", [{
						field: "email",
						message: "haven't verified"
					}]);
				}
			}
		},

		/**
		 * Get user by JWT token (for API GW authentication)
		 *
		 * @actions
		 * @param {String} token - JWT token
		 *
		 * @returns {Object} Resolved user
		 */
		resolveToken: {
			cache: {
				keys: ["token"],
				ttl: 60 * 60 // 1 hour
			},
			params: {
				token: "string"
			},
			async handler(ctx) {
				const decoded = await new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, this.settings.JWT_SECRET, (err, decoded) => {
						if (err)
							return reject(err);

						resolve(decoded);
					});
				});

				if (decoded.id)
					return this.getById(decoded.id);
			}
		},

		/**
		 * Get current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @returns {Object} User entity
		 */
		me: {
			auth: "required",
			rest: "GET /user",
			cache: {
				keys: ["#userID"]
			},
			async handler(ctx) {
				const user = await this.getById(ctx.meta.user._id);
				if (!user)
					throw new MoleculerClientError("User not found!", 400);

				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			}
		},

		/**
		 * Update current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @param {Object} user - Modified fields
		 * @returns {Object} User entity
		 */
		updateMyself: {
			auth: "required",
			rest: "PUT /user",
			params: {
				user: {
					type: "object", props: {
						username: {type: "string", min: 2, optional: true, pattern: /^[a-zA-Z0-9]+$/},
						password: {type: "string", min: 6, optional: true},
						email: {type: "email", optional: true},
						bio: {type: "string", optional: true},
						image: {type: "string", optional: true},
					}
				}
			},
			async handler(ctx) {
				const newData = ctx.params.user;
				if (newData.username) {
					const found = await this.adapter.findOne({username: newData.username});
					if (found && found._id.toString() !== ctx.meta.user._id.toString())
						throw new MoleculerClientError("Username is exist!", 422, "", [{
							field: "username",
							message: "is exist"
						}]);
				}

				if (newData.email) {
					const found = await this.adapter.findOne({email: newData.email});
					if (found && found._id.toString() !== ctx.meta.user._id.toString())
						throw new MoleculerClientError("Email is exist!", 422, "", [{
							field: "email",
							message: "is exist"
						}]);
				}
				newData.updatedAt = new Date();
				const update = {
					"$set": newData
				};
				const doc = await this.adapter.updateById(ctx.meta.user._id, update);

				const user = await this.transformDocuments(ctx, {}, doc);
				const json = await this.transformEntity(user, true, ctx.meta.token);
				await this.entityChanged("updated", json, ctx);
				return json;
			}
		},

		list: {
			auth: "required",
			rest: "GET /users",
		},

		get: {
			auth: "required",
			rest: "GET /users/:id",
		},

		update: {
			auth: "required",
			rest: "PUT /users/:id"
		},

		remove: false,

		/**
		 * Get a user profile.
		 *
		 * @actions
		 *
		 * @param {String} username - Username
		 * @returns {Object} User entity
		 */
		profile: {
			cache: {
				keys: ["#userID", "username"]
			},
			rest: "GET /profiles/:username",
			params: {
				username: {type: "string"}
			},
			async handler(ctx) {
				const user = await this.adapter.findOne({username: ctx.params.username});
				if (!user)
					throw new MoleculerClientError("User not found!", 404);
				const profile = await ctx.call("v1.profile.getWUser", { user: user._id.toString()});
				return profile;
			}
		},

		/**
		 * Verify e-mail
		 *
		 * @actions
		 *
		 * @param {String} username - Unfollowed username
		 * @returns {Object} Current user entity
		 */
		verify_email: {
			rest: "POST /users/email_verify",
			params: {
				code: {type: "string"}
			},
			async handler(ctx) {
				const user = await this.adapter.findOne({email_verify_code: ctx.params.code});
				if (!user)
					throw new MoleculerClientError("Wrong Verification Code!", 404);

				let newData = user;
				newData.updatedAt = new Date();
				newData.email_verify_code = "";
				newData.email_verified_at = new Date();
				newData.status = true;

				const update = {
					"$set": newData
				};
				const doc = await this.adapter.updateById(user._id, update);
				const userNew = await this.transformDocuments(ctx, {}, doc);
				const json = await this.transformEntity(userNew, true, ctx.meta.token);
				await this.entityChanged("updated", json, ctx);
				return json;
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		randomCode() {
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
		 * Generate a JWT token from user entity
		 *
		 * @param {Object} user
		 */
		generateJWT(user) {
			const today = new Date();
			const exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			return jwt.sign({
				id: user._id,
				username: user.username,
				exp: Math.floor(exp.getTime() / 1000)
			}, this.settings.JWT_SECRET);
		},

		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 *
		 * @param {Object} user
		 * @param {Boolean} withToken
		 */
		transformEntity(user, withToken, token) {
			if (user) {
				//user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=robohash";
				user.image = user.image || "";
				if (withToken)
					user.token = token || this.generateJWT(user);
			}

			return {user};
		},

		/**
		 * Transform returned user entity as profile.
		 *
		 * @param {Context} ctx
		 * @param {Object} user
		 * @param {Object?} loggedInUser
		 */
		async transformProfile(ctx, user, loggedInUser) {
			//user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=robohash";
			user.image = user.image || "https://static.productionready.io/images/smiley-cyrus.jpg";

			if (loggedInUser) {
				user.following = await ctx.call("follows.has", {
					user: loggedInUser._id.toString(),
					follow: user._id.toString()
				});
			} else {
				user.following = false;
			}

			return {profile: user};
		}
	}
};
