"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowUpRight, Link2 } from "lucide-react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

interface BacklinksSectionProps {
  documentId: Id<"documents">;
  workspaceId: Id<"workspaces">;
}

export function BacklinksSection({
  documentId,
  workspaceId,
}: BacklinksSectionProps) {
  const backlinks = useQuery(api.documents.getBacklinks, {
    documentId,
    workspaceId,
  });

  if (!backlinks || backlinks.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Link2 className="h-4 w-4" />
        <span>
          {backlinks.length} page{backlinks.length !== 1 ? "s" : ""} link
          {backlinks.length === 1 ? "s" : ""} to this page
        </span>
      </div>
      <div className="mt-3 space-y-1">
        {backlinks.map((doc) => (
          <Link
            key={doc._id}
            href={`/documents/${doc._id}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <span className="shrink-0 text-base">
              {doc.icon || <span className="text-muted-foreground">📄</span>}
            </span>
            <span className="truncate">{doc.title}</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
