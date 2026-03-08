import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import { Fragment, Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";

const HORIZONTAL_THRESHOLD = 50; // px from edge to trigger column drop zone

// ---------------------------------------------------------------------------
// Module-level drag context — set by BlockHandle, read by ColumnDrop plugin.
// Same pattern as setLinkToPageDocsFn, latestMentionUsers, setSubPageContext.
// ---------------------------------------------------------------------------
interface DragContext {
  pos: number;
  node: PMNode;
}

let currentDragContext: DragContext | null = null;

export function setColumnDropDragContext(ctx: DragContext | null) {
  currentDragContext = ctx;
}

// ---------------------------------------------------------------------------

interface DropZone {
  side: "left" | "right";
  targetPos: number;
  targetNode: PMNode;
  isExistingColumns: boolean;
  insertAtColumnIndex?: number;
}

/**
 * Gets the position and node of the block currently being dragged.
 *
 * Uses the module-level drag context (set by BlockHandle) as the primary
 * source. Falls back to selection duck-typing and view.dragging for native
 * ProseMirror drags. Avoids `instanceof NodeRangeSelection` entirely —
 * Turbopack can create separate module instances that break instanceof.
 */
function getDraggedBlock(view: EditorView): { pos: number; node: PMNode } | null {
  // Path 1: Module-level context from BlockHandle (most reliable)
  if (currentDragContext) {
    const { pos, node } = currentDragContext;
    // Validate position is still valid in the current document
    const docNode = view.state.doc.nodeAt(pos);
    if (docNode && docNode.type === node.type && docNode.nodeSize === node.nodeSize) {
      return { pos, node: docNode };
    }
    // Position may have shifted — scan nearby offsets
    for (const offset of [-1, 1, -2, 2]) {
      const tryPos = pos + offset;
      if (tryPos >= 0 && tryPos < view.state.doc.content.size) {
        const tryNode = view.state.doc.nodeAt(tryPos);
        if (tryNode && tryNode.type === node.type && tryNode.nodeSize === node.nodeSize) {
          return { pos: tryPos, node: tryNode };
        }
      }
    }
  }

  const { selection } = view.state;

  // Path 2: NodeSelection (nested-mode DragHandle or native ProseMirror drags)
  if (selection instanceof NodeSelection && selection.node.isBlock) {
    return { pos: selection.from, node: selection.node };
  }

  // Path 3: Duck-type NodeRangeSelection via toJSON (avoids instanceof)
  try {
    const selJson = selection.toJSON();
    if (selJson && typeof selJson === "object" && selJson.type === "nodeRange") {
      const node = view.state.doc.nodeAt(selection.from);
      if (node && node.isBlock) {
        return { pos: selection.from, node };
      }
    }
  } catch {
    // toJSON may not be available on all selection types
  }

  // Path 4: Generic — try to find a block at the selection start
  if (!selection.empty) {
    const node = view.state.doc.nodeAt(selection.from);
    if (node && node.isBlock) {
      return { pos: selection.from, node };
    }
  }

  // Path 5: Fallback — extract from view.dragging.slice
  const dragging = view.dragging as {
    slice: Slice;
    move: boolean;
  } | null;

  if (dragging?.slice) {
    const { content } = dragging.slice;
    if (content.childCount === 1 && content.firstChild?.isBlock) {
      const node = view.state.doc.nodeAt(selection.from);
      if (node && node.eq(content.firstChild)) {
        return { pos: selection.from, node };
      }
    }
  }

  return null;
}

/**
 * Detects if the mouse is near the left/right edge of a top-level block.
 */
function detectHorizontalZone(
  view: EditorView,
  event: DragEvent,
  draggedPos: number
): DropZone | null {
  const coords = { left: event.clientX, top: event.clientY };
  const posInfo = view.posAtCoords(coords);
  if (!posInfo) return null;

  const $pos = view.state.doc.resolve(posInfo.pos);

  let topLevelPos: number;
  let topLevelNode: PMNode | null;

  if ($pos.depth === 0) {
    // At the boundary between top-level blocks — find nearest block
    const nodeAfter = $pos.nodeAfter;
    const nodeBefore = $pos.nodeBefore;

    if (nodeAfter) {
      topLevelPos = posInfo.pos;
      topLevelNode = nodeAfter;
    } else if (nodeBefore) {
      topLevelPos = posInfo.pos - nodeBefore.nodeSize;
      topLevelNode = nodeBefore;
    } else {
      return null;
    }
  } else {
    topLevelPos = $pos.before(1);
    topLevelNode = view.state.doc.nodeAt(topLevelPos);
  }

  if (!topLevelNode) return null;

  // Don't drop on yourself
  if (topLevelPos === draggedPos) return null;

  // Handle existing columns wrapper — allow adding if < 3 columns
  if (topLevelNode.type.name === "columns") {
    if (topLevelNode.childCount >= 3) return null;

    const domNode = view.nodeDOM(topLevelPos);
    if (!domNode || !(domNode instanceof HTMLElement)) return null;
    const rect = domNode.getBoundingClientRect();

    if (event.clientX - rect.left < HORIZONTAL_THRESHOLD) {
      return {
        side: "left",
        targetPos: topLevelPos,
        targetNode: topLevelNode,
        isExistingColumns: true,
        insertAtColumnIndex: 0,
      };
    }
    if (rect.right - event.clientX < HORIZONTAL_THRESHOLD) {
      return {
        side: "right",
        targetPos: topLevelPos,
        targetNode: topLevelNode,
        isExistingColumns: true,
        insertAtColumnIndex: topLevelNode.childCount,
      };
    }
    return null;
  }

  // Regular top-level block
  const domNode = view.nodeDOM(topLevelPos);
  if (!domNode || !(domNode instanceof HTMLElement)) return null;
  const rect = domNode.getBoundingClientRect();

  if (event.clientX - rect.left < HORIZONTAL_THRESHOLD) {
    return {
      side: "left",
      targetPos: topLevelPos,
      targetNode: topLevelNode,
      isExistingColumns: false,
    };
  }
  if (rect.right - event.clientX < HORIZONTAL_THRESHOLD) {
    return {
      side: "right",
      targetPos: topLevelPos,
      targetNode: topLevelNode,
      isExistingColumns: false,
    };
  }

  return null;
}

/**
 * Wraps two top-level blocks into a 2-column layout.
 * Operates end-to-start to avoid position mapping issues.
 */
function wrapInColumns(
  view: EditorView,
  draggedPos: number,
  draggedNode: PMNode,
  zone: DropZone
) {
  const { state } = view;
  const { tr } = state;
  const columnsType = state.schema.nodes.columns;
  const columnType = state.schema.nodes.column;
  if (!columnsType || !columnType) return;

  const targetPos = zone.targetPos;
  const targetNode = zone.targetNode;

  // Determine column order based on drop side
  let leftNode: PMNode, rightNode: PMNode;
  if (zone.side === "left") {
    leftNode = draggedNode;
    rightNode = targetNode;
  } else {
    leftNode = targetNode;
    rightNode = draggedNode;
  }

  const col1 = columnType.create(null, Fragment.from(leftNode.copy(leftNode.content)));
  const col2 = columnType.create(null, Fragment.from(rightNode.copy(rightNode.content)));
  const columnsNode = columnsType.create({ count: 2 }, Fragment.from([col1, col2]));

  // Operate end-to-start: replace the later block first, then delete the earlier
  const laterPos = Math.max(draggedPos, targetPos);
  const laterNode = laterPos === draggedPos ? draggedNode : targetNode;
  const earlierPos = Math.min(draggedPos, targetPos);
  const earlierNode = earlierPos === draggedPos ? draggedNode : targetNode;

  // Check if the two blocks are adjacent
  const earlierEnd = earlierPos + earlierNode.nodeSize;
  if (earlierEnd === laterPos) {
    // Adjacent — single replaceWith covers both
    tr.replaceWith(earlierPos, laterPos + laterNode.nodeSize, columnsNode);
  } else {
    // Non-adjacent — replace later block, then delete earlier block
    tr.replaceWith(laterPos, laterPos + laterNode.nodeSize, columnsNode);
    tr.delete(earlierPos, earlierPos + earlierNode.nodeSize);
  }

  view.dispatch(tr);
}

/**
 * Adds a block as a new column to an existing columns wrapper.
 * Operates to avoid position mapping issues.
 */
function addToExistingColumns(
  view: EditorView,
  draggedPos: number,
  draggedNode: PMNode,
  zone: DropZone
) {
  const { state } = view;
  const { tr } = state;
  const columnType = state.schema.nodes.column;
  if (!columnType) return;

  const columnsPos = zone.targetPos;
  const columnsNode = state.doc.nodeAt(columnsPos);
  if (!columnsNode) return;

  const insertIndex = zone.insertAtColumnIndex ?? columnsNode.childCount;

  const newCol = columnType.create(
    null,
    Fragment.from(draggedNode.copy(draggedNode.content))
  );

  // Calculate insert position inside the columns node
  let insertPos = columnsPos + 1; // +1 to enter the columns node
  for (let i = 0; i < insertIndex; i++) {
    insertPos += columnsNode.child(i).nodeSize;
  }

  if (draggedPos > columnsPos) {
    // Dragged block is AFTER columns: delete it first (doesn't affect insertPos)
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
    tr.insert(insertPos, newCol);
  } else {
    // Dragged block is BEFORE columns: insert first, then delete
    tr.insert(insertPos, newCol);
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
  }

  // Update the count attribute
  const mappedColumnsPos = tr.mapping.map(columnsPos);
  const newColumnsNode = tr.doc.nodeAt(mappedColumnsPos);
  if (newColumnsNode) {
    tr.setNodeMarkup(mappedColumnsPos, undefined, {
      count: newColumnsNode.childCount,
    });
  }

  view.dispatch(tr);
}

/**
 * Column drop ProseMirror plugin.
 *
 * Uses module-level drag context from BlockHandle (set via
 * setColumnDropDragContext) as the primary source for identifying the
 * dragged block. Falls back to selection/view.dragging for native drags.
 */
function createColumnDropPlugin(): Plugin {
  let indicator: HTMLElement | null = null;
  let activeZone: DropZone | null = null;
  // Cache to prevent pulsing — only update DOM when zone changes
  let lastZoneKey = "";

  function getOrCreateIndicator(view: EditorView): HTMLElement {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "column-drop-indicator";
      const parent = view.dom.parentElement;
      if (parent) {
        // Ensure the parent is a positioning context for absolute children.
        // Without this, the indicator ends up positioned relative to a
        // far-away ancestor (e.g. the page container above the cover image).
        const computed = window.getComputedStyle(parent);
        if (computed.position === "static") {
          parent.style.position = "relative";
        }
        parent.appendChild(indicator);
      }
    }
    return indicator;
  }

  function showIndicator(view: EditorView, zone: DropZone) {
    const zoneKey = `${zone.targetPos}:${zone.side}`;
    if (zoneKey === lastZoneKey) return; // No change, skip DOM writes
    lastZoneKey = zoneKey;

    const el = getOrCreateIndicator(view);
    const domNode = view.nodeDOM(zone.targetPos);
    if (!domNode || !(domNode instanceof HTMLElement)) {
      hideIndicator(view);
      return;
    }

    const rect = domNode.getBoundingClientRect();
    const parent = view.dom.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    el.style.display = "block";
    el.style.top = rect.top - parentRect.top + parent.scrollTop + "px";
    el.style.height = rect.height + "px";

    if (zone.side === "left") {
      el.style.left = rect.left - parentRect.left - 2 + "px";
    } else {
      el.style.left = rect.right - parentRect.left + "px";
    }

    // Highlight the target block
    const prev = view.dom.querySelector(".column-drop-target");
    if (prev) prev.classList.remove("column-drop-target");
    domNode.classList.add("column-drop-target");

    view.dom.classList.add("column-drop-active");
  }

  function hideIndicator(view?: EditorView) {
    if (indicator) {
      indicator.style.display = "none";
    }
    lastZoneKey = "";
    if (view) {
      view.dom.classList.remove("column-drop-active");
      const target = view.dom.querySelector(".column-drop-target");
      if (target) target.classList.remove("column-drop-target");
    }
  }

  return new Plugin({
    key: new PluginKey("columnDrop"),

    view() {
      return {
        destroy() {
          if (indicator?.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
          indicator = null;
          activeZone = null;
          lastZoneKey = "";
          currentDragContext = null;
        },
      };
    },

    props: {
      handleDOMEvents: {
        dragover(view: EditorView, event: DragEvent) {
          const dragged = getDraggedBlock(view);
          if (!dragged) {
            if (activeZone) {
              activeZone = null;
              hideIndicator(view);
            }
            return false;
          }

          const zone = detectHorizontalZone(view, event, dragged.pos);

          if (zone) {
            activeZone = zone;
            showIndicator(view, zone);
            event.preventDefault();
            return true; // Prevent ProseMirror's default drop cursor
          } else if (activeZone) {
            activeZone = null;
            hideIndicator(view);
          }
          return false;
        },

        dragleave(view: EditorView, event: DragEvent) {
          if (!view.dom.contains(event.relatedTarget as Node)) {
            activeZone = null;
            hideIndicator(view);
          }
          return false;
        },

        dragend(view: EditorView) {
          activeZone = null;
          hideIndicator(view);
          currentDragContext = null;
          return false;
        },
      },

      handleDrop(
        view: EditorView,
        event: DragEvent,
        _slice: Slice,
        _moved: boolean
      ) {
        if (!activeZone) return false;

        const dragged = getDraggedBlock(view);
        if (!dragged) {
          activeZone = null;
          hideIndicator(view);
          return false;
        }

        // Don't nest columns
        if (dragged.node.type.name === "columns") {
          activeZone = null;
          hideIndicator(view);
          return false;
        }

        // Don't drop on self
        if (dragged.pos === activeZone.targetPos) {
          activeZone = null;
          hideIndicator(view);
          return false;
        }

        event.preventDefault();

        const { pos, node } = dragged;
        const zone = activeZone;
        activeZone = null;
        hideIndicator(view);
        currentDragContext = null;

        try {
          if (zone.isExistingColumns) {
            addToExistingColumns(view, pos, node, zone);
          } else {
            wrapInColumns(view, pos, node, zone);
          }
        } catch (e) {
          console.error("[ColumnDrop] Failed to create columns:", e);
        }

        return true;
      },
    },
  });
}

/**
 * Cleanup plugin — unwraps columns that end up with < 2 children.
 */
function createColumnsCleanupPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey("columnsCleanup"),

    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((t) => t.docChanged)) return null;

      const { tr } = newState;
      let changed = false;

      const columnsPositions: { pos: number; node: PMNode }[] = [];
      newState.doc.descendants((node, pos) => {
        if (node.type.name === "columns") {
          columnsPositions.push({ pos, node });
          return false;
        }
      });

      for (let i = columnsPositions.length - 1; i >= 0; i--) {
        const { pos, node } = columnsPositions[i];

        if (node.childCount < 2) {
          const mappedPos = tr.mapping.map(pos);
          if (node.childCount === 1) {
            tr.replaceWith(mappedPos, mappedPos + node.nodeSize, node.firstChild!.content);
          } else {
            const para = newState.schema.nodes.paragraph.create();
            tr.replaceWith(mappedPos, mappedPos + node.nodeSize, para);
          }
          changed = true;
        }
      }

      return changed ? tr : null;
    },
  });
}

export const ColumnDrop = Extension.create({
  name: "columnDrop",

  addProseMirrorPlugins() {
    return [createColumnDropPlugin(), createColumnsCleanupPlugin()];
  },
});
