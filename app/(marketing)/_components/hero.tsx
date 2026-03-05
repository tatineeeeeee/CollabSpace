"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, FileText, Kanban, CheckSquare } from "lucide-react";

export function Hero() {
  const { isSignedIn, isLoaded } = useAuth();
  const isLoading = !isLoaded;
  const isAuthenticated = !!isSignedIn;

  return (
    <section className="relative flex flex-col items-center justify-center px-6 pb-20 pt-32 text-center md:pt-40">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10">
        <div className="mb-6 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
          Collaborate in real-time
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your team&apos;s workspace for{" "}
          <span className="text-primary">docs</span> &{" "}
          <span className="text-primary">projects</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          CollabSpace brings together documents and kanban boards in one place.
          Write, plan, organize, and collaborate — all in real-time.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          {isLoading && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
          {!isAuthenticated && !isLoading && (
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {isAuthenticated && !isLoading && (
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {!isLoading && (
            <a href="#how-it-works">
              <Button size="lg" variant="outline">
                See how it works
              </Button>
            </a>
          )}
        </div>

        {/* Mock product screenshot */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-xl border bg-background shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto flex-1">
                <div className="mx-auto max-w-sm rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                  collabspace.app/dashboard
                </div>
              </div>
            </div>
            {/* App content placeholder */}
            <div className="grid grid-cols-12 gap-0">
              {/* Sidebar */}
              <div className="col-span-3 border-r bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/20" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary/60" />
                    <div className="h-2.5 w-16 rounded bg-primary/20" />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Kanban className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <div className="h-2.5 w-20 rounded bg-muted" />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <div className="h-2.5 w-14 rounded bg-muted" />
                  </div>
                </div>
              </div>
              {/* Main content area */}
              <div className="col-span-9 bg-linear-to-br from-background to-muted/20 p-6">
                <div className="mb-4 h-4 w-48 rounded bg-muted" />
                <div className="mb-6 space-y-2">
                  <div className="h-2.5 w-full rounded bg-muted/70" />
                  <div className="h-2.5 w-3/4 rounded bg-muted/50" />
                  <div className="h-2.5 w-5/6 rounded bg-muted/60" />
                </div>
                {/* Mini kanban */}
                <div className="grid grid-cols-3 gap-3">
                  {["bg-blue-500/10", "bg-yellow-500/10", "bg-green-500/10"].map(
                    (bg, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-2.5 w-16 rounded bg-muted" />
                        <div className={`rounded-md border ${bg} p-2`}>
                          <div className="mb-1.5 h-2 w-full rounded bg-muted/60" />
                          <div className="h-2 w-2/3 rounded bg-muted/40" />
                        </div>
                        <div className={`rounded-md border ${bg} p-2`}>
                          <div className="mb-1.5 h-2 w-full rounded bg-muted/60" />
                          <div className="h-2 w-1/2 rounded bg-muted/40" />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
