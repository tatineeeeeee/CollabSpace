"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface VersionHistoryProps {
  documentId: Id<"documents">;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VersionHistory({ documentId, open, onOpenChange }: VersionHistoryProps) {
  const versions = useQuery(api.documentVersions.getByDocument, { documentId });
  const restore = useMutation(api.documentVersions.restore);
  const [selectedId, setSelectedId] = useState<Id<"documentVersions"> | null>(
    null
  );
  const [isRestoring, setIsRestoring] = useState(false);

  const selectedVersion = versions?.find((v) => v._id === selectedId);

  const handleRestore = async (versionId: Id<"documentVersions">) => {
    setIsRestoring(true);
    try {
      await restore({ versionId });
      toast.success("Version restored");
      setSelectedId(null);
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open === undefined && (
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="flex w-[400px] flex-col sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>

        {!versions || versions.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No versions saved yet. Versions are created automatically as you
              edit.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {versions.map((version, index) => (
              <button
                key={version._id}
                type="button"
                onClick={() =>
                  setSelectedId(
                    selectedId === version._id ? null : version._id
                  )
                }
                className={cn(
                  "flex flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  selectedId === version._id && "bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {index === 0 ? "Latest version" : version.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatRelativeTime(version.createdAt)}</span>
                  {version.userName && (
                    <>
                      <span>·</span>
                      <span>{version.userName}</span>
                    </>
                  )}
                </div>
                {selectedId === version._id && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version._id);
                      }}
                      disabled={isRestoring}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore this version
                    </Button>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedVersion && (
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Preview
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs">
              {(() => {
                try {
                  const json = JSON.parse(selectedVersion.content);
                  const extractText = (node: unknown): string => {
                    const n = node as {
                      text?: string;
                      content?: unknown[];
                    };
                    if (typeof n?.text === "string") return n.text;
                    if (Array.isArray(n?.content))
                      return n.content.map(extractText).join(" ");
                    return "";
                  };
                  const text = extractText(json);
                  return text.slice(0, 500) || "(Empty document)";
                } catch {
                  return "(Unable to preview)";
                }
              })()}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
