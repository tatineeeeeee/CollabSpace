"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { isLucideIcon, isUrlIcon, getLucideIconName, LUCIDE_ICON_MAP } from "@/lib/icon-utils";
import { cn } from "@/lib/utils";

interface IconRendererProps {
  icon: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function IconRenderer({ icon, className, fallback }: IconRendererProps) {
  const [imgError, setImgError] = useState(false);

  if (!icon) {
    return fallback ? <>{fallback}</> : null;
  }

  if (isLucideIcon(icon)) {
    const name = getLucideIconName(icon);
    const LucideComponent = LUCIDE_ICON_MAP[name];
    if (!LucideComponent) {
      return fallback ? <>{fallback}</> : null;
    }
    return <LucideComponent className={cn("inline-block shrink-0", className)} />;
  }

  if (isUrlIcon(icon)) {
    if (imgError) {
      return (
        <span className={cn("inline-flex items-center justify-center text-muted-foreground", className)}>
          <ImageOff className="h-[1em] w-[1em]" />
        </span>
      );
    }
    return (
      <img
        src={icon}
        alt=""
        className={cn("inline-block shrink-0 rounded-sm object-cover", className)}
        onError={() => setImgError(true)}
      />
    );
  }

  // Default: emoji
  return <span className={cn("inline-block leading-none", className)}>{icon}</span>;
}
