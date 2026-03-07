"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Search, X, Link, Upload, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  EMOJI_DATA,
  LUCIDE_ICON_CATEGORIES,
  LUCIDE_ICON_MAP,
  searchEmojis,
  searchLucideIcons,
} from "@/lib/icon-utils";
import type { Id } from "@/convex/_generated/dataModel";

interface IconPickerProps {
  onChange: (icon: string) => void;
  onRemove?: () => void;
  children: React.ReactNode;
  asChild?: boolean;
}

type Tab = "emoji" | "icons" | "upload";

export function IconPicker({ onChange, onRemove, children, asChild }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("emoji");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getStorageUrl);

  const handleSelect = (icon: string) => {
    onChange(icon);
    setOpen(false);
    setQuery("");
  };

  const handleRemove = () => {
    onRemove?.();
    setOpen(false);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      handleSelect(trimmed);
      setUrl("");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "emoji", label: "Emoji" },
    { id: "icons", label: "Icons" },
    { id: "upload", label: "Upload" },
  ];

  const filteredEmojis = searchEmojis(query);
  const filteredIcons = searchLucideIcons(query);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); } }}>
      <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Tab bar + Remove */}
        <div className="flex items-center border-b">
          <div className="flex flex-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setQuery(""); }}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {onRemove && (
            <button
              onClick={handleRemove}
              className="px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Remove
            </button>
          )}
        </div>

        {/* Search (emoji + icons tabs only) */}
        {tab !== "upload" && (
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter..."
                className="h-7 w-full rounded-md bg-muted/50 pl-7 pr-7 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-muted"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {/* Emoji tab */}
          {tab === "emoji" && (
            <>
              {filteredEmojis.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No emojis found</p>
              )}
              {filteredEmojis.map((category) => (
                <div key={category.label} className="mb-2">
                  <p className="sticky top-0 z-10 mb-1 bg-popover px-1 text-xs font-medium text-muted-foreground">
                    {category.label}
                  </p>
                  <div className="grid grid-cols-10 gap-0.5">
                    {category.emojis.map((emoji, i) => (
                      <button
                        key={`${category.label}-${i}`}
                        className="flex h-7 w-7 items-center justify-center rounded text-sm hover:bg-accent"
                        onClick={() => handleSelect(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Icons tab */}
          {tab === "icons" && (
            <>
              {filteredIcons.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No icons found</p>
              )}
              {filteredIcons.map((category) => (
                <div key={category.label} className="mb-3">
                  <p className="sticky top-0 z-10 mb-1 bg-popover px-1 text-xs font-medium text-muted-foreground">
                    {category.label}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {category.icons.map((iconName) => {
                      const IconComponent = LUCIDE_ICON_MAP[iconName];
                      if (!IconComponent) return null;
                      return (
                        <button
                          key={iconName}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          onClick={() => handleSelect(`lucide:${iconName}`)}
                          title={iconName}
                        >
                          <IconComponent className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Upload tab */}
          {tab === "upload" && (
            <div className="space-y-3 p-1">
              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Upload icon image"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const uploadUrl = await generateUploadUrl();
                    const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                    const { storageId } = await res.json() as { storageId: Id<"_storage"> };
                    const servingUrl = await getStorageUrl({ storageId });
                    if (servingUrl) handleSelect(servingUrl);
                  } catch {
                    // upload failed silently
                  } finally {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-4 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Choose an image</>
                )}
              </button>

              {/* URL paste fallback */}
              <div className="relative flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground">or paste a link</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={handleUrlSubmit} className="flex gap-1.5">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
                <Button type="submit" size="sm" className="h-8 shrink-0">
                  <Link className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
