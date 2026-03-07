import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // Auto-create user record if webhook hasn't fired yet
    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        name: identity.name ?? "User",
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl ?? undefined,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }

    if (!user) throw new Error("Failed to create user record");

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name.trim(),
      userId: user._id,
      icon: args.icon,
      createdAt: Date.now(),
    });

    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // Return null (not []) so callers can distinguish "unauthenticated" from "no workspaces"
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const workspaces = await Promise.all(
      memberships.map((m) => ctx.db.get(m.workspaceId))
    );

    return workspaces.filter(Boolean);
  },
});

export const getById = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const workspace = await ctx.db.get(args.id);
    if (!workspace) return null;

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.id).eq("userId", user._id)
      )
      .unique();

    if (!membership) return null;

    return workspace;
  },
});

export const update = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.id).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner")
      throw new Error("Unauthorized");

    const updates: { name?: string; icon?: string } = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.icon !== undefined) updates.icon = args.icon;

    await ctx.db.patch(args.id, updates);
  },
});

export const getMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const myMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id)
      )
      .unique();

    if (!myMembership) return [];

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId);
        return memberUser
          ? {
              userId: m.userId,
              name: memberUser.name,
              email: memberUser.email,
              imageUrl: memberUser.imageUrl,
              role: m.role,
            }
          : null;
      })
    );

    return members.filter(Boolean);
  },
});

export const remove = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.id).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner")
      throw new Error("Unauthorized");

    // Cascade-delete all related data

    // 1. Activities
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // 2. Favorites
    const allMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();
    for (const member of allMembers) {
      const favs = await ctx.db
        .query("favorites")
        .withIndex("by_user_workspace", (q) =>
          q.eq("userId", member.userId).eq("workspaceId", args.id)
        )
        .collect();
      for (const fav of favs) {
        await ctx.db.delete(fav._id);
      }
    }

    // 3. Boards → Lists → Cards → Comments
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();
    for (const board of boards) {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const card of cards) {
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_card", (q) => q.eq("cardId", card._id))
          .collect();
        for (const comment of comments) {
          await ctx.db.delete(comment._id);
        }
        await ctx.db.delete(card._id);
      }

      const lists = await ctx.db
        .query("lists")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const list of lists) {
        await ctx.db.delete(list._id);
      }
      await ctx.db.delete(board._id);
    }

    // 4. Documents + Document Versions
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();
    for (const doc of documents) {
      const versions = await ctx.db
        .query("documentVersions")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();
      for (const version of versions) {
        await ctx.db.delete(version._id);
      }
      await ctx.db.delete(doc._id);
    }

    // 5. Workspace members
    for (const member of allMembers) {
      await ctx.db.delete(member._id);
    }

    // 6. Workspace itself
    await ctx.db.delete(args.id);
  },
});
