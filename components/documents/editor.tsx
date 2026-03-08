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
import { CodeBlock } from "./code-block-extension";
import { ImageBlock } from "./image-block-extension";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  Link2Off,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BlockHandle } from "./block-handle";
import { SlashCommand } from "./slash-command";
import Youtube from "@tiptap/extension-youtube";
import { Markdown } from "tiptap-markdown";
import { Embed } from "./embed-extension";
import { Callout } from "./callout-extension";
import { ToggleDetails, ToggleSummary } from "./toggle-extension";
import { TableOfContents } from "./toc-extension";
import { Columns, Column } from "./columns-extension";
import { MathBlock, MathInline } from "./math-extension";
import { DateMention } from "./date-mention-extension";
import { AudioBlock } from "./audio-extension";
import { VideoBlock } from "./video-extension";
import { BookmarkBlock } from "./bookmark-extension";
import { FileAttachment } from "./file-attachment-extension";
import { PdfBlock } from "./pdf-extension";
import { ToggleableHeading } from "./toggleable-heading-extension";
import { LinkToPage, setLinkToPageDocsFn } from "./link-to-page-extension";
import { SubPage, setSubPageContext } from "./sub-page-extension";
import { BlockBackground } from "./block-background-extension";
import { ColumnDrop } from "./column-drop-extension";
import { ColumnResize } from "./column-resize-extension";
import { createMentionExtension } from "./mention-extension";
import type { MentionDocument } from "./mention-extension";
import { createUserMentionExtension } from "./user-mention-extension";
import type { MentionUser } from "./user-mention-extension";
import type { Editor as EditorType } from "@tiptap/core";
import type { Id } from "@/convex/_generated/dataModel";

// Module-level stores — updated by effect, read by ProseMirror plugins (not during render)
let latestMentionDocs: MentionDocument[] = [];
let latestMentionUsers: MentionUser[] = [];

interface EditorProps {
  documentId: Id<"documents">;
  workspaceId?: Id<"workspaces">;
  title?: string;
  initialContent?: string;
  editable?: boolean;
  onEditor?: (editor: EditorType | null) => void;
  onWordCountChange?: (count: number) => void;
}

export function Editor({
  documentId,
  workspaceId,
  title = "Untitled",
  initialContent,
  editable = true,
  onEditor,
  onWordCountChange,
}: EditorProps) {
  const mentionDocs = useQuery(
    api.documents.getForMention,
    workspaceId ? { workspaceId } : "skip"
  );
  const members = useQuery(
    api.workspaces.getMembers,
    workspaceId ? { workspaceId } : "skip"
  );

  const onSubPageContextChange = useEffectEvent(
    (wsId: typeof workspaceId, docId: typeof documentId) => {
      if (wsId) {
        setSubPageContext({ workspaceId: wsId, documentId: docId });
      } else {
        setSubPageContext(null);
      }
    }
  );
  useEffect(() => {
    onSubPageContextChange(workspaceId, documentId);
    return () => setSubPageContext(null);
  }, [workspaceId, documentId]);

  const onMentionDocsChange = useEffectEvent((docs: typeof mentionDocs) => {
    latestMentionDocs = docs ?? [];
    setLinkToPageDocsFn(() => latestMentionDocs);
  });
  useEffect(() => {
    onMentionDocsChange(mentionDocs);
  }, [mentionDocs]);

  const onMembersChange = useEffectEvent((m: typeof members) => {
    if (m) {
      latestMentionUsers = m
        .filter((mem): mem is NonNullable<typeof mem> => mem !== null)
        .map((mem) => ({
          id: mem.userId,
          name: mem.name || mem.email || "Unknown",
          imageUrl: mem.imageUrl,
        }));
    }
  });
  useEffect(() => {
    onMembersChange(members);
  }, [members]);

  const updateContent = useMutation(api.documents.updateContent);
  const [content, setContent] = useState(initialContent ?? "");
  const debouncedContent = useDebounce(content, 500);
  const isInitialMount = useRef(true);
  const [wordCount, setWordCount] = useState(() => {
    if (!initialContent) return 0;
    try {
      const json = JSON.parse(initialContent);
      const extractText = (node: unknown): string => {
        const n = node as { text?: string; content?: unknown[] };
        if (typeof n?.text === "string") return n.text;
        if (Array.isArray(n?.content)) return n.content.map(extractText).join(" ");
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

  const onEditorChange = useEffectEvent((e: EditorType | null) => {
    onEditor?.(e);
  });

  const onWordCountUpdate = useEffectEvent((count: number) => {
    onWordCountChange?.(count);
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      CodeBlock,
      ToggleableHeading.configure({ levels: [1, 2, 3] }),
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
      BlockBackground,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      ImageBlock,
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Callout,
      ToggleDetails,
      ToggleSummary,
      TableOfContents,
      Columns,
      Column,
      ColumnDrop,
      ColumnResize,
      MathBlock,
      MathInline,
      DateMention,
      AudioBlock,
      VideoBlock,
      BookmarkBlock,
      FileAttachment,
      PdfBlock,
      LinkToPage,
      SubPage,
      SlashCommand,
      createMentionExtension(() => latestMentionDocs),
      createUserMentionExtension(() => latestMentionUsers),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: { class: "rounded-lg overflow-hidden" },
      }),
      Embed,
      Markdown.configure({
        html: true,
        transformCopiedText: false,
        transformPastedText: false,
      }),
    ],
    content: (() => {
      if (!initialContent) return undefined;
      try {
        return JSON.parse(initialContent);
      } catch {
        return undefined;
      }
    })(),
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none outline-none min-h-[70vh] pt-1",
      },
    },
    onUpdate: ({ editor }) => {
      setContent(JSON.stringify(editor.getJSON()));
      setSaveStatus("unsaved");
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      onWordCountUpdate(words);
    },
  });

  useEffect(() => {
    onEditorChange(editor);
  }, [editor]);

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

  const handleLinkToggle = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt("URL");
      if (url) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      }
    }
  };

  return (
    <div className="flex flex-col">
      {editor && editable && (
        <BubbleMenu editor={editor} updateDelay={150}>
          <div className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-xl">
            {/* Turn into heading/paragraph */}
            <select
              title="Turn into"
              value={
                editor.isActive("heading", { level: 1 }) ? "h1" :
                editor.isActive("heading", { level: 2 }) ? "h2" :
                editor.isActive("heading", { level: 3 }) ? "h3" : "p"
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "p") editor.chain().focus().setParagraph().run();
                else if (v === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
                else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
                else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
              }}
              className="h-8 rounded-md border-none bg-transparent px-1.5 text-xs font-medium outline-none cursor-pointer hover:bg-muted"
            >
              <option value="p">Text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <div className="mx-0.5 h-5 w-px bg-border" />
            {bubbleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
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
            <div className="mx-0.5 h-5 w-px bg-border" />
            <button
              type="button"
              onClick={handleLinkToggle}
              title={editor.isActive("link") ? "Remove link" : "Add link"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted",
                editor.isActive("link") && "bg-muted text-foreground"
              )}
            >
              {editor.isActive("link") ? (
                <Link2Off className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </BubbleMenu>
      )}
      {editor && editable && <BlockHandle editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
