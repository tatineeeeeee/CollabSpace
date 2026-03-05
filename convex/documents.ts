import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthenticatedUser, getOrCreateUser, verifyMembership } from "./lib";

// --- Mutations ---

export const create = mutation({
  args: {
    title: v.string(),
    workspaceId: v.id("workspaces"),
    parentDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const documentId = await ctx.db.insert("documents", {
      title: args.title.trim() || "Untitled",
      workspaceId: args.workspaceId,
      userId: user._id,
      parentDocumentId: args.parentDocumentId,
      isArchived: false,
      isPublished: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: args.workspaceId,
      type: "document_created",
      entityId: documentId,
      entityTitle: args.title.trim() || "Untitled",
      createdAt: Date.now(),
    });

    return documentId;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.coverImage !== undefined) updates.coverImage = args.coverImage;

    await ctx.db.patch(args.id, updates);

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: document.workspaceId,
      type: "document_updated",
      entityId: args.id,
      entityTitle: args.title ?? document.title,
      createdAt: Date.now(),
    });
  },
});

export const updateContent = mutation({
  args: {
    id: v.id("documents"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const recursiveArchive = async (parentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent", (q) => q.eq("parentDocumentId", parentId))
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: true });
        await recursiveArchive(child._id);
      }
    };

    await ctx.db.patch(args.id, { isArchived: true });
    await recursiveArchive(args.id);

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: document.workspaceId,
      type: "document_archived",
      entityId: args.id,
      entityTitle: document.title,
      createdAt: Date.now(),
    });
  },
});

export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    // If parent is archived, move this doc to root
    if (document.parentDocumentId) {
      const parent = await ctx.db.get(document.parentDocumentId);
      if (parent?.isArchived) {
        await ctx.db.patch(args.id, {
          isArchived: false,
          parentDocumentId: undefined,
        });
      } else {
        await ctx.db.patch(args.id, { isArchived: false });
      }
    } else {
      await ctx.db.patch(args.id, { isArchived: false });
    }

    // Recursively restore children
    const recursiveRestore = async (parentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent", (q) => q.eq("parentDocumentId", parentId))
        .collect();

      for (const child of children) {
        if (child.isArchived) {
          await ctx.db.patch(child._id, { isArchived: false });
          await recursiveRestore(child._id);
        }
      }
    };

    await recursiveRestore(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    if (!document.isArchived) throw new Error("Document must be archived before deleting");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    // Recursively delete children
    const recursiveDelete = async (parentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent", (q) => q.eq("parentDocumentId", parentId))
        .collect();

      for (const child of children) {
        await recursiveDelete(child._id);
        await ctx.db.delete(child._id);
      }
    };

    await recursiveDelete(args.id);
    await ctx.db.delete(args.id);
  },
});

export const togglePublish = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const newPublished = !document.isPublished;

    await ctx.db.patch(args.id, {
      isPublished: newPublished,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activities", {
      userId: user._id,
      workspaceId: document.workspaceId,
      type: "document_published",
      entityId: args.id,
      entityTitle: document.title,
      metadata: JSON.stringify({ published: newPublished }),
      createdAt: Date.now(),
    });

    return newPublished;
  },
});

// --- Queries ---

export const getByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    parentDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) return [];

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_parent", (q) =>
        q
          .eq("workspaceId", args.workspaceId)
          .eq("parentDocumentId", args.parentDocumentId)
          .eq("isArchived", false)
      )
      .collect();

    return documents;
  },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const document = await ctx.db.get(args.id);
    if (!document) return null;

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) return null;

    return document;
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

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();

    const searchTerm = args.query.toLowerCase();
    return documents
      .filter((doc) => doc.title.toLowerCase().includes(searchTerm))
      .slice(0, 20);
  },
});

export const getArchived = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) return [];

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", true)
      )
      .collect();

    return documents;
  },
});

export const getPublishedById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) return null;
    if (!document.isPublished) return null;
    if (document.isArchived) return null;

    return document;
  },
});

export const getAncestors = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const ancestors: Array<{ _id: Id<"documents">; title: string; icon?: string }> = [];
    let currentId: Id<"documents"> | undefined = args.id;

    let depth = 0;
    while (currentId && depth < 10) {
      const doc: Doc<"documents"> | null = await ctx.db.get(currentId);
      if (!doc) break;

      if (depth === 0) {
        const membership = await verifyMembership(ctx, user._id, doc.workspaceId);
        if (!membership) return null;
      }

      ancestors.unshift({ _id: doc._id, title: doc.title, icon: doc.icon });
      currentId = doc.parentDocumentId;
      depth++;
    }

    return ancestors;
  },
});

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

    const limit = args.limit ?? 10;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();

    return documents
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  },
});
