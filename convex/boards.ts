import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, getOrCreateUser, verifyMembership, logActivity } from "./lib";

// --- Mutations ---

export const create = mutation({
  args: {
    title: v.string(),
    workspaceId: v.id("workspaces"),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const boardId = await ctx.db.insert("boards", {
      title: args.title.trim() || "Untitled Board",
      workspaceId: args.workspaceId,
      userId: user._id,
      icon: args.icon,
      description: args.description,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logActivity(ctx, user, {
      workspaceId: args.workspaceId,
      type: "board_created",
      entityId: boardId,
      entityTitle: args.title.trim() || "Untitled Board",
    });

    return boardId;
  },
});

export const update = mutation({
  args: {
    id: v.id("boards"),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.description !== undefined) updates.description = args.description;
    if (args.backgroundColor !== undefined) updates.backgroundColor = args.backgroundColor;

    await ctx.db.patch(args.id, updates);

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "board_updated",
      entityId: args.id,
      entityTitle: args.title ?? board.title,
    });
  },
});

export const archive = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.patch(args.id, { isArchived: true, updatedAt: Date.now() });

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "board_archived",
      entityId: args.id,
      entityTitle: board.title,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    if (!board.isArchived) throw new Error("Board must be archived before deleting");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "board_archived",
      entityId: args.id,
      entityTitle: board.title,
      metadata: JSON.stringify({ deleted: true }),
    });

    // Cascade-delete all cards
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Cascade-delete all lists
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const list of lists) {
      await ctx.db.delete(list._id);
    }

    await ctx.db.delete(args.id);
  },
});

// --- Queries ---

export const getByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) return [];

    return await ctx.db
      .query("boards")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const board = await ctx.db.get(args.id);
    if (!board) return null;

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) return null;

    return board;
  },
});

export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) return [];

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();

    const searchTerm = args.query.toLowerCase();
    return boards
      .filter((b) => b.title.toLowerCase().includes(searchTerm))
      .slice(0, 20);
  },
});
