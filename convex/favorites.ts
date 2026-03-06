import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership } from "./lib";

export const toggle = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, doc.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", user._id).eq("documentId", args.documentId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }

    await ctx.db.insert("favorites", {
      userId: user._id,
      workspaceId: doc.workspaceId,
      documentId: args.documentId,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const getByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", user._id).eq("workspaceId", args.workspaceId)
      )
      .collect();

    const results = await Promise.all(
      favorites.map(async (fav) => {
        const doc = await ctx.db.get(fav.documentId);
        if (!doc || doc.isArchived) return null;
        return {
          _id: fav._id,
          documentId: fav.documentId,
          title: doc.title,
          icon: doc.icon,
        };
      })
    );

    return results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
});

export const isFavorited = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return false;

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", user._id).eq("documentId", args.documentId)
      )
      .first();

    return !!existing;
  },
});
