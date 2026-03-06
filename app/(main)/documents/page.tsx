"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export default function DocumentsPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspaceStore();
  const createDocument = useMutation(api.documents.create);

  const handleCreate = async () => {
    if (!activeWorkspaceId) return;

    try {
      const docId = await createDocument({
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        title: "Untitled",
      });
      router.push(`/documents/${docId}`);
      toast.success("New document created");
    } catch {
      toast.error("Failed to create document");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleCreate();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={FileText}
        title="Welcome to Documents"
        description="Create a new document to get started"
        action={{ label: "Create a document", onClick: handleCreate }}
      />
    </div>
  );
}
