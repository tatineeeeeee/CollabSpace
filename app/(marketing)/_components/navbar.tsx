"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2, Layers } from "lucide-react";

export function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const isLoading = !isLoaded;
  const isAuthenticated = !!isSignedIn;

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center border-b bg-background/80 px-6 py-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2">
        <Layers className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">CollabSpace</span>
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!isAuthenticated && !isLoading && (
          <>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </>
        )}
        {isAuthenticated && !isLoading && (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <UserButton />
          </>
        )}
      </div>
    </nav>
  );
}
