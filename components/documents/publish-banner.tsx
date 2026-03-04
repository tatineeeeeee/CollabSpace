"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

interface PublishBannerProps {
  document: Doc<"documents">;
}

export function PublishBanner({ document }: PublishBannerProps) {
  const togglePublish = useMutation(api.documents.togglePublish);
  const [copied, setCopied] = useState(false);

  const handleToggle = async () => {
    try {
      const newState = await togglePublish({ id: document._id });
      toast.success(newState ? "Document published" : "Document unpublished");
    } catch {
      toast.error("Failed to update publish state");
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/preview/${document._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!document.isPublished) {
    return (
      <div className="flex items-center justify-center gap-2 border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>This document is not published.</span>
        <Button variant="outline" size="sm" className="ml-2 h-7" onClick={handleToggle}>
          Publish
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b bg-primary/10 px-4 py-2 text-sm text-primary">
      <Globe className="h-4 w-4" />
      <span>This document is live on the web.</span>
      <Button variant="outline" size="sm" className="ml-2 h-7 gap-1" onClick={handleCopyLink}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        Copy link
      </Button>
      <Button variant="ghost" size="sm" className="h-7" onClick={handleToggle}>
        Unpublish
      </Button>
    </div>
  );
}
