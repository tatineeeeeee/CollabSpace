import { Kanban } from "lucide-react";

export default function BoardsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Kanban className="h-12 w-12 opacity-30" />
      <p className="text-lg font-medium">Boards coming soon</p>
      <p className="text-sm">Kanban boards are being built in Phase 4.</p>
    </div>
  );
}
