import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  workspaces: defineTable({
    name: v.string(),
    userId: v.id("users"),
    icon: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  documents: defineTable({
    title: v.string(),
    content: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    parentDocumentId: v.optional(v.id("documents")),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    isArchived: v.boolean(),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_archived", ["workspaceId", "isArchived"])
    .index("by_parent", ["parentDocumentId"])
    .index("by_workspace_parent", [
      "workspaceId",
      "parentDocumentId",
      "isArchived",
    ])
    .index("by_user", ["userId"]),

  boards: defineTable({
    title: v.string(),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    isArchived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_archived", ["workspaceId", "isArchived"])
    .index("by_user", ["userId"]),

  lists: defineTable({
    title: v.string(),
    boardId: v.id("boards"),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_order", ["boardId", "order"]),

  cards: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    listId: v.id("lists"),
    boardId: v.id("boards"),
    order: v.number(),
    labels: v.optional(
      v.array(
        v.object({
          name: v.string(),
          color: v.string(),
        })
      )
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
    isArchived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_order", ["listId", "order"])
    .index("by_board", ["boardId"])
    .index("by_assignee", ["assigneeId"]),

  activities: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("document_created"),
      v.literal("document_updated"),
      v.literal("document_archived"),
      v.literal("document_published"),
      v.literal("board_created"),
      v.literal("board_updated"),
      v.literal("board_archived"),
      v.literal("card_created"),
      v.literal("card_moved"),
      v.literal("card_updated"),
      v.literal("card_archived"),
      v.literal("list_created"),
      v.literal("list_removed")
    ),
    entityId: v.string(),
    entityTitle: v.string(),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_recent", ["workspaceId", "createdAt"])
    .index("by_user", ["userId"]),
});
