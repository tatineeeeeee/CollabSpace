import Link from "next/link";
import { Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-semibold">CollabSpace</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your team&apos;s workspace for docs and projects.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="transition-colors hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-foreground">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/sign-in" className="transition-colors hover:text-foreground">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="transition-colors hover:text-foreground">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Built with */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Built with</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Next.js</li>
              <li>Convex</li>
              <li>Clerk</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CollabSpace. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
