import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthenticatedUser, getOrCreateUser, verifyMembership, logActivity } from "./lib";

// --- Mutations ---

export const create = mutation({
  args: {
    title: v.string(),
    workspaceId: v.id("workspaces"),
    parentDocumentId: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);

    const membership = await verifyMembership(ctx, user._id, args.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    if (args.title.length > 500) throw new Error("Title must be under 500 characters");
    if (args.content && args.content.length > 500_000) throw new Error("Content too large");

    const documentId = await ctx.db.insert("documents", {
      title: args.title.trim() || "Untitled",
      content: args.content,
      icon: args.icon,
      workspaceId: args.workspaceId,
      userId: user._id,
      parentDocumentId: args.parentDocumentId,
      isArchived: false,
      isPublished: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logActivity(ctx, user, {
      workspaceId: args.workspaceId,
      type: "document_created",
      entityId: documentId,
      entityTitle: args.title.trim() || "Untitled",
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
    isFullWidth: v.optional(v.boolean()),
    isSmallText: v.optional(v.boolean()),
    fontStyle: v.optional(
      v.union(v.literal("default"), v.literal("serif"), v.literal("mono"))
    ),
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

    const updates: Record<string, unknown> = { updatedAt: Date.now(), lastEditedBy: user._id };
    if (args.title !== undefined) updates.title = args.title;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.coverImage !== undefined) updates.coverImage = args.coverImage;
    if (args.isFullWidth !== undefined) updates.isFullWidth = args.isFullWidth;
    if (args.isSmallText !== undefined) updates.isSmallText = args.isSmallText;
    if (args.fontStyle !== undefined) updates.fontStyle = args.fontStyle;

    await ctx.db.patch(args.id, updates);

    await logActivity(ctx, user, {
      workspaceId: document.workspaceId,
      type: "document_updated",
      entityId: args.id,
      entityTitle: args.title ?? document.title,
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

    if (args.content.length > 500_000) throw new Error("Content too large");

    // Auto-snapshot for version history (rate-limited to 1 per 5 min)
    if (document.content) {
      const latestVersion = await ctx.db
        .query("documentVersions")
        .withIndex("by_document_created", (q) =>
          q.eq("documentId", args.id)
        )
        .order("desc")
        .first();

      const fiveMinutes = 5 * 60 * 1000;
      if (!latestVersion || Date.now() - latestVersion.createdAt >= fiveMinutes) {
        await ctx.db.insert("documentVersions", {
          documentId: args.id,
          content: document.content,
          title: document.title,
          userId: user._id,
          userName: user.name,
          createdAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.id, {
      content: args.content,
      lastEditedBy: user._id,
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

    await logActivity(ctx, user, {
      workspaceId: document.workspaceId,
      type: "document_archived",
      entityId: args.id,
      entityTitle: document.title,
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

    await logActivity(ctx, user, {
      workspaceId: document.workspaceId,
      type: "document_published",
      entityId: args.id,
      entityTitle: document.title,
      metadata: JSON.stringify({ published: newPublished }),
    });

    return newPublished;
  },
});

export const duplicate = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);

    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, doc.workspaceId);
    if (!membership) throw new Error("Not a member of this workspace");

    const newId = await ctx.db.insert("documents", {
      title: `${doc.title} (copy)`,
      content: doc.content,
      workspaceId: doc.workspaceId,
      userId: user._id,
      parentDocumentId: doc.parentDocumentId,
      icon: doc.icon,
      coverImage: doc.coverImage,
      isArchived: false,
      isPublished: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logActivity(ctx, user, {
      workspaceId: doc.workspaceId,
      type: "document_created",
      entityId: newId,
      entityTitle: `${doc.title} (copy)`,
    });

    return newId;
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

    let lastEditedByName: string | undefined;
    if (document.lastEditedBy) {
      const editor = await ctx.db.get(document.lastEditedBy);
      if (editor) lastEditedByName = editor.name;
    }

    return { ...document, lastEditedByName };
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

    // Limit initial fetch to avoid scanning entire table
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .take(500);

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

    // Fetch a reasonable amount and sort client-side
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .take(200);

    return documents
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  },
});

export const getForMention = query({
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
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .take(500);

    return documents.map((doc) => ({
      id: doc._id as string,
      title: doc.title,
      icon: doc.icon,
    }));
  },
});

export const getBacklinks = query({
  args: {
    documentId: v.id("documents"),
    workspaceId: v.id("workspaces"),
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
      .take(500);

    // Fast string-includes check — document IDs won't appear accidentally in content
    const docIdStr = args.documentId as string;
    return documents
      .filter(
        (doc) =>
          doc._id !== args.documentId &&
          doc.content &&
          doc.content.includes(docIdStr)
      )
      .map((doc) => ({ _id: doc._id, title: doc.title, icon: doc.icon }));
  },
});
