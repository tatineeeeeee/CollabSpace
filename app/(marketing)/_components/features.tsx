import {
  FileText,
  Kanban,
  Users,
  Zap,
  Search,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Rich Documents",
    description:
      "Create and edit documents with a powerful rich text editor. Nest pages, add icons, and organize your team's knowledge.",
  },
  {
    icon: Kanban,
    title: "Kanban Boards",
    description:
      "Manage projects visually with drag-and-drop kanban boards. Add cards, labels, due dates, and assign tasks.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Create organizations, invite team members, and work together seamlessly on documents and boards.",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description:
      "Every change syncs instantly across all team members. No refresh needed — see updates as they happen.",
  },
  {
    icon: Search,
    title: "Quick Search",
    description:
      "Find any document or board instantly with global search. Press Cmd+K and start typing.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description:
      "Enterprise-grade authentication with organization-level access control. Your data stays private.",
  },
];

export function Features() {
  return (
    <section className="border-t bg-muted/50 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          Everything your team needs
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          One platform for documents and project management.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border bg-background p-6"
            >
              <feature.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
