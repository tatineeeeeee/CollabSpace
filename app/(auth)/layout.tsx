import Link from "next/link";
import { Layers, FileText, Kanban, Users, ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — CollabSpace",
  description: "Sign in or create an account to start collaborating with your team.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — desktop only */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 bg-linear-to-br from-indigo-950 via-violet-900 to-indigo-900 flex-col justify-between p-12 text-white">
        {/* Decorative: grid pattern */}
        <div className="auth-grid-pattern pointer-events-none absolute inset-0 opacity-15" />

        {/* Decorative: glow blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />

        {/* Decorative: geometric shapes */}
        <div className="pointer-events-none absolute top-20 right-12 h-32 w-32 rotate-12 rounded-2xl border border-white/10" />
        <div className="pointer-events-none absolute bottom-32 left-8 h-24 w-24 -rotate-6 rounded-xl border border-white/[0.07]" />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo — clickable back to home */}
          <Link href="/" className="flex items-center gap-3 mb-16 w-fit hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Layers className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">CollabSpace</span>
          </Link>

          {/* Headline */}
          <h1 className="text-4xl font-bold leading-tight mb-3">
            Everything your team needs,{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-300 to-indigo-300">
              in one place
            </span>
          </h1>

          <p className="text-white/60 max-w-sm mb-10">
            Documents, kanban boards, and real-time collaboration — all in a
            single workspace.
          </p>

          {/* Checklist — titles only, no descriptions */}
          <ul className="space-y-3.5 mb-12">
            <li className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-400/20 shrink-0">
                <Check className="h-3.5 w-3.5 text-violet-300" />
              </div>
              <span className="font-medium">Rich documents with a block editor</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-400/20 shrink-0">
                <Check className="h-3.5 w-3.5 text-indigo-300" />
              </div>
              <span className="font-medium">Kanban boards with drag-and-drop</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-400/20 shrink-0">
                <Check className="h-3.5 w-3.5 text-fuchsia-300" />
              </div>
              <span className="font-medium">Real-time team collaboration</span>
            </li>
          </ul>

          {/* Mini product mockup — larger, higher contrast */}
          <div className="rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-sm overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/15 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/40" />
              </div>
              <div className="mx-auto flex-1">
                <div className="mx-auto max-w-50 rounded-md bg-white/[0.08] px-3 py-1 text-[10px] text-white/40 text-center">
                  collabspace.app/dashboard
                </div>
              </div>
            </div>
            {/* App wireframe */}
            <div className="grid grid-cols-12 gap-0">
              {/* Sidebar */}
              <div className="col-span-3 border-r border-white/15 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-white/15" />
                  <div className="h-2.5 w-16 rounded bg-white/15" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 rounded-md bg-white/15 px-2 py-1.5">
                    <FileText className="h-3 w-3 text-white/50" />
                    <div className="h-2 w-12 rounded bg-white/20" />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Kanban className="h-3 w-3 text-white/30" />
                    <div className="h-2 w-14 rounded bg-white/10" />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Users className="h-3 w-3 text-white/30" />
                    <div className="h-2 w-10 rounded bg-white/10" />
                  </div>
                </div>
              </div>
              {/* Main content — mini kanban */}
              <div className="col-span-9 p-4">
                <div className="mb-3 h-3 w-28 rounded bg-white/15" />
                <div className="grid grid-cols-3 gap-2.5">
                  {["bg-violet-400/15", "bg-indigo-400/15", "bg-fuchsia-400/15"].map(
                    (bg, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-2 w-12 rounded bg-white/15" />
                        <div className={`rounded-md border border-white/15 ${bg} p-2.5`}>
                          <div className="mb-1.5 h-2 w-full rounded bg-white/15" />
                          <div className="h-2 w-2/3 rounded bg-white/10" />
                        </div>
                        <div className={`rounded-md border border-white/15 ${bg} p-2.5`}>
                          <div className="mb-1.5 h-2 w-full rounded bg-white/15" />
                          <div className="h-2 w-1/2 rounded bg-white/10" />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="relative z-10 text-sm text-white/40">
          &copy; {new Date().getFullYear()} CollabSpace
        </p>
      </div>

      {/* Right side — auth widget */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center p-6 overflow-hidden bg-linear-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/30 dark:via-background dark:to-indigo-950/30">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/15" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />

        {/* Mobile header — logo + back link */}
        <div className="mb-8 flex w-full items-center justify-between lg:hidden">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-5 w-5" />
            <span className="text-sm font-semibold">CollabSpace</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
