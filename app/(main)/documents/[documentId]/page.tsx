"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { CoverImage } from "@/components/documents/cover-image";
import { PublishBanner } from "@/components/documents/publish-banner";
import { DocumentBreadcrumb } from "@/components/documents/document-breadcrumb";
import { BacklinksSection } from "@/components/documents/backlinks-section";
import { VersionHistory } from "@/components/documents/version-history";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Check,
  Copy,
  MoveHorizontal,
  MoreHorizontal,
  Star,
  Trash2,
  Type,
  Undo,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const isFavorited = useQuery(api.favorites.isFavorited, { documentId });
  const restore = useMutation(api.documents.restore);
  const update = useMutation(api.documents.update);
  const archive = useMutation(api.documents.archive);
  const duplicateDoc = useMutation(api.documents.duplicate);
  const toggleFavorite = useMutation(api.favorites.toggle);
  const router = useRouter();

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

      <div className="flex items-center justify-between border-b px-4 py-2">
        <DocumentBreadcrumb documentId={documentId} />
        <div className="flex items-center gap-1">
          <VersionHistory documentId={documentId} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => toggleFavorite({ documentId })}
            title={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isFavorited
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title="Page settings"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() =>
                  update({
                    id: document._id,
                    isFullWidth: !document.isFullWidth,
                  })
                }
              >
                <MoveHorizontal className="mr-2 h-4 w-4" />
                Full width
                {document.isFullWidth && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  update({
                    id: document._id,
                    isSmallText: !document.isSmallText,
                  })
                }
              >
                <Type className="mr-2 h-4 w-4" />
                Small text
                {document.isSmallText && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Type className="mr-2 h-4 w-4" />
                  Font style
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {(
                    [
                      { value: "default", label: "Default" },
                      { value: "serif", label: "Serif" },
                      { value: "mono", label: "Mono" },
                    ] as const
                  ).map((font) => (
                    <DropdownMenuItem
                      key={font.value}
                      onClick={() =>
                        update({
                          id: document._id,
                          fontStyle: font.value,
                        })
                      }
                      className={
                        font.value === "serif"
                          ? "font-serif"
                          : font.value === "mono"
                            ? "font-mono"
                            : ""
                      }
                    >
                      {font.label}
                      {(document.fontStyle ?? "default") === font.value && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const newId = await duplicateDoc({ id: document._id });
                    toast.success("Document duplicated");
                    router.push(`/documents/${newId}`);
                  } catch {
                    toast.error("Failed to duplicate");
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  try {
                    await archive({ id: document._id });
                    toast.success("Moved to trash");
                    router.push("/documents");
                  } catch {
                    toast.error("Failed to archive");
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          <DocumentToolbar
            document={document}
            isFullWidth={!!document.isFullWidth}
          />
          <div
            className={cn(
              "w-full px-6 md:px-16 lg:px-24",
              document.isSmallText && "text-sm",
              document.fontStyle === "serif" && "font-serif",
              document.fontStyle === "mono" && "font-mono"
            )}
          >
            <Editor
              documentId={document._id}
              workspaceId={document.workspaceId}
              title={document.title}
              initialContent={document.content}
              editable={!document.isArchived}
              lastEditedBy={document.lastEditedByName}
              lastEditedAt={document.updatedAt}
            />
            <BacklinksSection
              documentId={document._id}
              workspaceId={document.workspaceId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
