"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface EditorProps {
  documentId: Id<"documents">;
  initialContent?: string;
  editable?: boolean;
}

export function Editor({
  documentId,
  initialContent,
  editable = true,
}: EditorProps) {
  const updateContent = useMutation(api.documents.updateContent);
  const [content, setContent] = useState(initialContent ?? "");
  const debouncedContent = useDebounce(content, 500);
  const isInitialMount = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content: initialContent ? JSON.parse(initialContent) : undefined,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none outline-none min-h-[500px] pt-1",
      },
    },
    onUpdate: ({ editor }) => {
      setContent(JSON.stringify(editor.getJSON()));
    },
  });

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debouncedContent && debouncedContent !== initialContent) {
      updateContent({ id: documentId, content: debouncedContent });
    }
  }, [debouncedContent, documentId, initialContent, updateContent]);

  const bubbleMenuItems = [
    {
      icon: Bold,
      label: "Bold",
      action: () => editor?.chain().focus().toggleBold().run(),
      isActive: () => editor?.isActive("bold") ?? false,
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => editor?.chain().focus().toggleItalic().run(),
      isActive: () => editor?.isActive("italic") ?? false,
    },
    {
      icon: UnderlineIcon,
      label: "Underline",
      action: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: () => editor?.isActive("underline") ?? false,
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      action: () => editor?.chain().focus().toggleStrike().run(),
      isActive: () => editor?.isActive("strike") ?? false,
    },
    {
      icon: Code,
      label: "Code",
      action: () => editor?.chain().focus().toggleCode().run(),
      isActive: () => editor?.isActive("code") ?? false,
    },
    {
      icon: Highlighter,
      label: "Highlight",
      action: () => editor?.chain().focus().toggleHighlight().run(),
      isActive: () => editor?.isActive("highlight") ?? false,
    },
  ];

  return (
    <div>
      {editor && (
        <BubbleMenu
          editor={editor}
          updateDelay={150}
        >
          <div className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-lg">
            {bubbleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  title={item.label}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted",
                    item.isActive() && "bg-muted text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
