import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership } from "./lib";

// --- Mutations ---

export const create = mutation({
  args: {
    title: v.string(),
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const existingLists = await ctx.db
      .query("lists")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxOrder = existingLists.length > 0
      ? Math.max(...existingLists.map((l) => l.order))
      : 0;

    const listId = await ctx.db.insert("lists", {
      title: args.title.trim() || "Untitled List",
      boardId: args.boardId,
      order: maxOrder + 1000,
      createdAt: Date.now(),
    });

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: board.workspaceId,
      type: "list_created",
      entityId: listId,
      entityTitle: args.title.trim() || "Untitled List",
      createdAt: Date.now(),
    });

    return listId;
  },
});

export const update = mutation({
  args: {
    id: v.id("lists"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");

    const board = await ctx.db.get(list.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.patch(args.id, { title: args.title.trim() });
  },
});

export const remove = mutation({
  args: { id: v.id("lists") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");

    const board = await ctx.db.get(list.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: board.workspaceId,
      type: "list_removed",
      entityId: args.id,
      entityTitle: list.title,
      createdAt: Date.now(),
    });

    // Cascade-delete all cards in this list
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("lists"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    if (args.items.length === 0) return;

    // Verify membership using the first item
    const firstList = await ctx.db.get(args.items[0].id);
    if (!firstList) throw new Error("List not found");

    const board = await ctx.db.get(firstList.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    for (const item of args.items) {
      await ctx.db.patch(item.id, { order: item.order });
    }
  },
});

// --- Queries ---

export const getByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board) return [];

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) return [];

    return await ctx.db
      .query("lists")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .collect();
  },
});
