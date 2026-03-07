import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, verifyMembership, logActivity } from "./lib";

const MAX_VERSIONS = 50;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const create = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("Unauthenticated");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Access denied");

    if (!document.content) return null;

    // Rate limit: check last version timestamp
    const latestVersion = await ctx.db
      .query("documentVersions")
      .withIndex("by_document_created", (q) =>
        q.eq("documentId", args.documentId)
      )
      .order("desc")
      .first();

    if (
      latestVersion &&
      Date.now() - latestVersion.createdAt < SNAPSHOT_INTERVAL_MS
    ) {
      return null; // Too soon since last snapshot
    }

    const versionId = await ctx.db.insert("documentVersions", {
      documentId: args.documentId,
      content: document.content,
      title: document.title,
      userId: user._id,
      userName: user.name,
      createdAt: Date.now(),
    });

    // Enforce max versions limit — delete oldest if over limit
    const allVersions = await ctx.db
      .query("documentVersions")
      .withIndex("by_document_created", (q) =>
        q.eq("documentId", args.documentId)
      )
      .order("asc")
      .collect();

    if (allVersions.length > MAX_VERSIONS) {
      const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS);
      for (const version of toDelete) {
        await ctx.db.delete(version._id);
      }
    }

    return versionId;
  },
});

export const getByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const document = await ctx.db.get(args.documentId);
    if (!document) return [];

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) return [];

    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_document_created", (q) =>
        q.eq("documentId", args.documentId)
      )
      .order("desc")
      .take(MAX_VERSIONS);

    return versions;
  },
});

export const restore = mutation({
  args: {
    versionId: v.id("documentVersions"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) throw new Error("Unauthenticated");

    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");

    const document = await ctx.db.get(version.documentId);
    if (!document) throw new Error("Document not found");

    const membership = await verifyMembership(ctx, user._id, document.workspaceId);
    if (!membership) throw new Error("Access denied");

    // Snapshot current content before restoring
    if (document.content) {
      await ctx.db.insert("documentVersions", {
        documentId: document._id,
        content: document.content,
        title: document.title,
        userId: user._id,
        userName: user.name,
        createdAt: Date.now(),
      });
    }

    // Restore the selected version's content
    await ctx.db.patch(document._id, {
      content: version.content,
      lastEditedBy: user._id,
      updatedAt: Date.now(),
    });

    await logActivity(ctx, user, {
      workspaceId: document.workspaceId,
      type: "document_version_restored",
      entityId: document._id,
      entityTitle: document.title,
    });
  },
});