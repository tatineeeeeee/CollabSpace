import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership } from "./lib";

// --- Mutations ---

export const create = mutation({
  args: {
    title: v.string(),
    listId: v.id("lists"),
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const existingCards = await ctx.db
      .query("cards")
      .withIndex("by_list_order", (q) => q.eq("listId", args.listId))
      .collect();

    const maxOrder = existingCards.length > 0
      ? Math.max(...existingCards.map((c) => c.order))
      : 0;

    const cardId = await ctx.db.insert("cards", {
      title: args.title.trim() || "Untitled Card",
      listId: args.listId,
      boardId: args.boardId,
      order: maxOrder + 1000,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: board.workspaceId,
      type: "card_created",
      entityId: cardId,
      entityTitle: args.title.trim() || "Untitled Card",
      createdAt: Date.now(),
    });

    return cardId;
  },
});

export const update = mutation({
  args: {
    id: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    labels: v.optional(
      v.array(v.object({ name: v.string(), color: v.string() }))
    ),
    dueDate: v.optional(v.number()),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.labels !== undefined) updates.labels = args.labels;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;

    await ctx.db.patch(args.id, updates);

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: board.workspaceId,
      type: "card_updated",
      entityId: args.id,
      entityTitle: args.title ?? card.title,
      createdAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("cards"),
        listId: v.id("lists"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    if (args.items.length === 0) return;

    const firstCard = await ctx.db.get(args.items[0].id);
    if (!firstCard) throw new Error("Card not found");

    const board = await ctx.db.get(firstCard.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    for (const item of args.items) {
      await ctx.db.patch(item.id, {
        listId: item.listId,
        order: item.order,
        updatedAt: Date.now(),
      });
    }
  },
});

export const archive = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.patch(args.id, { isArchived: true, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");
    if (!card.isArchived) throw new Error("Card must be archived before deleting");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.delete(args.id);
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

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return cards.filter((c) => !c.isArchived);
  },
});
