import Link from "next/link";
import { Layers, FileText, Kanban, Users, ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary/90 to-primary flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <Layers className="h-8 w-8" />
            <span className="text-2xl font-bold">CollabSpace</span>
          </div>

          <h1 className="text-3xl font-bold mb-4">
            Your team&apos;s workspace for docs &amp; projects
          </h1>

          <ul className="mt-10 space-y-6">
            <li className="flex items-center gap-3">
              <FileText className="h-6 w-6 shrink-0" />
              <span className="text-lg">Rich documents</span>
            </li>
            <li className="flex items-center gap-3">
              <Kanban className="h-6 w-6 shrink-0" />
              <span className="text-lg">Kanban boards</span>
            </li>
            <li className="flex items-center gap-3">
              <Users className="h-6 w-6 shrink-0" />
              <span className="text-lg">Real-time collaboration</span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-white/60">
          &copy; {new Date().getFullYear()} CollabSpace
        </p>
      </div>

      {/* Right side — auth widget */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6">
        {/* Back to home link — mobile only */}
        <div className="mb-8 self-start lg:hidden">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
