import { Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t px-6 py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Layers className="h-5 w-5" />
          <span className="text-sm font-medium">CollabSpace</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Built with Next.js, Convex & Clerk
        </p>
      </div>
    </footer>
  );
}
