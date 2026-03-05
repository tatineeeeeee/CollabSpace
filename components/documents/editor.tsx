"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
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
import { EditorToolbar } from "./editor-toolbar";
import { EditorFooter } from "./editor-footer";
import { SlashCommand } from "./slash-command";
import { Callout } from "./callout-extension";
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
  const [wordCount, setWordCount] = useState(() => {
    if (!initialContent) return 0;
    try {
      const json = JSON.parse(initialContent);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractText = (node: any): string => {
        if (typeof node?.text === "string") return node.text;
        if (Array.isArray(node?.content)) return node.content.map(extractText).join(" ");
        return "";
      };
      const text = extractText(json);
      return text.trim().split(/\s+/).filter(Boolean).length;
    } catch {
      return 0;
    }
  });
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved"
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
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
      Callout,
      SlashCommand,
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
      setSaveStatus("unsaved");
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
    },
  });

  const onSaveContent = useEffectEvent(
    (debounced: string, docId: Id<"documents">, initial: string | undefined) => {
      if (debounced && debounced !== initial) {
        setSaveStatus("saving");
        updateContent({ id: docId, content: debounced })
          .then(() => setSaveStatus("saved"))
          .catch(() => setSaveStatus("unsaved"));
      }
    }
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    onSaveContent(debouncedContent, documentId, initialContent);
  }, [debouncedContent, documentId, initialContent]);

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
    <div className="flex flex-col">
      {editable && editor && <EditorToolbar editor={editor} />}
      {editor && (
        <BubbleMenu editor={editor} updateDelay={150}>
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
      {editable && (
        <EditorFooter wordCount={wordCount} saveStatus={saveStatus} />
      )}
    </div>
  );
}
