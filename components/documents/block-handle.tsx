"use client";

import { useState } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { setColumnDropDragContext } from "./column-drop-extension";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Info,
} from "lucide-react";

interface BlockHandleProps {
  editor: Editor;
}

export function BlockHandle({ editor }: BlockHandleProps) {
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [currentPos, setCurrentPos] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAdd = () => {
    if (currentNode) {
      const endPos = currentPos + currentNode.nodeSize;
      editor
        .chain()
        .focus()
        .insertContentAt(endPos, { type: "paragraph" })
        .setTextSelection(endPos + 1)
        .run();

      // Trigger slash command by inserting "/"
      setTimeout(() => {
        editor.commands.insertContent("/");
      }, 0);
    }
  };

  const handleDelete = () => {
    editor
      .chain()
      .focus()
      .setNodeSelection(currentPos)
      .deleteSelection()
      .run();
  };

  const handleDuplicate = () => {
    if (currentNode) {
      const endPos = currentPos + currentNode.nodeSize;
      const nodeJson = currentNode.toJSON();
      editor
        .chain()
        .focus()
        .insertContentAt(endPos, nodeJson)
        .run();
    }
  };

  const turnInto = (type: string, attrs?: Record<string, unknown>) => {
    editor.chain().focus().setNodeSelection(currentPos).run();

    switch (type) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        break;
      case "heading":
        editor
          .chain()
          .focus()
          .setHeading({ level: (attrs?.level as 1 | 2 | 3) ?? 1 })
          .run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "blockquote":
        editor.chain().focus().setBlockquote().run();
        break;
      case "codeBlock":
        editor.chain().focus().setCodeBlock().run();
        break;
      case "callout":
        editor.chain().focus().setCallout({ type: (attrs?.type as "info") ?? "info" }).run();
        break;
    }
  };

  return (
    <DragHandle
      editor={editor}
      nested={{
        edgeDetection: "none",
        rules: [
          {
            id: "excludeColumnNodes",
            evaluate: ({ node }: { node: { type: { name: string } } }) => {
              if (node.type.name === "columns" || node.type.name === "column") {
                return -1000;
              }
              return 0;
            },
          },
          {
            id: "preferWrapperBlocks",
            evaluate: ({ node }: { node: { type: { name: string } } }) => {
              const wrapperTypes = [
                "blockquote", "callout", "toggleDetails",
                "bulletList", "orderedList", "taskList", "table",
              ];
              if (wrapperTypes.includes(node.type.name)) return 1000;
              return 0;
            },
          },
        ],
      }}
      className={`block-handle${menuOpen ? " menu-open" : ""}`}
      onNodeChange={({ node, pos }) => {
        setCurrentNode(node);
        setCurrentPos(pos);
      }}
      onElementDragStart={() => {
        if (currentNode && currentPos >= 0) {
          editor.commands.setNodeSelection(currentPos);
          setColumnDropDragContext({ pos: currentPos, node: currentNode });
        }
      }}
      onElementDragEnd={() => {
        setColumnDropDragContext(null);
      }}
    >
      <div className="block-handle-buttons">
        <button
          type="button"
          className="block-handle-btn"
          onClick={handleAdd}
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <div className="relative">
          {/* Grip button - onClick for menu, drag handled by DragHandle ancestor */}
          <button
            type="button"
            className="block-handle-btn block-handle-grip"
            onClick={() => setMenuOpen(true)}
            title="Drag to move / Click for options"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Hidden trigger for DropdownMenu positioning - pointer-events:none
              so it doesn't intercept pointerdown and block drag behavior */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              className="absolute inset-0 h-full w-full opacity-0"
              style={{ pointerEvents: "none" }}
              tabIndex={-1}
              aria-hidden="true"
            />
            <DropdownMenuContent align="start" side="right" sideOffset={8}>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Type className="mr-2 h-4 w-4" />
                  Turn into
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => turnInto("paragraph")}>
                    <Type className="mr-2 h-4 w-4" />
                    Text
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => turnInto("heading", { level: 1 })}
                  >
                    <Heading1 className="mr-2 h-4 w-4" />
                    Heading 1
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => turnInto("heading", { level: 2 })}
                  >
                    <Heading2 className="mr-2 h-4 w-4" />
                    Heading 2
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => turnInto("heading", { level: 3 })}
                  >
                    <Heading3 className="mr-2 h-4 w-4" />
                    Heading 3
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => turnInto("bulletList")}>
                    <List className="mr-2 h-4 w-4" />
                    Bullet List
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => turnInto("orderedList")}>
                    <ListOrdered className="mr-2 h-4 w-4" />
                    Numbered List
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => turnInto("blockquote")}>
                    <Quote className="mr-2 h-4 w-4" />
                    Quote
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => turnInto("codeBlock")}>
                    <Code className="mr-2 h-4 w-4" />
                    Code Block
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => turnInto("callout")}>
                    <Info className="mr-2 h-4 w-4" />
                    Callout
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </DragHandle>
  );
}
