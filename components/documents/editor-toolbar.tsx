"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Code,
  Link,
  ImageIcon,
  Palette,
  Table,
  PaintBucket,
} from "lucide-react";
import { HIGHLIGHT_BACKGROUND_COLORS } from "@/lib/colors";

interface EditorToolbarProps {
  editor: Editor;
}

const TEXT_COLORS = [
  { name: "Default", color: "" },
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Yellow", color: "#eab308" },
  { name: "Green", color: "#22c55e" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Purple", color: "#a855f7" },
  { name: "Pink", color: "#ec4899" },
  { name: "Gray", color: "#6b7280" },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [colorOpen, setColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const getBlockType = () => {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  };

  const setBlockType = (value: string) => {
    switch (value) {
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      default:
        editor.chain().focus().setParagraph().run();
    }
  };

  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  const handleLinkClick = () => {
    const existing = editor.getAttributes("link").href ?? "";
    setLinkUrl(existing);
    setLinkOpen(true);
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-background px-4 py-1.5">
      {/* Block type */}
      <Select value={getBlockType()} onValueChange={setBlockType}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Inline formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("taskList")}
        onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
        aria-label="Task list"
      >
        <ListTodo className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Alignment */}
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("left").run()
        }
        aria-label="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("center").run()
        }
        aria-label="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("right").run()
        }
        aria-label="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Enrichment */}
      <Toggle
        size="sm"
        pressed={editor.isActive("highlight")}
        onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
        aria-label="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Code"
      >
        <Code className="h-4 w-4" />
      </Toggle>

      {/* Link */}
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={editor.isActive("link")}
            onPressedChange={handleLinkClick}
            aria-label="Link"
          >
            <Link className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="flex gap-2">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSetLink();
              }}
              autoFocus
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8" onClick={handleSetLink}>
              Set
            </Button>
          </div>
          {editor.isActive("link") && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full text-destructive"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              Remove link
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Image */}
      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={() => {
          editor.chain().focus().insertContent({ type: "imageBlock" }).run();
        }}
        aria-label="Image"
      >
        <ImageIcon className="h-4 w-4" />
      </Toggle>

      {/* Table */}
      <Toggle
        size="sm"
        pressed={editor.isActive("table")}
        onPressedChange={() => {
          if (editor.isActive("table")) {
            editor.chain().focus().deleteTable().run();
          } else {
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run();
          }
        }}
        aria-label="Table"
      >
        <Table className="h-4 w-4" />
      </Toggle>

      {/* Block Background Color */}
      <Popover open={bgColorOpen} onOpenChange={setBgColorOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={!!editor.getAttributes("paragraph").backgroundColor || !!editor.getAttributes("heading").backgroundColor}
            onPressedChange={() => setBgColorOpen(!bgColorOpen)}
            aria-label="Background color"
          >
            <PaintBucket className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {HIGHLIGHT_BACKGROUND_COLORS.map((hc) => (
              <button
                type="button"
                key={hc.name}
                title={hc.name}
                onClick={() => {
                  if (hc.color) {
                    editor.chain().focus().setBlockBackground(hc.name.toLowerCase()).run();
                  } else {
                    editor.chain().focus().setBlockBackground(null).run();
                  }
                  setBgColorOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:scale-110"
                style={{ backgroundColor: (isDark && "dark" in hc ? hc.dark : hc.color) || undefined }}
              >
                {!hc.color && (
                  <span className="text-xs text-muted-foreground">A</span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Text Color */}
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={!!editor.getAttributes("textStyle").color}
            onPressedChange={() => setColorOpen(!colorOpen)}
            aria-label="Text color"
          >
            <Palette className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {TEXT_COLORS.map((tc) => (
              <button
                type="button"
                key={tc.name}
                title={tc.name}
                onClick={() => {
                  if (tc.color) {
                    editor.chain().focus().setColor(tc.color).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                  setColorOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:scale-110"
                style={{ backgroundColor: tc.color || undefined }}
              >
                {!tc.color && (
                  <span className="text-xs text-muted-foreground">A</span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
