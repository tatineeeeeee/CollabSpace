"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
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

export default function PreviewPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId as Id<"documents">;

  const document = useQuery(api.documents.getPublishedById, { id: documentId });

  if (document === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-10 pt-16 md:px-16">
        <Skeleton className="h-12 w-12 rounded" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium text-foreground">
          Document not available
        </p>
        <p className="text-sm">
          This document may not be published or doesn&apos;t exist.
        </p>
      </div>
    );
  }

  const isImageUrl = document.coverImage?.startsWith("http");
  const coverStyle = document.coverImage
    ? isImageUrl
      ? { backgroundImage: `url(${document.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: document.coverImage }
    : undefined;

  return (
    <div className="mx-auto max-w-4xl pb-40">
      {document.coverImage && (
        <div
          className="h-[35vh] min-h-[200px] max-h-[280px] w-full"
          style={coverStyle}
        />
      )}

      <div className="px-10 md:px-16">
        {document.icon && (
          <div className={document.coverImage ? "-mt-7" : "mt-6"}>
            <span className="text-6xl">{document.icon}</span>
          </div>
        )}
        <h1 className="mt-4 text-4xl font-bold">{document.title}</h1>
        <div className="mt-4">
          <Editor
            documentId={document._id}
            initialContent={document.content}
            editable={false}
          />
        </div>
      </div>
    </div>
  );
}
