"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😊", "🥰", "😎", "🤓", "🤩", "😇"],
  },
  {
    label: "People",
    emojis: ["👋", "✋", "👌", "✌️", "🤞", "👍", "👏", "🙌", "💪", "🧠"],
  },
  {
    label: "Nature",
    emojis: ["🌟", "⭐", "🔥", "💧", "🌈", "🌸", "🌺", "🍀", "🌲", "🌊"],
  },
  {
    label: "Objects",
    emojis: ["📄", "📝", "📌", "📎", "🔗", "💡", "🔑", "🏷️", "📊", "📈"],
  },
  {
    label: "Symbols",
    emojis: ["❤️", "💜", "💙", "💚", "💛", "🧡", "⚡", "✅", "❌", "⚠️"],
  },
  {
    label: "Misc",
    emojis: ["🎯", "🎨", "🎵", "🎮", "🏆", "🚀", "💻", "📱", "🛠️", "🧩"],
  },
];

interface IconPickerProps {
  onChange: (icon: string) => void;
  children: React.ReactNode;
  asChild?: boolean;
}

export function IconPicker({ onChange, children, asChild }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.label} className="mb-2">
            <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">
              {category.label}
            </p>
            <div className="grid grid-cols-10 gap-0.5">
              {category.emojis.map((emoji) => (
                <button
                  key={emoji}
                  className="flex h-7 w-7 items-center justify-center rounded text-sm hover:bg-accent"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
