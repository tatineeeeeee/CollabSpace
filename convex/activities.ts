import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership } from "./lib";

export const getRecent = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) return [];

    const limit = args.limit ?? 20;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_workspace_recent", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(limit);

    const activitiesWithUsers = await Promise.all(
      activities.map(async (activity) => {
        const activityUser = await ctx.db.get(activity.userId);
        return {
          ...activity,
          userName: activityUser?.name ?? "Unknown",
          userImageUrl: activityUser?.imageUrl,
        };
      })
    );

    return activitiesWithUsers;
  },
});
