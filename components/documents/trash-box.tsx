"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Trash, Undo, Search } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export function TrashBox() {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [search, setSearch] = useState("");

  const documents = useQuery(
    api.documents.getArchived,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  const restore = useMutation(api.documents.restore);
  const remove = useMutation(api.documents.remove);

  const filteredDocuments = documents?.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = async (
    e: React.MouseEvent,
    docId: Id<"documents">
  ) => {
    e.stopPropagation();

    try {
      await restore({ id: docId });
      toast.success("Document restored");
    } catch {
      toast.error("Failed to restore document");
    }
  };

  const handleRemove = async (docId: Id<"documents">) => {
    try {
      await remove({ id: docId });
      toast.success("Document permanently deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (documents === undefined) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-sm"
          placeholder="Filter by title..."
        />
      </div>

      {filteredDocuments?.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          No documents in trash
        </p>
      ) : (
        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {filteredDocuments?.map((doc) => (
            <div
              key={doc._id}
              onClick={() => router.push(`/documents/${doc._id}`)}
              role="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
            >
              {doc.icon ? (
                <span className="shrink-0">{doc.icon}</span>
              ) : (
                <Trash className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{doc.title}</span>

              <div className="ml-auto flex items-center gap-0.5">
                <button
                  onClick={(e) => handleRestore(e, doc._id)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-accent"
                >
                  <Undo className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                <ConfirmDialog
                  onConfirm={() => handleRemove(doc._id)}
                  title="Delete permanently?"
                  description="This will permanently delete this document. This action cannot be undone."
                  confirmLabel="Delete"
                >
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-accent"
                  >
                    <Trash className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </ConfirmDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
