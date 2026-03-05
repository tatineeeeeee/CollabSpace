import { Layers, FileText, Users } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Layers,
    title: "Create a workspace",
    description:
      "Set up your team workspace in seconds. Invite members, assign roles, and organize everything under one roof.",
  },
  {
    number: 2,
    icon: FileText,
    title: "Write & Plan",
    description:
      "Create rich documents and kanban boards to capture ideas, plan projects, and track progress visually.",
  },
  {
    number: 3,
    icon: Users,
    title: "Collaborate",
    description:
      "Work together in real-time. Every edit, comment, and update syncs instantly across your entire team.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          How it works
        </h2>
        <p className="mb-16 text-center text-muted-foreground">
          Get your team up and running in three simple steps.
        </p>

        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.number}
                </span>
              </div>
              <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
