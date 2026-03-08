import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

const MIN_COLUMN_PERCENT = 10; // minimum 10% width per column

interface ColumnsInfo {
  pos: number;
  node: PMNode;
  dom: HTMLElement;
}

interface ResizeState {
  columnsPos: number;
  columnsDom: HTMLElement;
  handleIndex: number;
  startX: number;
  startWidths: number[];
  totalWidth: number;
  currentWidths: number[];
}

/**
 * Parses the widths attribute string into an array of percentages.
 * Falls back to equal distribution if invalid.
 */
function parseWidths(widths: string | null | undefined, count: number): number[] {
  if (widths) {
    const parts = widths.split(",").map(Number);
    if (parts.length === count && parts.every((n) => !isNaN(n) && n > 0)) {
      return parts;
    }
  }
  // Equal distribution
  const base = Math.round((10000 / count)) / 100;
  const result = Array.from({ length: count }, () => base);
  const sum = result.reduce((a, b) => a + b, 0);
  result[result.length - 1] = Math.round((result[result.length - 1] + (100 - sum)) * 100) / 100;
  return result;
}

/**
 * Column resize ProseMirror plugin.
 *
 * Creates absolutely positioned resize handles between columns.
 * On drag, directly manipulates the grid-template-columns style for
 * smooth feedback, then commits the final widths via a transaction
 * on mouseup.
 */
function createColumnResizePlugin(): Plugin {
  let handles: HTMLElement[] = [];
  let activeResize: ResizeState | null = null;
  let editorParent: HTMLElement | null = null;

  // Document-level handlers (attached during drag)
  function onDocMouseMove(e: MouseEvent) {
    if (!activeResize || !editorParent) return;

    const deltaX = e.clientX - activeResize.startX;
    const { startWidths, handleIndex, totalWidth } = activeResize;

    // Convert pixel delta to percentage
    const deltaPercent = (deltaX / totalWidth) * 100;

    let leftWidth = startWidths[handleIndex] + deltaPercent;
    let rightWidth = startWidths[handleIndex + 1] - deltaPercent;

    // Enforce minimum
    if (leftWidth < MIN_COLUMN_PERCENT) {
      leftWidth = MIN_COLUMN_PERCENT;
      rightWidth = startWidths[handleIndex] + startWidths[handleIndex + 1] - MIN_COLUMN_PERCENT;
    }
    if (rightWidth < MIN_COLUMN_PERCENT) {
      rightWidth = MIN_COLUMN_PERCENT;
      leftWidth = startWidths[handleIndex] + startWidths[handleIndex + 1] - MIN_COLUMN_PERCENT;
    }

    // Update current widths
    const newWidths = [...startWidths];
    newWidths[handleIndex] = Math.round(leftWidth * 100) / 100;
    newWidths[handleIndex + 1] = Math.round(rightWidth * 100) / 100;
    activeResize.currentWidths = newWidths;

    // Update DOM directly for smooth feedback (no ProseMirror transaction)
    const gridCols = newWidths.map((w) => `${w}fr`).join(" ");
    activeResize.columnsDom.style.gridTemplateColumns = gridCols;
  }

  function onDocMouseUp(view: EditorView) {
    if (!activeResize) return;

    const { columnsPos, currentWidths } = activeResize;

    // Commit final widths via transaction
    const { tr } = view.state;
    const columnsNode = view.state.doc.nodeAt(columnsPos);
    if (columnsNode) {
      tr.setNodeMarkup(columnsPos, undefined, {
        ...columnsNode.attrs,
        widths: currentWidths.join(","),
      });
      view.dispatch(tr);
    }

    // Clean up
    document.body.classList.remove("is-column-resizing");
    for (const h of handles) {
      h.classList.remove("is-resizing");
    }
    activeResize = null;

    // Rebuild handles at new positions
    requestAnimationFrame(() => {
      updateHandles(view);
    });
  }

  function findColumnsInDoc(view: EditorView): ColumnsInfo[] {
    const result: ColumnsInfo[] = [];
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === "columns") {
        const dom = view.nodeDOM(pos);
        if (dom instanceof HTMLElement) {
          result.push({ pos, node, dom });
        }
        return false; // Don't descend into columns
      }
    });
    return result;
  }

  function updateHandles(view: EditorView) {
    if (activeResize) return; // Don't update while resizing

    // Remove old handles
    for (const h of handles) {
      h.remove();
    }
    handles = [];

    if (!view.editable) return;

    const parent = view.dom.parentElement;
    if (!parent) return;
    editorParent = parent;

    // Ensure positioning context
    const computed = window.getComputedStyle(parent);
    if (computed.position === "static") {
      parent.style.position = "relative";
    }

    const parentRect = parent.getBoundingClientRect();
    const columnsInfos = findColumnsInDoc(view);

    for (const { pos, node, dom } of columnsInfos) {
      const wrapperRect = dom.getBoundingClientRect();

      // Find column child DOM elements
      const columnDoms: HTMLElement[] = [];
      for (let ci = 0; ci < dom.children.length; ci++) {
        const child = dom.children[ci];
        if (child instanceof HTMLElement && child.hasAttribute("data-column")) {
          columnDoms.push(child);
        }
      }

      // Create handles between adjacent columns
      for (let i = 0; i < columnDoms.length - 1; i++) {
        const leftCol = columnDoms[i];
        const rightCol = columnDoms[i + 1];
        const leftRect = leftCol.getBoundingClientRect();
        const rightRect = rightCol.getBoundingClientRect();

        // Position the handle in the gap between columns
        const gapCenter = (leftRect.right + rightRect.left) / 2;

        const handle = document.createElement("div");
        handle.className = "column-resize-handle";
        handle.style.position = "absolute";
        handle.style.top = `${wrapperRect.top - parentRect.top + parent.scrollTop}px`;
        handle.style.left = `${gapCenter - parentRect.left - 8}px`; // 16px wide handle, centered
        handle.style.height = `${wrapperRect.height}px`;

        const handleIndex = i;
        const columnsPos = pos;
        const columnsNode = node;

        handle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Re-read current attrs from the document (may have changed)
          const currentNode = view.state.doc.nodeAt(columnsPos);
          const attrs = currentNode ? currentNode.attrs : columnsNode.attrs;
          const count = currentNode ? currentNode.childCount : columnsNode.childCount;
          const widths = parseWidths(attrs.widths, count);
          const freshRect = dom.getBoundingClientRect();

          activeResize = {
            columnsPos,
            columnsDom: dom,
            handleIndex,
            startX: e.clientX,
            startWidths: widths,
            totalWidth: freshRect.width,
            currentWidths: [...widths],
          };

          handle.classList.add("is-resizing");
          document.body.classList.add("is-column-resizing");

          const moveHandler = (ev: MouseEvent) => onDocMouseMove(ev);
          const upHandler = () => {
            document.removeEventListener("mousemove", moveHandler);
            document.removeEventListener("mouseup", upHandler);
            onDocMouseUp(view);
          };

          document.addEventListener("mousemove", moveHandler);
          document.addEventListener("mouseup", upHandler);
        });

        parent.appendChild(handle);
        handles.push(handle);
      }
    }
  }

  return new Plugin({
    key: new PluginKey("columnResize"),

    view(editorView) {
      // Initial setup after a tick (let DOM settle)
      requestAnimationFrame(() => {
        updateHandles(editorView);
      });

      return {
        update(view) {
          // Debounce handle updates slightly to avoid excessive DOM work
          requestAnimationFrame(() => {
            updateHandles(view);
          });
        },
        destroy() {
          for (const h of handles) {
            h.remove();
          }
          handles = [];
          activeResize = null;
          editorParent = null;
        },
      };
    },
  });
}

export const ColumnResize = Extension.create({
  name: "columnResize",

  addProseMirrorPlugins() {
    return [createColumnResizePlugin()];
  },
});
