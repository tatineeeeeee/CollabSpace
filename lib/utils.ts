import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates that a cover image value is safe for use in CSS.
 * Accepts http/https URLs, hex colors, CSS gradients, and known patterns.
 */
export function isSafeCoverValue(value: string): boolean {
  // Allow http/https URLs
  if (/^https?:\/\//.test(value)) return true;
  // Allow hex colors
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true;
  // Allow CSS gradients (linear-gradient, radial-gradient, etc.)
  if (/^(linear|radial|conic)-gradient\(/.test(value)) return true;
  // Allow plain CSS color names (single word, letters only)
  if (/^[a-zA-Z]{3,20}$/.test(value)) return true;
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
