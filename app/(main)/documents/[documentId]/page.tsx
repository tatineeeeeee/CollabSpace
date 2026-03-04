"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { CoverImage } from "@/components/documents/cover-image";
import { PublishBanner } from "@/components/documents/publish-banner";
import { DocumentBreadcrumb } from "@/components/documents/document-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Undo } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

const Editor = dynamic(
  () =>
    import("@/components/documents/editor").then((mod) => ({
      default: mod.Editor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 px-8 py-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    ),
  }
);

export default function DocumentIdPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId as Id<"documents">;

  const document = useQuery(api.documents.getById, { id: documentId });
  const restore = useMutation(api.documents.restore);
  const update = useMutation(api.documents.update);

  const handleRestore = async () => {
    try {
      await restore({ id: documentId });
      toast.success("Document restored");
    } catch {
      toast.error("Failed to restore document");
    }
  };

  // Loading state
  if (document === undefined) {
    return (
      <div className="space-y-4 px-10 pt-16 md:px-16">
        <Skeleton className="h-12 w-12 rounded" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  // Not found
  if (document === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Document not found</p>
        <p className="text-sm">
          This document may have been deleted or you don&apos;t have access.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {document.isArchived && (
        <div className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>This document is in the trash.</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 h-7 gap-1"
            onClick={handleRestore}
          >
            <Undo className="h-3.5 w-3.5" />
            Restore
          </Button>
        </div>
      )}

      {!document.isArchived && <PublishBanner document={document} />}

      <div className="border-b px-4 py-2">
        <DocumentBreadcrumb documentId={documentId} />
      </div>

      <div className="group pb-40">
        <CoverImage
          url={document.coverImage}
          onChange={(coverImage) =>
            update({ id: document._id, coverImage })
          }
          onRemove={() =>
            update({ id: document._id, coverImage: "" })
          }
        />
        <div>
          <DocumentToolbar document={document} />
          <div className="px-10 md:px-16">
            <Editor
              documentId={document._id}
              initialContent={document.content}
              editable={!document.isArchived}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
