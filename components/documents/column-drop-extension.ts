import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import { Fragment, Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";

const MIN_COLUMN_WIDTH = 100; // px — refuse to create columns narrower than this

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

/**
 * Resolves a nested block position to its top-level (or column-child) ancestor.
 * Ensures the ColumnDrop plugin always works with positions that
 * wrapInColumns/addToExistingColumns can safely manipulate.
 */
function resolveToTopLevel(
  doc: PMNode,
  pos: number,
  node: PMNode
): { pos: number; node: PMNode } {
  const $pos = doc.resolve(pos);

  // Already at top-level (direct child of doc)
  if ($pos.depth <= 1) return { pos, node };

  // If nested inside a column, resolve to the direct child of the column
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === "column") {
      for (let cd = $pos.depth; cd > d; cd--) {
        if ($pos.node(cd - 1).type.name === "column") {
          const resolvedPos = $pos.before(cd);
          const resolvedNode = doc.nodeAt(resolvedPos);
          if (resolvedNode) return { pos: resolvedPos, node: resolvedNode };
        }
      }
      return { pos, node };
    }
  }

  // Not inside a column — resolve to top-level ancestor (depth 1)
  const topPos = $pos.before(1);
  const topNode = doc.nodeAt(topPos);
  if (topNode) return { pos: topPos, node: topNode };

  return { pos, node };
}

interface DropZone {
  side: "left" | "right";
  targetPos: number;
  targetNode: PMNode;
  isExistingColumns: boolean;
  insertAtColumnIndex?: number;
}

/**
 * Checks if `pos` is nested inside a columns wrapper.
 */
function getAncestorColumnsPos(doc: PMNode, pos: number): number | null {
  const $pos = doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === "columns") {
      return $pos.before(d);
    }
  }
  return null;
}

/**
 * Computes the horizontal threshold for triggering column drop zones.
 * Uses 15% of block width, clamped between 40px and 100px.
 */
function getThreshold(rect: DOMRect): number {
  const proportional = rect.width * 0.15;
  return Math.max(40, Math.min(proportional, 100));
}

/**
 * Computes equal-width values for `count` columns, summing to 100.
 * Returns a comma-separated string like "50,50" or "33.33,33.33,33.34".
 */
function equalWidths(count: number): string {
  const base = Math.round((10000 / count)) / 100;
  const parts = Array.from({ length: count }, () => base);
  const sum = parts.reduce((a, b) => a + b, 0);
  parts[parts.length - 1] = Math.round((parts[parts.length - 1] + (100 - sum)) * 100) / 100;
  return parts.join(",");
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
    if (docNode && docNode.type.name === node.type.name) {
      return { pos, node: docNode };
    }
    // Position may have shifted — scan nearby offsets
    for (const offset of [-1, 1, -2, 2]) {
      const tryPos = pos + offset;
      if (tryPos >= 0 && tryPos < view.state.doc.content.size) {
        const tryNode = view.state.doc.nodeAt(tryPos);
        if (tryNode && tryNode.type.name === node.type.name) {
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

  // Don't drop on an ancestor of the dragged block (nested blocks inside columns)
  const $dragPos = view.state.doc.resolve(draggedPos);
  for (let d = $dragPos.depth; d > 0; d--) {
    if ($dragPos.before(d) === topLevelPos) return null;
  }

  // Handle existing columns wrapper — dynamic width-based limit
  if (topLevelNode.type.name === "columns") {
    const domNode = view.nodeDOM(topLevelPos);
    if (!domNode || !(domNode instanceof HTMLElement)) return null;
    const rect = domNode.getBoundingClientRect();

    // Check if adding another column would make columns too narrow
    if (rect.width / (topLevelNode.childCount + 1) < MIN_COLUMN_WIDTH) return null;

    const threshold = getThreshold(rect);

    if (event.clientX - rect.left < threshold) {
      return {
        side: "left",
        targetPos: topLevelPos,
        targetNode: topLevelNode,
        isExistingColumns: true,
        insertAtColumnIndex: 0,
      };
    }
    if (rect.right - event.clientX < threshold) {
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
  const threshold = getThreshold(rect);

  if (event.clientX - rect.left < threshold) {
    return {
      side: "left",
      targetPos: topLevelPos,
      targetNode: topLevelNode,
      isExistingColumns: false,
    };
  }
  if (rect.right - event.clientX < threshold) {
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
  const columnsNode = columnsType.create(
    { count: 2, widths: equalWidths(2) },
    Fragment.from([col1, col2])
  );

  // Check if dragged block is nested inside a column
  const isNested = getAncestorColumnsPos(state.doc, draggedPos) !== null;

  if (isNested) {
    // Nested source: delete from column first, then replace the target
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
    const mappedTargetPos = tr.mapping.map(targetPos);
    const mappedTargetNode = tr.doc.nodeAt(mappedTargetPos);
    if (mappedTargetNode) {
      tr.replaceWith(mappedTargetPos, mappedTargetPos + mappedTargetNode.nodeSize, columnsNode);
    }
  } else {
    // Both are top-level — operate end-to-start
    const laterPos = Math.max(draggedPos, targetPos);
    const laterNode = laterPos === draggedPos ? draggedNode : targetNode;
    const earlierPos = Math.min(draggedPos, targetPos);
    const earlierNode = earlierPos === draggedPos ? draggedNode : targetNode;

    const earlierEnd = earlierPos + earlierNode.nodeSize;
    if (earlierEnd === laterPos) {
      tr.replaceWith(earlierPos, laterPos + laterNode.nodeSize, columnsNode);
    } else {
      tr.replaceWith(laterPos, laterPos + laterNode.nodeSize, columnsNode);
      tr.delete(earlierPos, earlierPos + earlierNode.nodeSize);
    }
  }

  view.dispatch(tr);
}

/**
 * Adds a block as a new column to an existing columns wrapper.
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

  // Check if dragged block is nested inside a column
  const isNested = getAncestorColumnsPos(state.doc, draggedPos) !== null;

  if (isNested) {
    // Nested source: delete from column first, then insert new column
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
    const mappedInsertPos = tr.mapping.map(insertPos);
    tr.insert(mappedInsertPos, newCol);
  } else if (draggedPos > columnsPos) {
    // Top-level AFTER columns: delete first (doesn't affect insertPos)
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
    tr.insert(insertPos, newCol);
  } else {
    // Top-level BEFORE columns: insert first, then delete
    tr.insert(insertPos, newCol);
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
  }

  // Update the count and widths attributes
  const mappedColumnsPos = tr.mapping.map(columnsPos);
  const newColumnsNode = tr.doc.nodeAt(mappedColumnsPos);
  if (newColumnsNode) {
    const newCount = newColumnsNode.childCount;
    tr.setNodeMarkup(mappedColumnsPos, undefined, {
      count: newCount,
      widths: equalWidths(newCount),
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

          const resolved = resolveToTopLevel(view.state.doc, dragged.pos, dragged.node);
          const zone = detectHorizontalZone(view, event, resolved.pos);

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

        const resolved = resolveToTopLevel(view.state.doc, dragged.pos, dragged.node);

        // Don't nest columns
        if (resolved.node.type.name === "columns") {
          activeZone = null;
          hideIndicator(view);
          return false;
        }

        // Don't drop on self
        if (resolved.pos === activeZone.targetPos) {
          activeZone = null;
          hideIndicator(view);
          return false;
        }

        event.preventDefault();

        const { pos, node } = resolved;
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
 * Cleanup plugin — removes empty columns and unwraps columns wrappers
 * that end up with fewer than 2 non-empty children.
 * Runs as appendTransaction so it fires synchronously before view update.
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

      // Process end-to-start to keep position mapping correct
      for (let i = columnsPositions.length - 1; i >= 0; i--) {
        const { pos, node } = columnsPositions[i];

        // Collect non-empty column children
        const nonEmptyColumns: PMNode[] = [];
        node.forEach((child) => {
          if (child.type.name === "column" && child.childCount > 0) {
            nonEmptyColumns.push(child);
          }
        });

        // All columns have content — check if count attribute is stale
        if (nonEmptyColumns.length === node.childCount) {
          if (node.childCount < 2) {
            // Shouldn't happen normally but handle edge case
            const mappedPos = tr.mapping.map(pos);
            if (node.childCount === 1) {
              tr.replaceWith(mappedPos, mappedPos + node.nodeSize, node.firstChild!.content);
            } else {
              const para = newState.schema.nodes.paragraph.create();
              tr.replaceWith(mappedPos, mappedPos + node.nodeSize, para);
            }
            changed = true;
          }
          continue;
        }

        const mappedPos = tr.mapping.map(pos);

        if (nonEmptyColumns.length < 2) {
          // 0 or 1 non-empty columns — unwrap entirely
          if (nonEmptyColumns.length === 1) {
            tr.replaceWith(mappedPos, mappedPos + node.nodeSize, nonEmptyColumns[0].content);
          } else {
            const para = newState.schema.nodes.paragraph.create();
            tr.replaceWith(mappedPos, mappedPos + node.nodeSize, para);
          }
          changed = true;
        } else {
          // Some columns are empty — rebuild with only non-empty columns
          const columnsType = newState.schema.nodes.columns;
          const newCount = nonEmptyColumns.length;
          const newColumnsNode = columnsType.create(
            { count: newCount, widths: equalWidths(newCount) },
            Fragment.from(nonEmptyColumns)
          );
          tr.replaceWith(mappedPos, mappedPos + node.nodeSize, newColumnsNode);
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
