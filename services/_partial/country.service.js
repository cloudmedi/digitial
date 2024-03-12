"use strict";
const {MoleculerClientError} = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const CacheCleanerMixin = require("../../mixins/cache.cleaner.mixin");
const {ObjectId} = require("mongodb");
const _ = require("lodash");

/**
 * @typedef {import("moleculer").Context} Context Moleculer's Context
 */

module.exports = {
	name: "country",
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
		findByCode: {
			rest: "POST /code",
			cache: {
				keys: ["iso_country"],
				ttl: 60 * 60 * 24 * 7 // 1 week
			},
			params: {
				iso_country: {type: "string", min: "2"}
			},
			async handler(ctx) {
				let entity = ctx.params;
				await this.validateEntity(entity);

				const doc = await this.adapter.findOne({iso2: entity.iso_country});
				let json = await this.transformEntity(ctx, doc, {});

				//json = await this.transformResult(ctx, json, ctx.meta.user);
				return json;
			}
		},
		all: {
			rest: "GET /all",
			cache: {
				keys: ["iso_country"],
				ttl: 60 * 60 * 24 // 24 hours
			},
			async handler(ctx) {
				//const docs = await this.adapter.find({fields: ["_id", "name"]});
				const docs = await ctx.call("v1.country.find", {
					fields: ["_id", "name", "iso2"]
				});
				return docs;
			},
		},
		get: {
			cache: {
				keys: ["id"],
				ttl: 60 * 60 * 24 * 7 // 1 week
			},
		},
		list: {
			cache: {
				keys: ["iso_country"],
				ttl: 60 * 60 * 24 * 7 // 1 week
			},
		},
		findStateByHolidayType: {
			rest: "POST /findStateByHolidayType",
			params: {
				country: {type: "string"},
				holiday: {type: "string"},
				end_date: {type: "date", convert: true},
				start_date: {type: "date", convert: true}
			},
			async handler(ctx) {
				try {
					const {country, holiday, end_date, start_date} = ctx.params;

					// Extract relevant months efficiently
					const months = Array.from(this.getMonthsBetweenDates(start_date, end_date));
					//const country_data = await this.adapter.findOne({_id: new ObjectId(country)});

					// Construct optimized query with projection
					const filters = {
						query: {
							"_id": new ObjectId(country),
							"states.holidays": {
								$elemMatch: {
									"holiday": new ObjectId(holiday),
									"dates": {$in: months}
								}
							}
						}, projection: {
							"_id": 0,
							"states.holidays.$": 1
						}
					};
					/*
					console.log(JSON.stringify(filters));
					*/
					// Perform database query
					const country_detail = await this.adapter.find(filters);
					const result = [];
					country_detail.map(c => {
						_.forEach(c.states, state => {
							_.forEach(state.holidays, holidayObj => {
								if (holidayObj.holiday.toString() === holiday) {
									const hasCommonMonth = !_.isEmpty(_.intersection(holidayObj.dates, months));
									if (hasCommonMonth) {
										result.push({
											country: c._id,
											state: state.name,
											state_sub_id: state.sub_id,
											holiday: holidayObj.name,
											dates: holidayObj.dates
										});
									}
								}
							});
						});
					});

					// Return the states data
					return result;
				} catch (e) {
					console.error("Error finding states:", e);
					throw e; // Re-throw for potential error handling at a higher level
				}
			}
		},
		create: false,
		find: {
			visible: "private"
		},
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
		getMonthsBetweenDates(startDate, endDate) {
			const start = new Date(startDate);
			const end = new Date(endDate);

			const months = [];

			while (start <= end) {
				const monthString = new Intl.DateTimeFormat("en", {month: "short"}).format(start);
				months.push(monthString);

				// Bir sonraki ayı al
				start.setMonth(start.getMonth() + 1);
			}

			// Tekrarlayan ayları kaldır
			return [...new Set(months)];
		},

		/**
		 * Loading sample data to the collection.
		 * It is called in the DB.mixin after the database
		 * connection establishing & the collection is empty.
		 */
		async seedDB() {
			try {
				const countries_json = require("../../data/countries-states-cities.json");
				await this.adapter.insertMany(countries_json);

				const defaultHolidayRelations = [
					{
						holiday: new ObjectId("65829f7663ced5162921c2b8"),
						name: "Deniz Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2b9"),
						name: "Şehir Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2ba"),
						name: "Dağ Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2bb"),
						name: "Kırsal Tatil",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2bc"),
						name: "Tarih ve Kültür Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2bd"),
						name: "Macera Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2be"),
						name: "Wellness ve Spa Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2bf"),
						name: "Gastronomi Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2c0"),
						name: "Eğlence Tatili",
						dates: ["Jul", "Aug"]
					},
					{
						holiday: new ObjectId("65829f7663ced5162921c2c1"),
						name: "Aile Tatili",
						dates: ["Jul", "Aug"]
					}
				];
				await this.adapter.updateMany({}, {
					$set: {
						"states.$[].holidays": defaultHolidayRelations
					}
				});

				/*
				const countries = await this.adapter.find({});
				for(let country in countries) {
					for(let state in country.states) {
						const data = {
							country: country.id,
							sub_id: state.sub_id,
							name: state.name,
							state_code: state.state_code,
							latitude: state.latitude,
							longitude: state.longitude,
							type: state.type,
							cities: state.cities,
							holidays: state.holidays,
						};
					}
				}
				// 4. Update existing countries with holiday relations efficiently
				*/
			} catch (e) {
				console.error("Error seeding database:", e);
				throw e; // Re-throw to allow error handling at a higher level
			}
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
