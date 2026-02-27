import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <FileText className="h-12 w-12 opacity-30" />
      <p className="text-lg font-medium">Documents coming soon</p>
      <p className="text-sm">Rich text documents are being built in Phase 3.</p>
    </div>
  );
}
