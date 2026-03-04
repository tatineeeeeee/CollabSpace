"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImageIcon, Link, X } from "lucide-react";

const GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80",
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80",
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80",
  "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=1200&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80",
  "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=1200&q=80",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80",
];

const SOLID_COLORS = [
  "#2C3E50",
  "#8E44AD",
  "#2980B9",
  "#16A085",
  "#27AE60",
  "#F39C12",
  "#D35400",
  "#C0392B",
  "#7F8C8D",
  "#34495E",
];

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)",
];

interface CoverPickerProps {
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function CoverPicker({ onChange, children }: CoverPickerProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [tab, setTab] = useState<"gallery" | "color" | "link">("gallery");

  const handleSelect = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      handleSelect(url.trim());
      setUrl("");
    }
  };

  const tabs = [
    { id: "gallery" as const, label: "Gallery" },
    { id: "color" as const, label: "Color" },
    { id: "link" as const, label: "Link" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-3">
          {tab === "gallery" && (
            <div className="grid grid-cols-5 gap-1.5">
              {GALLERY_IMAGES.map((src) => (
                <button
                  key={src}
                  className="h-10 overflow-hidden rounded-md ring-offset-background transition-all hover:scale-105 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                  onClick={() => handleSelect(src)}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {tab === "color" && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Solid</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {SOLID_COLORS.map((color) => (
                    <button
                      key={color}
                      className="h-8 rounded-md ring-offset-background transition-all hover:scale-105 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                      style={{ background: color }}
                      onClick={() => handleSelect(color)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Gradient</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {GRADIENTS.map((gradient) => (
                    <button
                      key={gradient}
                      className="h-8 rounded-md ring-offset-background transition-all hover:scale-105 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                      style={{ background: gradient }}
                      onClick={() => handleSelect(gradient)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "link" && (
            <form onSubmit={handleUrlSubmit} className="flex gap-1.5">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste image URL..."
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" className="h-8 shrink-0">
                <Link className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface CoverImageProps {
  url?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}

export function CoverImage({ url, onChange, onRemove }: CoverImageProps) {
  if (!url) return null;

  const isImageUrl = url.startsWith("http");
  const style = isImageUrl
    ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: url };

  return (
    <div className="group/cover relative h-[35vh] min-h-[200px] max-h-[280px] w-full" style={style}>
      <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 transition-opacity group-hover/cover:opacity-100">
        <CoverPicker onChange={onChange}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 bg-background/80 text-xs backdrop-blur-sm"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Change cover
          </Button>
        </CoverPicker>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 bg-background/80 text-xs backdrop-blur-sm"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
    </div>
  );
}

export { CoverPicker };
