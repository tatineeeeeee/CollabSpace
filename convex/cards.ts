import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership, logActivity } from "./lib";

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

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "card_created",
      entityId: cardId,
      entityTitle: args.title.trim() || "Untitled Card",
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
    checklistItems: v.optional(
      v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          completed: v.boolean(),
        })
      )
    ),
    coverColor: v.optional(v.string()),
    coverImage: v.optional(v.string()),
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

    // Validate assignee is a workspace member
    if (args.assigneeId) {
      const assigneeMembership = await verifyMembership(ctx, args.assigneeId, board.workspaceId);
      if (!assigneeMembership) throw new Error("Assignee is not a member of this workspace");
    }

    // Validate input bounds
    if (args.title !== undefined && args.title.length > 500) {
      throw new Error("Title must be under 500 characters");
    }
    if (args.description !== undefined && args.description.length > 100_000) {
      throw new Error("Description must be under 100,000 characters");
    }
    if (args.labels !== undefined && args.labels.length > 50) {
      throw new Error("Cannot have more than 50 labels");
    }
    if (args.checklistItems !== undefined && args.checklistItems.length > 200) {
      throw new Error("Cannot have more than 200 checklist items");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.description !== undefined) updates.description = args.description;
    if (args.labels !== undefined) updates.labels = args.labels;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.checklistItems !== undefined) updates.checklistItems = args.checklistItems;
    if (args.coverColor !== undefined) updates.coverColor = args.coverColor;
    if (args.coverImage !== undefined) updates.coverImage = args.coverImage;

    await ctx.db.patch(args.id, updates);

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "card_updated",
      entityId: args.id,
      entityTitle: args.title ?? card.title,
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

    // Snapshot current listIds to detect cross-list moves
    const snapshots = await Promise.all(
      args.items.map(async (item) => ({
        item,
        card: await ctx.db.get(item.id),
      }))
    );

    for (const { item } of snapshots) {
      await ctx.db.patch(item.id, {
        listId: item.listId,
        order: item.order,
        updatedAt: Date.now(),
      });
    }

    // Log activity only for cards that moved between lists
    for (const { item, card } of snapshots) {
      if (card && item.listId !== card.listId) {
        await logActivity(ctx, user, {
          workspaceId: board.workspaceId,
          type: "card_moved",
          entityId: item.id,
          entityTitle: card.title,
          metadata: JSON.stringify({
            fromListId: card.listId,
            toListId: item.listId,
          }),
        });
      }
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

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "card_archived",
      entityId: args.id,
      entityTitle: card.title,
    });
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

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "card_archived",
      entityId: args.id,
      entityTitle: card.title,
      metadata: JSON.stringify({ deleted: true }),
    });

    await ctx.db.delete(args.id);
  },
});

export const duplicate = mutation({
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

    const existingCards = await ctx.db
      .query("cards")
      .withIndex("by_list_order", (q) => q.eq("listId", card.listId))
      .collect();

    const maxOrder = existingCards.length > 0
      ? Math.max(...existingCards.map((c) => c.order))
      : 0;

    const newTitle = `${card.title} (copy)`;
    const cardId = await ctx.db.insert("cards", {
      title: newTitle,
      description: card.description,
      listId: card.listId,
      boardId: card.boardId,
      order: maxOrder + 1000,
      labels: card.labels,
      dueDate: card.dueDate,
      assigneeId: card.assigneeId,
      checklistItems: card.checklistItems,
      coverColor: card.coverColor,
      coverImage: card.coverImage,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logActivity(ctx, user, {
      workspaceId: board.workspaceId,
      type: "card_created",
      entityId: cardId,
      entityTitle: newTitle,
    });

    return cardId;
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
      .query("cards")
      .withIndex("by_board_archived", (q) =>
        q.eq("boardId", args.boardId).eq("isArchived", false)
      )
      .collect();
  },
});
