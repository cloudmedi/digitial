module.exports = {
	name: "room",
	actions: {
		join(ctx) {
			this.logger.info(ctx.meta.user.username + " joined room " + ctx.params.room);
			ctx.meta.$join = ctx.params.room;
		},
		leave(ctx) {
			this.logger.info(ctx.meta.user.username + " has been leaved room " + ctx.params.room);
			ctx.meta.$leave = ctx.params.room;
		},
		list(ctx) {
			return ctx.meta.$rooms;
		}
	}
};
