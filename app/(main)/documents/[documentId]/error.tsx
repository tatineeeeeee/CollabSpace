"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DocumentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Document page error:", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-12 w-12 text-destructive/50" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Failed to load document</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading this document."}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
