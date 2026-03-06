import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership } from "./lib";

export const create = mutation({
  args: {
    cardId: v.id("cards"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    if (args.content.trim().length === 0) throw new Error("Comment cannot be empty");
    if (args.content.length > 10_000) throw new Error("Comment must be under 10,000 characters");

    return await ctx.db.insert("comments", {
      cardId: args.cardId,
      userId: user._id,
      content: args.content.trim(),
      userName: user.name,
      userImageUrl: user.imageUrl,
      createdAt: Date.now(),
    });
  },
});

export const getByCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const card = await ctx.db.get(args.cardId);
    if (!card) return [];

    const board = await ctx.db.get(card.boardId);
    if (!board) return [];

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) return [];

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_card_created", (q) => q.eq("cardId", args.cardId))
      .collect();

    // Use denormalized data when available, fall back to join for old records
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        if (comment.userName) {
          return {
            ...comment,
            userName: comment.userName,
            userImageUrl: comment.userImageUrl,
          };
        }
        const commentUser = await ctx.db.get(comment.userId);
        return {
          ...comment,
          userName: commentUser?.name ?? "Unknown",
          userImageUrl: commentUser?.imageUrl,
        };
      })
    );

    return enriched;
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");

    // Only the comment author can delete
    if (comment.userId !== user._id) {
      throw new Error("You can only delete your own comments");
    }

    // Verify workspace membership (user may have been removed since commenting)
    const card = await ctx.db.get(comment.cardId);
    if (!card) throw new Error("Card not found");

    const board = await ctx.db.get(card.boardId);
    if (!board) throw new Error("Board not found");

    const membership = await verifyMembership(ctx, user._id, board.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.delete(args.id);
  },
});
