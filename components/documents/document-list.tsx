"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { DocumentItem } from "./document-item";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface DocumentListProps {
  parentDocumentId?: Id<"documents">;
  level?: number;
}

export function DocumentList({ parentDocumentId, level = 0 }: DocumentListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const documents = useQuery(
    api.documents.getByWorkspace,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces">, parentDocumentId }
      : "skip"
  );

  const create = useMutation(api.documents.create);
  const archive = useMutation(api.documents.archive);

  const handleExpand = (docId: string) => {
    setExpanded((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const handleCreate = async (parentId?: Id<"documents">) => {
    if (!activeWorkspaceId) return;

    try {
      const docId = await create({
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        title: "Untitled",
        parentDocumentId: parentId,
      });

      if (parentId) {
        setExpanded((prev) => ({ ...prev, [parentId]: true }));
      }

      router.push(`/documents/${docId}`);
      toast.success("New document created");
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleArchive = async (e: React.MouseEvent, docId: Id<"documents">) => {
    e.stopPropagation();

    try {
      await archive({ id: docId });
      toast.success("Document moved to trash");
    } catch {
      toast.error("Failed to archive document");
    }
  };

  // Not authenticated
  if (documents === null) {
    return null;
  }

  // Loading state
  if (documents === undefined) {
    return (
      <div
        className={cn("flex flex-col gap-0.5")}
        style={{ paddingLeft: level ? `${level * 12 + 25}px` : undefined }}
      >
        <div className="h-[28px] w-full animate-pulse rounded-sm bg-muted/50" />
        {level === 0 && (
          <div className="h-[28px] w-full animate-pulse rounded-sm bg-muted/50" />
        )}
      </div>
    );
  }

  // Empty state
  if (documents.length === 0 && level > 0) {
    return (
      <p
        className="py-1 text-xs text-muted-foreground"
        style={{ paddingLeft: `${level * 12 + 25}px` }}
      >
        No pages inside
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {documents.map((doc) => (
        <div key={doc._id}>
          <DocumentItem
            id={doc._id}
            label={doc.title}
            icon={doc.icon}
            level={level}
            active={pathname === `/documents/${doc._id}`}
            expanded={expanded[doc._id]}
            onExpand={() => handleExpand(doc._id)}
            onCreate={() => handleCreate(doc._id)}
            onArchive={(e) => handleArchive(e, doc._id)}
          />
          {expanded[doc._id] && (
            <DocumentList
              parentDocumentId={doc._id}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
