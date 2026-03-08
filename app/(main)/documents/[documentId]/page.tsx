"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { CoverImage } from "@/components/documents/cover-image";
import { BacklinksSection } from "@/components/documents/backlinks-section";
import { VersionHistory } from "@/components/documents/version-history";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Download,
  FileCode,
  FileText,
  FileType,
  Globe,
  Hash,
  History,
  Link2,
  Menu,
  MoveHorizontal,
  MoreHorizontal,
  Share,
  Star,
  Trash2,
  Type,
  Undo,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { downloadAsFile, sanitizeFilename } from "@/lib/export-utils";
import { useSidebarStore } from "@/hooks/use-sidebar";
import { toast } from "sonner";
import type { Editor } from "@tiptap/core";
import type { Id } from "@/convex/_generated/dataModel";

const EditorComponent = dynamic(
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
  const togglePublish = useMutation(api.documents.togglePublish);
  const router = useRouter();
  const { collapsed, toggle, setMobileOpen } = useSidebarStore();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleRestore = async () => {
    try {
      await restore({ id: documentId });
      toast.success("Document restored");
    } catch {
      toast.error("Failed to restore document");
    }
  };

  const handleTogglePublish = async () => {
    try {
      const newState = await togglePublish({ id: document!._id });
      toast.success(newState ? "Document published" : "Document unpublished");
    } catch {
      toast.error("Failed to update publish state");
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/preview/${document!._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = (format: "markdown" | "html" | "text") => {
    if (!editorInstance || !document) return;
    const filename = sanitizeFilename(document.title);
    if (format === "markdown") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editorInstance.storage as any).markdown?.getMarkdown?.() ?? editorInstance.getText();
      downloadAsFile(md, `${filename}.md`, "text/markdown");
    } else if (format === "html") {
      const body = editorInstance.getHTML();
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${document.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 768px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
h1 { font-size: 2rem; margin-top: 2rem; }
h2 { font-size: 1.5rem; margin-top: 1.5rem; }
h3 { font-size: 1.25rem; margin-top: 1.25rem; }
blockquote { border-left: 3px solid #d1d5db; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
code { background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; }
th { background: #f3f4f6; font-weight: 600; }
img { max-width: 100%; border-radius: 0.5rem; }
ul[data-type="taskList"] { list-style: none; padding-left: 0; }
ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; }
</style>
</head>
<body>
${body}
</body>
</html>`;
      downloadAsFile(html, `${filename}.html`, "text/html");
    } else {
      downloadAsFile(editorInstance.getText(), `${filename}.txt`, "text/plain");
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

      {/* Notion-style top bar */}
      <div className="flex h-11 items-center justify-between overflow-hidden border-b pl-3 pr-2.5">
        {/* Left: hamburger + icon + title */}
        <div className="flex min-w-0 items-center gap-2">
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-7 w-7 shrink-0 md:flex"
              aria-label="Toggle sidebar"
              onClick={toggle}
            >
              <Menu className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
            </Button>
          )}
          {document.icon && (
            <IconRenderer icon={document.icon} className="h-5 w-5 shrink-0 text-lg" />
          )}
          <span className="truncate text-sm">
            {document.title || "Untitled"}
          </span>
          {document.isPublished && (
            <span className="flex shrink-0 items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              <Globe className="h-3 w-3" />
              Published
            </span>
          )}
        </div>

        {/* Right: edited time + share + star + more menu */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
            Edited {formatRelativeTime(document.updatedAt ?? document._creationTime)}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-sm">
                <Share className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4" />
                    Publish to web
                  </div>
                  <Button
                    variant={document.isPublished ? "default" : "outline"}
                    size="sm"
                    className="h-7"
                    onClick={handleTogglePublish}
                  >
                    {document.isPublished ? "Published" : "Publish"}
                  </Button>
                </div>
                {document.isPublished && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Anyone with the link can view this document.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={handleCopyLink}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy link"}
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => toggleFavorite({ documentId })}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
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
                aria-label="Page settings"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Publish / Unpublish */}
              <DropdownMenuItem onClick={handleTogglePublish}>
                <Globe className="mr-2 h-4 w-4" />
                {document.isPublished ? "Unpublish" : "Publish"}
              </DropdownMenuItem>
              {document.isPublished && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {copied ? "Copied!" : "Copy link"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* History */}
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" />
                History
              </DropdownMenuItem>
              {/* Export */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => handleExport("markdown")}
                    disabled={!editorInstance}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("html")}
                    disabled={!editorInstance}
                  >
                    <FileCode className="mr-2 h-4 w-4" />
                    HTML (.html)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("text")}
                    disabled={!editorInstance}
                  >
                    <FileType className="mr-2 h-4 w-4" />
                    Plain Text (.txt)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {/* Word count */}
              <DropdownMenuItem disabled className="text-muted-foreground">
                <Hash className="mr-2 h-4 w-4" />
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Layout options */}
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

      {/* Version History Sheet (controlled) */}
      <VersionHistory
        documentId={documentId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

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
            <EditorComponent
              documentId={document._id}
              workspaceId={document.workspaceId}
              title={document.title}
              initialContent={document.content}
              editable={!document.isArchived}
              onEditor={setEditorInstance}
              onWordCountChange={setWordCount}
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
