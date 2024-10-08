"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const DbMixin = require("../../mixins/db.mixin");
const { ObjectId } = require("mongodb");

/**
 * @typedef {import("moleculer").Context} Context Moleculer'in Context'i
 */

module.exports = {
    name: "group",
    version: 1,

    /**
     * Mixins
     */
    mixins: [DbMixin("groups"),],


    /**
     * Settings
     */
    settings: {
        // Available fields in the responses
        fields: [
            "_id",
            "name",
            "screens",
            "userId", // Kullanıcı ID'si (ObjectId)
            "createdAt",
            "updatedAt"
        ],

        // Validator for the `create` & `insert` actions.
        entityValidator: {
            name: "string",

        }
    },

    /**
     * Action Hooks
     */
    hooks: {
        before: {
            /**
             * Register a before hook for the `create` action.
             * It sets a default value for the createdAt and updatedAt fields.
             *
             * @param {Context} ctx
             */
            create(ctx) {
                ctx.params.createdAt = new Date();
                ctx.params.updatedAt = new Date();


                ctx.params.user = new ObjectId(ctx.meta.user._id);
                ctx.params.screens = [];
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
        /**
         * Create a new group.
         */
        create: {
            rest: "POST /",
            params: {
                name: "string",

            },
            async handler(ctx) {
                const newGroup = await this.adapter.insert(ctx.params);
                return newGroup;
            }
        },

        /**
         * Add a screen to a group.
         */
        addScreen: {
            rest: "POST /:groupId/screens",
            cache: false,
            params: {
                groupId: "string",
                screen: "object"
            },
            async handler(ctx) {
                // Grubu bul
                const group = await this.adapter.findById(ctx.params.groupId);
                if (!group) {
                    throw new MoleculerClientError("Group not found!", 404);
                }

                // Eğer screens undefined ise, boş bir dizi olarak başlat
                if (!group.screens) {
                    group.screens = [];
                }

                // Gelen screen objesini gruba ekle
                group.screens.push(ctx.params.screen.selectedScreens);

                // Grubu güncelle
                await this.adapter.updateById(ctx.params.groupId, {
                    $set: { screens: ctx.params.screen.selectedScreens }
                });

                return await this.adapter.findById(ctx.params.groupId);
            }
        },

        /**
         * List all groups.
         */
        /**
   * List all groups for the current user.
   */
        list: {
            rest: "GET /",
            cache: false,
            async handler(ctx) {
                // Kullanıcının ID'sini al
                console.log(ctx.meta)
                const userId = ctx.meta.user._id;

                // Kullanıcıya ait grupları bul
                const groups = await this.adapter.find({ user: userId });
                const doc = await this.adapter.find({query: {user: new ObjectId(ctx.meta.user._id)}});
            
                return doc
                // Grupları döndür
              
            }
        },


        /**
         * Get a specific group by ID.
         */
        get: {
            rest: "GET /groups/:id",
            cache: false,
            params: {
                id: "string"
            },
            async handler(ctx) {
                const group = await this.adapter.findById(ctx.params.id);
                if (!group) {
                    throw new MoleculerClientError("Group not found!", 404);
                }
                return group;
            }
        },

        /**
         * Update a group.
         */
        update: {
            rest: "PUT /groups/:id",
            cache: false,
            params: {
                id: "string",
                name: "string"
            },
            async handler(ctx) {
                return await this.adapter.updateById(ctx.params.id, {
                    $set: ctx.params
                });
            }
        },

        /**
         * Remove a group.
         */
        remove: {
            rest: "DELETE /groups/:id",
            cache: false,
            params: {
                id: "string"
            },
            async handler(ctx) {
                return await this.adapter.removeById(ctx.params.id);
            }
        },
        removeScreen: {
            rest: "DELETE /screens/:screenId",
            cache: false,
            params: {
                screenId: "string"
            },
            async handler(ctx) {
                // Tüm grupları çek
                const groups = await this.adapter.find();

                if (!groups || groups.length === 0) {
                    throw new MoleculerClientError("No groups found!", 404);
                }

                // Ekran silinen grup sayacını tut
                let updatedGroups = 0;

                // Her bir grup için ekranı sil
                for (const group of groups) {
                    // Eğer grup içinde ekran yoksa devam et
                    if (!group.screens || group.screens.length === 0) {
                        continue;
                    }

                    // Ekranı bul ve gruptan çıkar
                    const updatedScreens = group.screens.filter(screen => screen._id.toString() !== ctx.params.screenId);

                    // Eğer ekran sayısı değiştiyse, güncelleme yap
                    if (updatedScreens.length !== group.screens.length) {
                        await this.adapter.updateById(group._id, {
                            $set: { screens: updatedScreens }
                        });
                        updatedGroups++;
                    }
                }

                // Eğer hiç grup güncellenmediyse, ekran bulunamadı demektir
                if (updatedGroups === 0) {
                    throw new MoleculerClientError("Screen not found in any group!", 404);
                }

                return { message: `Screen removed from ${updatedGroups} groups.` };
            }
        },
        synchronize: {
            rest: "POST /:groupId/synchronize",
            cache: false,
            params: {
                groupId: "string"
            },
            async handler(ctx) {
                console.log("ctxasfasfas", ctx.params)
                const groupId = ctx.params.groupId;
                const group = await this.adapter.findById(groupId);

                if (!group) {
                    throw new MoleculerClientError("Group not found", 404);
                }

                if (group.screens && group.screens.length > 0) {
                    console.log("buraya girdi")
                    for (const screen of group.screens) {

                        await ctx.broker.call("io.broadcast", {
                            namespace: "/",
                            event: "synchronize",
                            args: ["Synchronize request", { groupId, screenId: screen._id }],
                            rooms: [`device-${screen.device._id}`]
                        });
                    }


                }
            }
        }


    },

    /**
     * Methods
     */
    methods: {
        /**
         * Seed initial data into the collection.
         */
        async seedDB() {
            // You can use this method to insert initial data if needed.
        }
    },

    /**
     * Fired after database connection establishing.
     */
    async afterConnected() {
        await this.adapter.collection.createIndex({ name: 1 });
    }
};
