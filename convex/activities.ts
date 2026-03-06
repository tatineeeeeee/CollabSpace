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

    // Use denormalized userName/userImageUrl when available, fall back to join
    const activitiesWithUsers = await Promise.all(
      activities.map(async (activity) => {
        if (activity.userName) {
          return {
            ...activity,
            userName: activity.userName,
            userImageUrl: activity.userImageUrl,
          };
        }
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
