"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

export function Hero() {
  const { isSignedIn, isLoaded } = useAuth();
  const isLoading = !isLoaded;
  const isAuthenticated = !!isSignedIn;

  return (
    <section className="flex flex-col items-center justify-center px-6 pb-20 pt-32 text-center md:pt-40">
      <div className="mb-6 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
        Collaborate in real-time
      </div>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        Your team&apos;s workspace for{" "}
        <span className="text-primary">docs</span> &{" "}
        <span className="text-primary">projects</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
        CollabSpace brings together documents and kanban boards in one place.
        Write, plan, organize, and collaborate — all in real-time.
      </p>

      <div className="mt-10 flex items-center gap-4">
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
      </div>
    </section>
  );
}
