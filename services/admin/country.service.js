"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const {ObjectId} = require("mongodb");
const _ = require("lodash");
const months = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "admin/country",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [DbMixin("countries"),
		CacheCleanerMixin([
			"cache.clean.countries",
		])],
	whitelist: [
		"country.list",
		"country.get",
	],
	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"sub_id",
			"name",
			"iso3",
			"iso2",
			"numeric_code",
			"phone_code",
			"capital",
			"currency",
			"currency_name",
			"currency_symbol",
			"tld",
			"native",
			"region",
			"region_id",
			"subregion",
			"subregion_id",
			"nationality",
			"timezones",
			"translations",
			"latitude",
			"longitude",
			"emoji",
			"emojiU",
			"states"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {},
		populates: {}
	},
	/**
	 * Actions
	 */
	actions: {
		get: {
			auth: "required",
			cache: {
				keys: ["id"],
				ttl: 60 * 60 // 1 hour
			},
			params: {
				id: {type: "string"}
			},
			async handler(ctx) {
				const country = ctx.params.id;
				const selectedCountry = await this.adapter.findOne({_id: new ObjectId(country)});
				const holidays = await ctx.call("v1.admin/holiday.all");

				const data = {
					country: country,
					states: _.map(selectedCountry.states, (state) => ({
						state_code: state.state_code,
						sub_id: state.sub_id,
						name: state.name,
						holidays: _.map(holidays, (holiday) => {
							let holiday_temp = _.cloneDeep(holiday);

							const selected = _.filter(state.holidays, (v) => v.holiday.toString() === holiday._id && v.dates.length > 0);

							holiday_temp.status = selected.length > 0;
							holiday_temp.dates = _.map(months, (month) => ({
								status: selected.length > 0 && selected[0].dates.includes(month),
								month
							}));

							return holiday_temp;
						}),
					})),
				};

				return data;
			}
		},
		list: {
			auth: "required",
		},
		all: {
			auth: "required",
			cache: {
				keys: ["id"],
				ttl: 60 * 60 // 1 hour
			},
			rest: "GET /all",
			async handler(ctx) {
				//const docs = await this.adapter.find({fields: ["_id", "name"]});
				const docs = await ctx.call("v1.admin/country.find", {
					fields: ["_id", "name", "iso2"]
				});
				return docs;
			},
		},
		update: {
			auth: "required",
			params: {
				id: {type: "string"},
				states: {type: "array"},
				country: {type: "string"}
			},
			async handler(ctx) {
				const updatedStates = ctx.params.country.states;
				const country_id = new ObjectId(ctx.params.id);
				const country = await this.adapter.findOne({_id: country_id});
				const updated_states = [];

				// Kayıtlı olan States datası
				_.forEach(country.states, (state, index) => {
					//console.log(state.sub_id, state.name, state.holidays);
					const updated_states = [];
					// kayıtlı state'in klonunu alıyoruz
					const new_state = _.cloneDeep(state);
					// kayıtlı state, gelen güncel veri içinde var mı
					const stateIndex = _.findIndex(updatedStates, {"sub_id": Number(state.sub_id)});
					if (stateIndex !== -1) {
						// kayıtlı state datasını temizliyoruz
						new_state.holidays.length = 0;
						// gelen state holidays datası tamamını içerdiği için, yeni geleni çeviriyoruz.
						let holiday_index = 0;
						_.forEach(updatedStates[stateIndex].holidays, (new_holiday, j) => {
							// seçilmiş ayları da alıyoruz
							const months = new_holiday.dates
								.map((month) => (month.status === true ? month.month : undefined))
								.filter((month) => month !== undefined);
							if(months.length > 0) {
								new_state.holidays[holiday_index] = {
									holiday: new ObjectId(new_holiday._id),
									name: new_holiday.name,
									dates: months
								};
								holiday_index++;
								if(new_state.holidays[holiday_index] === null) {
									delete new_state.holidays[holiday_index];
								}
								//updated_states.push(new_state);
							}
						});

						country.states[index] = new_state;
					}
				});

				await this.adapter.updateById(country_id, {$set: country});

				await this.broker.cacher.clean("v1.admin/country.*");

				return country;
			}
		},
		create: false,
		find: {
			visible: "private"
		},
		count: false,
		insert: false,
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
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
