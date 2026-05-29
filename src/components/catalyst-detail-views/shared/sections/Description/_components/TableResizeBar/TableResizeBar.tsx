/**
 * TableResizeBar — small 2px blue vertical bar pinned to the right
 * edge of EVERY table in the editor (always visible, not just on
 * hover). Click + drag horizontally to change the table's WIDTH only
 * (height stays auto-driven by row content). On release, the new
 * width is persisted via a transaction that sets the `width` attribute
 * on the table node (rendered as inline style on the <table> tag —
 * see the Table extension override in useTiptapEditor.ts).
 *
 * Architecture:
 *   - Top-level component scans the doc on every transaction +
 *     window/container resize and produces an Anchor per table.
 *   - Each anchor is rendered as a <TableResizeBarItem/> that owns
 *     its own drag state. During drag we apply the new width inline
 *     for instant feedback and live-override the bar's left coord;
 *     on mouseup we dispatch one transaction and let recompute
 *     re-measure everything.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface Anchor {
  tablePos: number;
  top: number;
  left: number;
  height: number;
}

const BAR_WIDTH = 2;
const HIT_WIDTH = 10;
const BAR_GAP = 4;
const MAX_VISIBLE_BAR_HEIGHT = 48;
const MIN_TABLE_WIDTH = 120;

export function TableResizeBar({ editor, containerRef }: Props) {
  const [anchors, setAnchors] = useState<Anchor[]>([]);

  const recompute = useCallback(() => {
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const result: Anchor[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "table") return true;
        // prosemirror-tables wraps every <table> in a
        // <div class="tableWrapper">, so nodeDOM(pos) typically returns
        // the wrapper. Drill down to the actual <table>.
        const rendered = editor.view.nodeDOM(pos) as HTMLElement | null;
        if (!rendered) return false;
        const tableDom =
          rendered.tagName === "TABLE"
            ? (rendered as HTMLTableElement)
            : (rendered.querySelector("table") as HTMLTableElement | null);
        if (!tableDom) return false;
        const rect = tableDom.getBoundingClientRect();
        result.push({
          tablePos: pos,
          top: rect.top - containerRect.top + container.scrollTop,
          left: rect.right - containerRect.left + container.scrollLeft,
          height: rect.height,
        });
        return false; // tables don't nest in tables
      });
      setAnchors(result);
    });
  }, [editor, containerRef]);

  // Recompute on doc / view updates.
  useEffect(() => {
    recompute();
    editor.on("transaction", recompute);
    editor.on("update", recompute);
    editor.on("selectionUpdate", recompute);
    return () => {
      editor.off("transaction", recompute);
      editor.off("update", recompute);
      editor.off("selectionUpdate", recompute);
    };
  }, [editor, recompute]);

  // Recompute on viewport / container resize.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    window.addEventListener("resize", recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => {
      window.removeEventListener("resize", recompute);
      ro.disconnect();
    };
  }, [containerRef, recompute]);

  if (!editor.isEditable) return null;

  return (
    <>
      {anchors.map((anchor) => (
        <TableResizeBarItem
          key={anchor.tablePos}
          anchor={anchor}
          editor={editor}
        />
      ))}
    </>
  );
}

interface ItemProps {
  anchor: Anchor;
  editor: Editor;
}

function TableResizeBarItem({ anchor, editor }: ItemProps) {
  const [dragging, setDragging] = useState(false);
  const [liveLeft, setLiveLeft] = useState<number | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startWidth: number;
    startBarLeft: number;
    tableEl: HTMLElement;
  } | null>(null);

  // Clear the drag-time override the moment the parent feeds us a
  // fresh anchor (i.e. the post-transaction recompute has landed).
  // The new anchor.left already reflects the resized right edge, so
  // switching off the override produces no visible jump.
  useEffect(() => {
    if (!dragging) setLiveLeft(null);
  }, [anchor.left, anchor.top, dragging]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = e.clientX - state.startX;
      const newWidth = Math.max(MIN_TABLE_WIDTH, state.startWidth + dx);
      // Inline style with !important — beats every CSS rule, including
      // stale rules left over in the page from earlier versions of
      // editorStyles. This is the only thing presentational HTML
      // width="N" can't do on a <table>.
      state.tableEl.style.setProperty(
        "width",
        `${Math.round(newWidth)}px`,
        "important",
      );
      setLiveLeft(state.startBarLeft + (newWidth - state.startWidth));
    };
    const onUp = () => {
      const state = dragStateRef.current;
      if (state) {
        const styleW = state.tableEl.style.width;
        const m = styleW.match(/(\d+)/);
        const finalWidth = m ? parseInt(m[1], 10) : 0;
        if (finalWidth >= MIN_TABLE_WIDTH) {
          editor
            .chain()
            .command(({ tr, state: pmState }) => {
              const node = pmState.doc.nodeAt(anchor.tablePos);
              if (!node || node.type.name !== "table") return false;
              tr.setNodeMarkup(anchor.tablePos, undefined, {
                ...node.attrs,
                width: finalWidth,
              });
              return true;
            })
            .run();
        }
      }
      dragStateRef.current = null;
      setDragging(false);
      // Intentionally do NOT clear liveLeft here. The anchor recompute
      // is async (rAF in the parent), so clearing now would fall back
      // to the stale anchor for one frame → visible blink. The
      // useEffect below clears liveLeft when the fresh anchor lands.
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, editor, anchor.tablePos]);

  const onMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    const rendered = editor.view.nodeDOM(anchor.tablePos) as
      | HTMLElement
      | null;
    if (!rendered) return;
    const tableEl =
      rendered.tagName === "TABLE"
        ? (rendered as HTMLTableElement)
        : (rendered.querySelector("table") as HTMLTableElement | null);
    if (!tableEl) return;
    dragStateRef.current = {
      startX: e.clientX,
      startWidth: tableEl.getBoundingClientRect().width,
      startBarLeft: anchor.left + BAR_GAP,
      tableEl,
    };
    setDragging(true);
  };

  const visibleHeight = Math.min(
    MAX_VISIBLE_BAR_HEIGHT,
    Math.max(20, anchor.height * 0.6),
  );
  const left = liveLeft != null ? liveLeft : anchor.left + BAR_GAP;

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        top: anchor.top,
        left,
        width: HIT_WIDTH,
        height: anchor.height,
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 6,
        userSelect: "none",
      }}
      aria-label="Resize table width"
    >
      <div
        style={{
          width: BAR_WIDTH,
          height: visibleHeight,
          background: dragging
            ? "var(--ds-link-pressed, #0055CC)"
            : "var(--ds-link, #0C66E4)",
          borderRadius: 1,
          transition: dragging ? "none" : "background-color 120ms ease",
        }}
      />
    </div>
  );
}
