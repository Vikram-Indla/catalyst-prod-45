/**
 * SidebarRow — single tree row in the Timeline sidebar.
 *
 * Hub-agnostic. Each interactive surface (checkbox, collapse toggle,
 * inline create, more-actions menu and its child modals) is gated by a feature
 * flag or the presence of a mutation callback. Pages provide whichever subset
 * applies; the row hides everything else cleanly.
 */

import React, { useState, useRef, useEffect } from "react";
import { createPortal, flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import Avatar from "@atlaskit/avatar";
import Tooltip from "@atlaskit/tooltip";
import Button from "@atlaskit/button";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from "@atlaskit/modal-dialog";
import MoreIcon from "@atlaskit/icon/glyph/more";
import EditorAddIcon from "@atlaskit/icon/glyph/editor/add";
import EditorDoneIcon from "@atlaskit/icon/glyph/editor/done";
import CrossIcon from "@atlaskit/icon/glyph/cross";
import { useNavigate } from "react-router-dom";
import { JiraIssueTypeIcon } from "@/lib/jira-issue-type-icons";
import { StatusLozenge } from "@/components/shared/StatusLozenge";
import { resolveAvatarUrl } from "@/lib/avatars";
import {
  type TimelineIssue,
  type TimelineMutations,
  ROW_H,
  JIRA_EPIC_COLORS,
} from "./types";
import { iconBtnStyle, flattenAll, formatDateCompact } from "./utils";
import { PortalMenu, MenuItemRow } from "./primitives";
import { EditDatesModal } from "./EditDatesModal";
import { ProductEditDatesModal } from "./ProductEditDatesModal";
import { ProductTimelineRowMenu } from "./ProductTimelineRowMenu";

/**
 * RowDragPreviewChip — the compact "ghost" that follows the cursor while a row
 * is dragged (Jira timeline parity, img #53): type icon + truncated summary in
 * an elevated overlay chip. Rendered into a native drag-preview container.
 */
function RowDragPreviewChip({ issue }: { issue: TimelineIssue }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 320,
        padding: "6px 10px",
        background: "var(--ds-surface-overlay)",
        border: "1px solid var(--ds-border)",
        borderRadius: 4,
        boxShadow: "var(--ds-shadow-overlay)",
        fontSize: "var(--ds-font-size-200)",
        color: "var(--ds-text)",
        whiteSpace: "nowrap",
      }}
    >
      <JiraIssueTypeIcon type={issue.issueType} size={16} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {issue.summary}
      </span>
    </div>
  );
}

/**
 * RowDragGrip — the 6-dot drag handle. The sidebar scroll container clips on
 * its left edge (`overflowX:hidden`), so the grip is PORTALED to <body> at
 * fixed coords derived from the row rect — same escape-the-clip pattern the
 * backlog table uses. Because a body-portal grip is OUTSIDE the row, it can't
 * be a `dragHandle` on a row-level draggable; instead the grip IS its own pdnd
 * draggable carrying `{ rowId, parentKey }`. The per-row drop targets + the
 * global monitor (in TimelineView) do the actual reorder.
 */
function RowDragGrip({
  issue,
  rect,
  onDragStateChange,
}: {
  issue: TimelineIssue;
  rect: DOMRect;
  onDragStateChange: (on: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ rowId: issue.issueKey, parentKey: issue.parentKey ?? null }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({ x: "12px", y: "8px" }),
          render: ({ container }) => {
            const root = createRoot(container);
            /* flushSync forces the chip DOM to commit SYNCHRONOUSLY. pdnd hands
               the container to the browser's native drag-image snapshot
               immediately after this render callback returns — a plain async
               root.render() leaves the container empty at snapshot time, so the
               drag image comes out blank (no type icon, no title). */
            flushSync(() => {
              root.render(<RowDragPreviewChip issue={issue} />);
            });
            return () => root.unmount();
          },
        });
      },
      /* Signal drag start/stop UP to the row so it can (a) keep this grip
         MOUNTED for the whole drag — otherwise the row loses hover as the
         pointer moves onto other rows, this portal unmounts, and the drag
         aborts before drop — and (b) dim the source row like Jira. */
      onDragStart: () => onDragStateChange(true),
      onDrop: () => onDragStateChange(false),
    });
  }, [issue.issueKey, issue.parentKey, issue.issueType, issue.summary, onDragStateChange]);

  return createPortal(
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        left: rect.left + 2,
        top: rect.top + rect.height / 2 - 9,
        width: 18,
        height: 18,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ds-surface-overlay)",
        border: "1px solid var(--ds-border)",
        borderRadius: 4,
        boxShadow: "var(--ds-shadow-overlay)",
        color: "var(--ds-icon-subtle)",
        cursor: "grab",
        zIndex: 9998,
      }}
    >
      <span style={{ display: "inline-flex", transform: "scale(0.72)" }}>
        {/* 6-dot grip — no ADS icon equivalent; inline SVG (currentColor). */}
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </span>
    </div>,
    document.body,
  );
}

export interface SidebarRowProps {
  issue: TimelineIssue;
  depth: number;
  collapsed: boolean;
  onToggle: (key: string) => void;
  isSelected: boolean;
  onSelect: (key: string) => void;
  onOpenDetail: (issue: TimelineIssue) => void;
  buildIssueDetailRoute: (issueKey: string) => string;
  /** When provided, the row uses this to compute parent candidates / available versions. */
  allItems: TimelineIssue[];
  /* feature flags */
  enableCheckbox?: boolean;
  enableInlineCreate?: boolean;
  enableMenu?: boolean;
  /** Enables the Jira-parity drag-handle grip + drag-reorder. Only effective
   *  when `mutations.onReorderToIndex` is provided. */
  enableRowDrag?: boolean;
  /* mutations (used by menu / inline create / edit dates) */
  mutations?: TimelineMutations;
  /** Override the inline-create type picker options. Default is derived from
   *  the parent issue type (Epic → Story/Feature/Task, etc.). Product hub
   *  passes ['Business Request'] so the picker collapses to a single option. */
  childTypesOverride?: string[];
  /** When true, only group rows can have children. Used by product hub so
   *  BR rows inside a group don't show a "+" button. */
  childrenOnlyOnGroupRows?: boolean;
  /** When true, only top-level (depth 0) rows can have children — nested
   *  rows lose their "+". Product hub uses this so BR subtasks don't spawn
   *  their own grandchildren via the timeline. */
  childrenOnlyOnTopLevel?: boolean;
  /** Picks which menu component renders. `default` uses the legacy inline
   *  flat menu; `jira` mounts ProductTimelineRowMenu (the Jira-parity
   *  menu shared by product hub + project hub) and swaps in
   *  ProductEditDatesModal. */
  menuVariant?: "default" | "jira";
  /** Siblings of this row (same parent) in render order. Only used when
   *  menuVariant === 'product-jira' so the Move submenu can compute first
   *  / last boundaries. */
  siblings?: TimelineIssue[];
  /** This row IS the "located" work item (Jira locate-in-timeline) — its
   *  title renders as a magenta pill. */
  isLocated?: boolean;
  /** This row is an ANCESTOR of the located work item — its collapse
   *  chevron renders magenta. */
  isLocatedAncestor?: boolean;
  /** List-mode (dependency) tint — this row is dependency-involved (or an
   *  ancestor of one). Renders the #F0F1F2 band. */
  tinted?: boolean;
  /** Shared hovered row key (synced with the dependency columns panel).
   *  When `onSharedHover` is provided, row hover is driven by this instead
   *  of the row's internal hover state. */
  sharedHoveredKey?: string | null;
  onSharedHover?: (key: string | null) => void;
  /** Drop the row's bottom border (List/dependency view — Jira shows no row rules). */
  hideRowBorder?: boolean;
  /** Fired when this row's inline-create opens/closes, so the gantt can insert a
   *  matching #dddee1 row and keep both panels aligned. */
  onInlineCreateChange?: (key: string, open: boolean) => void;
  /** The timeline-wide open inline-create key — this row auto-closes its own
   *  inline-create when a different row's opens (only one open at a time). */
  activeInlineCreateKey?: string | null;
  /** The hub's top-level work-item type (Epic for project, Business Request for
   *  product, etc.) — drives sibling-create type + the progress-bar container. */
  topLevelType?: string;
}

export function SidebarRow({
  issue,
  depth,
  collapsed,
  onToggle,
  isSelected,
  onSelect,
  onOpenDetail,
  buildIssueDetailRoute,
  allItems,
  enableCheckbox = true,
  enableInlineCreate = true,
  enableMenu = true,
  enableRowDrag = false,
  mutations,
  childTypesOverride,
  childrenOnlyOnGroupRows = false,
  childrenOnlyOnTopLevel = false,
  menuVariant = "default",
  siblings = [],
  isLocated = false,
  isLocatedAncestor = false,
  tinted = false,
  sharedHoveredKey = null,
  onSharedHover,
  hideRowBorder = false,
  onInlineCreateChange,
  activeInlineCreateKey = null,
  topLevelType = "Epic",
}: SidebarRowProps) {
  const hasChildren = issue.children.length > 0;
  const [rowHovered, setRowHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── Drag-reorder (grip) — Jira timeline parity (img #55) ─────────────── */
  const rowRef = useRef<HTMLDivElement>(null);
  const [gripRect, setGripRect] = useState<DOMRect | null>(null);
  const [dropEdge, setDropEdge] = useState<Edge | null>(null);
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  /* True while THIS row is the drag source. Keeps the portaled grip mounted
     for the whole drag (the pointer leaves the row → hover flips false → the
     grip would otherwise unmount and abort the drag) AND highlights the source
     row blue at full opacity — Jira does NOT fade the source (img #55). */
  const [isDragging, setIsDragging] = useState(false);
  const handleDragState = React.useCallback((on: boolean) => {
    setIsDragging(on);
    if (on) setRowHovered(true);
  }, []);
  /* Draggable rows: real (non-group, persisted) rows on a hub that provides
     the index reorder mutation. Temp/local keys can't persist a position. */
  const canDragRow =
    enableRowDrag &&
    !!mutations?.onReorderToIndex &&
    !issue.isGroup &&
    !issue.issueKey.includes("-LOCAL-") &&
    !issue.issueKey.includes("-NEW-");

  /* Register the row element as a pdnd drop target. SIBLING-ONLY: canDrop
     rejects a source whose parent differs (cross-parent drops are not allowed
     — Jira timeline reorders within a parent only). Draws the blue insert
     line on the closest edge via a body portal (row has overflow:hidden). */
  useEffect(() => {
    const el = rowRef.current;
    if (!el || !canDragRow) return;
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) =>
        source.data.rowId !== issue.issueKey &&
        source.data.parentKey === (issue.parentKey ?? null),
      getData: ({ input, element }) =>
        attachClosestEdge(
          { rowId: issue.issueKey },
          { input, element, allowedEdges: ["top", "bottom"] },
        ),
      onDrag: ({ self }) => {
        setDropEdge(extractClosestEdge(self.data));
        setDropRect(el.getBoundingClientRect());
      },
      onDragLeave: () => setDropEdge(null),
      onDrop: () => setDropEdge(null),
    });
  }, [canDragRow, issue.issueKey, issue.parentKey]);
  const [editDatesOpen, setEditDatesOpen] = useState(false);
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [inlineCreateType, setInlineCreateType] = useState<string | null>("Story");
  const [inlineCreateSummary, setInlineCreateSummary] = useState("");
  const [inlineCreateSibling, setInlineCreateSibling] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const inlineCardRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const inlineCreateInputRef = useRef<HTMLInputElement>(null);
  const inlineWrapRef = useRef<HTMLDivElement>(null);
  const [inlineCardPos, setInlineCardPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const typePickerRef = useRef<HTMLButtonElement>(null);
  const [dividerHover, setDividerHover] = useState(false);
  const dividerTimer = useRef<number | null>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const [dividerRect, setDividerRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const openInlineFromDivider = () => {
    if (dividerTimer.current) { clearTimeout(dividerTimer.current); dividerTimer.current = null; }
    setDividerHover(false);
    setInlineCreateSibling(true);
    setInlineCreateType(
      depth === 0 ? topLevelType : childTypesOverride?.[0] ?? null
    );
    setInlineCreateOpen(true);
  };
  const navigate = useNavigate();
  const [moveOpen, setMoveOpen] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [parentCandidates, setParentCandidates] = useState<TimelineIssue[]>([]);
  const [depsOpen, setDepsOpen] = useState(false);
  const [depsLinkType, setDepsLinkType] = useState<string>("blocks");
  const [depsIssueKey, setDepsIssueKey] = useState("");
  const [depsSaving, setDepsSaving] = useState(false);
  const [existingLinks, setExistingLinks] = useState<any[]>([]);

  /* Group rows lock the inline-create type picker to the group's own type so
     a new BR inherits its bucket. */
  const childTypes = issue.isGroup
    ? [issue.issueType]
    : childTypesOverride ??
      (issue.issueType === "Epic"
        ? ["Story", "Feature", "Task"]
        : issue.issueType === "Feature"
        ? ["Story", "Task"]
        : issue.issueType === "Story"
        ? ["Sub-task", "Task"]
        : ["Sub-task"]);

  /* Layered rules for showing "+" on a row:
     - `childrenOnlyOnTopLevel` (product hub timeline) — only depth 0 rows
       can have children. Nested subtasks lose their "+".
     - `childrenOnlyOnGroupRows` (legacy group-bucket mode) — only
       `issue.isGroup` rows are allowed.
     - Default — a `childTypesOverride` from the hub is the authoritative
       "yes" signal; otherwise the Jira-specific exclusion list applies. */
  const canHaveChildren = childrenOnlyOnTopLevel
    ? depth === 0
    : childrenOnlyOnGroupRows
    ? !!issue.isGroup
    : !!childTypesOverride ||
      (!issue.isGroup &&
        !["Sub-task", "Backend", "Frontend", "Integration", "Idea"].includes(
          issue.issueType ?? ""
        ));

  /* Epic progress — share of all descendant work items in the Done category. */
  const epicDesc =
    !issue.isGroup && depth === 0 ? flattenAll(issue.children) : [];
  const epicTotal = epicDesc.length;
  const epicDone = epicDesc.filter((c) => c.statusCategory === "done").length;
  const epicPct = epicTotal ? Math.round((epicDone / epicTotal) * 100) : 0;

  useEffect(() => {
    if (inlineCreateOpen && inlineCreateInputRef.current)
      inlineCreateInputRef.current.focus();
  }, [inlineCreateOpen]);

  useEffect(() => {
    onInlineCreateChange?.(issue.issueKey, inlineCreateOpen);
  }, [inlineCreateOpen, issue.issueKey, onInlineCreateChange]);

  /* Only one inline-create open at a time — close this row's when another opens. */
  useEffect(() => {
    if (inlineCreateOpen && activeInlineCreateKey && activeInlineCreateKey !== issue.issueKey) {
      setInlineCreateOpen(false);
      setInlineCreateSummary("");
      setShowTypeDropdown(false);
    }
  }, [activeInlineCreateKey, inlineCreateOpen, issue.issueKey]);

  /* Escape closes the inline-create even if focus isn't on the input. */
  useEffect(() => {
    if (!inlineCreateOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setInlineCreateOpen(false);
        setInlineCreateSummary("");
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [inlineCreateOpen]);

  /* Click anywhere outside the inline-create card closes it. */
  useEffect(() => {
    if (!inlineCreateOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (inlineCardRef.current?.contains(t)) return;
      // ignore clicks on the portaled type dropdown
      if (t.closest?.('[role="option"],[role="listbox"],[role="menu"]')) return;
      setInlineCreateOpen(false);
      setInlineCreateSummary("");
      setShowTypeDropdown(false);
      setInlineCreateSibling(false);
    };
    const id = window.setTimeout(
      () => document.addEventListener("mousedown", onDown, true),
      0
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [inlineCreateOpen]);

  /* The inline-create card is portaled to document.body so it escapes the
     sidebar's overflow:hidden and can spill rightward into the calendar.
     We track the placeholder strip's rect and re-anchor on scroll/resize. */
  useEffect(() => {
    if (!inlineCreateOpen) {
      setInlineCardPos(null);
      return;
    }
    const update = () => {
      const el = inlineWrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setInlineCardPos({
        top: r.top - 1,
        left: r.left,
        width: Math.max(r.width + 320, 560),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [inlineCreateOpen]);

  const openEditDates = () => {
    setMenuOpen(false);
    setEditDatesOpen(true);
  };

  const handleRemoveDates = async () => {
    setMenuOpen(false);
    if (!mutations?.onRemoveDates) return;
    try {
      await mutations.onRemoveDates(issue.issueKey);
    } catch (err) {
      console.warn("remove dates failed:", err);
    }
  };

  const handleCreateChild = async () => {
    const summary = inlineCreateSummary.trim();
    if (!summary) return;
    const type = inlineCreateType;
    if (!type) return;
    // Divider insert → create a SIBLING (same parent as this row); the row's
    // own "+" → create a CHILD (under this row).
    if (inlineCreateSibling) {
      if (!issue.parentKey) {
        if (!mutations?.onCreateEpic) return;
        setInlineCreateOpen(false);
        setInlineCreateSummary("");
        try {
          await mutations.onCreateEpic(summary, "Epic");
        } catch (err) {
          console.warn("create sibling epic failed:", err);
        }
        return;
      }
      if (!mutations?.onCreateChild) return;
      setInlineCreateOpen(false);
      setInlineCreateSummary("");
      try {
        await mutations.onCreateChild(issue.parentKey, "", type, summary);
      } catch (err) {
        console.warn("create sibling failed:", err);
      }
      return;
    }
    if (!mutations?.onCreateChild) return;
    setInlineCreateOpen(false);
    setInlineCreateSummary("");
    try {
      await mutations.onCreateChild(
        issue.issueKey,
        issue.issueType,
        type,
        summary
      );
    } catch (err) {
      console.warn("create child failed:", err);
    }
  };

  const cancelInlineCreate = () => {
    setInlineCreateOpen(false);
    setInlineCreateSummary("");
    setShowTypeDropdown(false);
  };

  const handleEpicColorChange = async (hex: string) => {
    setMenuOpen(false);
    setRowHovered(false);
    if (!mutations?.onChangeEpicColor) return;
    try {
      await mutations.onChangeEpicColor(issue.issueKey, hex);
    } catch (err) {
      console.warn("color change failed:", err);
    }
  };

  const openMoveModal = () => {
    const versions = [
      ...new Set(flattenAll(allItems).flatMap((i) => i.fixVersions)),
    ]
      .filter(Boolean)
      .sort();
    setAvailableVersions(versions);
    setMenuOpen(false);
    setMoveOpen(true);
  };

  const handleMoveTo = async (versionName: string) => {
    setMoveOpen(false);
    if (!mutations?.onMoveToRelease) return;
    try {
      await mutations.onMoveToRelease(issue.issueKey, versionName);
    } catch (err) {
      console.warn("move to release failed:", err);
    }
  };

  const openParentPicker = () => {
    /* Product-jira variant: valid parents are the top-level BR rows of
       the same product (depth 0 in the tree). Default variant: classic
       Epic/Feature/Story hierarchy. */
    let candidates: TimelineIssue[];
    if (menuVariant === "product-jira") {
      candidates = allItems.filter(
        (i) => i.issueKey !== issue.issueKey && !i.isGroup
      );
    } else {
      const flat = flattenAll(allItems);
      let validParentTypes: string[];
      if (issue.issueType === "Feature") validParentTypes = ["Epic"];
      else if (
        ["Sub-task", "Backend", "Frontend", "Integration"].includes(
          issue.issueType
        )
      )
        validParentTypes = ["Story", "Task"];
      else validParentTypes = ["Epic", "Feature"];
      candidates = flat.filter(
        (i) =>
          validParentTypes.includes(i.issueType) &&
          i.issueKey !== issue.issueKey
      );
    }
    setParentCandidates(candidates);
    setParentSearch("");
    setParentPickerOpen(true);
    setMenuOpen(false);
  };

  const handleChangeParent = async (newParentKey: string) => {
    setParentPickerOpen(false);
    if (!mutations?.onChangeParent) return;
    try {
      await mutations.onChangeParent(issue.issueKey, newParentKey);
    } catch (err) {
      console.warn("change parent failed:", err);
    }
  };

  const openDepsModal = async () => {
    setDepsIssueKey("");
    setDepsLinkType("blocks");
    setExistingLinks([]);
    setDepsOpen(true);
    setMenuOpen(false);
    if (mutations?.fetchIssueRawJson) {
      try {
        const raw = await mutations.fetchIssueRawJson(issue.issueKey);
        setExistingLinks(raw?.fields?.issuelinks ?? []);
      } catch (_) {}
    }
  };

  const handleAddDependency = async () => {
    if (!depsIssueKey.trim()) return;
    if (!mutations?.onAddDependency) return;
    setDepsSaving(true);
    try {
      await mutations.onAddDependency(
        issue.issueKey,
        depsLinkType,
        depsIssueKey.trim().toUpperCase()
      );
      if (mutations.fetchIssueRawJson) {
        const raw = await mutations.fetchIssueRawJson(issue.issueKey);
        setExistingLinks(raw?.fields?.issuelinks ?? []);
      }
      setDepsIssueKey("");
    } catch (err) {
      console.warn("add dep failed:", err);
    } finally {
      setDepsSaving(false);
    }
  };

  const handleRemoveDependency = async (index: number) => {
    if (!mutations?.onRemoveDependency) return;
    try {
      await mutations.onRemoveDependency(issue.issueKey, index);
      if (mutations.fetchIssueRawJson) {
        const raw = await mutations.fetchIssueRawJson(issue.issueKey);
        setExistingLinks(raw?.fields?.issuelinks ?? []);
      }
    } catch (err) {
      console.warn("remove dep failed:", err);
    }
  };

  const showCreateChildInMenu = !!mutations?.onCreateChild && canHaveChildren;
  const showAddChildButton =
    enableInlineCreate && !!mutations?.onCreateChild && canHaveChildren;
  const showEditDatesInMenu = !!mutations?.onUpdateDates;
  const showRemoveDatesInMenu =
    !!mutations?.onRemoveDates && (issue.startDate || issue.dueDate);
  const showMoveToReleaseInMenu = !!mutations?.onMoveToRelease;
  const showChangeParentInMenu =
    !!mutations?.onChangeParent && issue.issueType !== "Epic";
  const showDepsInMenu = !!mutations?.onAddDependency;
  const showEpicColorInMenu =
    !!mutations?.onChangeEpicColor && issue.issueType === "Epic";

  /* jira-variant gates — generic across product + project hubs:
     - Create child: any row that canHaveChildren (Epic / Story / Feature
       / Task / BR at depth 0). Sub-task family stays false.
     - Change parent: any row with a parent (depth > 0).
     - Change colour: the colorable parent — Epic in project hub, the
       top-level BR in product hub (childrenOnlyOnTopLevel signal).
     - Move: when more than one sibling exists.
     - Edit dates / Remove dates / Edit deps: mutation existence gates. */
  const isJiraVariant = menuVariant === "jira";
  const jiraIsColorableParent =
    isJiraVariant &&
    (issue.issueType === "Epic" || (childrenOnlyOnTopLevel && depth === 0));
  const jiraShowCreateChild =
    isJiraVariant && canHaveChildren && !!mutations?.onCreateChild;
  const jiraShowMove =
    isJiraVariant && !!mutations?.onReorderSibling && siblings.length > 1;
  const jiraShowChangeParent =
    isJiraVariant && depth > 0 && !!mutations?.onChangeParent;
  const jiraShowChangeColor =
    jiraIsColorableParent && !!mutations?.onChangeEpicColor;
  const jiraShowEditDates = isJiraVariant && !!mutations?.onUpdateDates;
  const jiraShowRemoveDates =
    isJiraVariant &&
    !!(
      mutations?.onRemoveDates ||
      mutations?.onRemoveStartDate ||
      mutations?.onRemoveDueDate
    ) &&
    (!!issue.startDate || !!issue.dueDate);
  const jiraShowDeps = isJiraVariant && !!mutations?.onAddDependency;

  /* The Jira variant always shows the ⋯ menu — the menu itself renders
     every Jira-parity row and disables non-applicable ones. Default
     variant hides the button when nothing inside would be available. */
  const anyMenuActionAvailable = isJiraVariant
    ? true
    : showCreateChildInMenu ||
      showEditDatesInMenu ||
      showRemoveDatesInMenu ||
      showMoveToReleaseInMenu ||
      showChangeParentInMenu ||
      showDepsInMenu ||
      showEpicColorInMenu;
  const renderMenu = enableMenu && anyMenuActionAvailable && !issue.isGroup;

  return (
    <>
      <div
        role="rowheader"
        data-row-key={issue.issueKey}
        ref={rowRef}
        style={{
          height: ROW_H,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          paddingRight: 4,
          gap: 4,
          borderBottom: hideRowBorder
            ? "none"
            : "1px solid var(--ds-border)",
          overflow: "hidden",
          cursor: "pointer",
          /* Source-of-drag row: solid blue selected bg at FULL opacity — Jira
             highlights, never fades the row being dragged (img #55). */
          background: isSelected || isDragging
            ? "var(--ds-background-selected)"
            : (onSharedHover ? sharedHoveredKey === issue.issueKey : rowHovered)
            ? "var(--cat-dep-row-hover)"
            : tinted
            ? "var(--cat-dep-row-bg)"
            : "transparent",
          opacity: 1,
          transition: "background 80ms ease",
          position: "relative",
        }}
        onClick={(e) => {
          /* React portals propagate events through the React tree, NOT the
           DOM tree. The three-dots menu portal, the Edit Dates modal
           (and its backdrop), the parent-picker modal, the deps modal
           and any nested calendar portal all live in document.body but
           bubble up here as React children. The reliable check is
           whether the actual DOM target sits inside this row — if not,
           it came from a portal and should not trigger navigation. */
          if (!e.currentTarget.contains(e.target as Node)) return;
          /* Group header rows aren't routable; clicking the row toggles
           collapse instead of opening a non-existent detail view. */
          if (issue.isGroup) {
            if (hasChildren) onToggle(issue.issueKey);
            return;
          }
          navigate(buildIssueDetailRoute(issue.issueKey));
        }}
        aria-expanded={hasChildren ? !collapsed : undefined}
        onMouseEnter={(e) => {
          setRowHovered(true);
          if (canDragRow) setGripRect(e.currentTarget.getBoundingClientRect());
          onSharedHover?.(issue.issueKey);
        }}
        onMouseLeave={() => {
          /* Keep hover/grip alive while THIS row is being dragged — the pointer
             leaves the source row the moment the drag starts moving. */
          if (!menuOpen && !isDragging) setRowHovered(false);
          if (!isDragging) setGripRect(null);
          onSharedHover?.(null);
        }}
      >
        {/* Drag-handle grip (portaled — sidebar clips its left edge) + the
            blue insert line while a drag hovers this row. Both escape the
            row's overflow:hidden via body portals. The grip stays mounted for
            the whole drag (rowHovered || isDragging) so the drag never aborts. */}
        {canDragRow && (rowHovered || isDragging) && gripRect && (
          <RowDragGrip issue={issue} rect={gripRect} onDragStateChange={handleDragState} />
        )}
        {canDragRow && dropEdge && dropRect && createPortal(
          <div aria-hidden style={{ pointerEvents: "none" }}>
            {/* Full-width blue insert line + hollow circle node on its left
                end — exact Jira drop indicator (img #55). */}
            <div
              style={{
                position: "fixed",
                left: dropRect.left,
                width: dropRect.width,
                top: dropEdge === "top" ? dropRect.top - 1 : dropRect.bottom - 1,
                height: 2,
                background: "var(--ds-border-brand)",
                zIndex: 9999,
                borderRadius: 1,
              }}
            />
            <div
              style={{
                position: "fixed",
                left: dropRect.left - 3,
                top: (dropEdge === "top" ? dropRect.top - 1 : dropRect.bottom - 1) - 3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--ds-surface)",
                border: "2px solid var(--ds-border-brand)",
                boxSizing: "border-box",
                zIndex: 9999,
              }}
            />
          </div>,
          document.body,
        )}

        {/* Orange left rail — marks the located row AND its ancestor rows
          (Vikram 2026-06-25). No parent → only the located row carries it. */}
        {(isLocated || isLocatedAncestor) && (
          <div
            aria-hidden
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "var(--cat-locate-bar)" }}
          />
        )}

        {/* row checkbox — group rows aren't selectable */}
        {enableCheckbox && !issue.isGroup && (
          <div
            style={{
              width: 16,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              aria-label={`Select ${issue.issueKey}`}
              checked={isSelected}
              onChange={() => onSelect(issue.issueKey)}
              style={{
                width: 14,
                height: 14,
                cursor: "pointer",
                accentColor: "var(--ds-background-selected-bold)",
                margin: 0,
              }}
            />
          </div>
        )}
        {/* Spacer to keep BR rows aligned when the group row above takes the
          checkbox slot back. Mirrors the 16px width + flex layout. */}
        {enableCheckbox && issue.isGroup && (
          <div style={{ width: 16, flexShrink: 0 }} aria-hidden />
        )}

        {/* collapse toggle — when this row is an ancestor of the located work
          item, the chevron sits in a light-purple rounded square (Vikram
          2026-06-25 locate-in-timeline). */}
        <div
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isLocatedAncestor
              ? "var(--ds-text)"
              : "var(--ds-text-subtle)",
            background: isLocatedAncestor
              ? "var(--cat-locate-accent-subtle)"
              : "transparent",
            borderRadius: isLocatedAncestor ? 4 : 0,
            marginLeft: depth * 28,
          }}
          onClick={
            hasChildren
              ? (e) => {
                  e.stopPropagation();
                  onToggle(issue.issueKey);
                }
              : undefined
          }
          aria-label={
            hasChildren
              ? collapsed
                ? `Expand ${issue.issueKey}`
                : `Collapse ${issue.issueKey}`
              : undefined
          }
        >
          {hasChildren && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {collapsed ? (
                <path d="M9 6l6 6-6 6" />
              ) : (
                <path d="M6 9l6 6 6-6" />
              )}
            </svg>
          )}
        </div>

        {/* text block */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          {/* type icon — sits inline with the key so it stays aligned with the
              title even when the epic progress bar adds a second line. */}
          {!issue.isGroup && (
            <div style={{ flexShrink: 0 }}>
              <JiraIssueTypeIcon type={issue.issueType} size={14} />
            </div>
          )}
          {issue.isGroup ? (
            /* Group rows show a bold label + child count, no key. */
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: 600,
                  color: "var(--ds-text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                  fontFamily: "var(--ds-font-family-body)",
                }}
              >
                {issue.summary}
              </span>
              <span
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: "var(--ds-text-subtlest)",
                  fontFamily: "var(--ds-font-family-body)",
                  flexShrink: 0,
                }}
              >
                {`– ${issue.children.length} work item${
                  issue.children.length === 1 ? "" : "s"
                }`}
              </span>
            </div>
          ) : (
            <>
              {/* Temp keys are the client-generated placeholder used by every
                Catalyst-created row (SubtasksPanelV2 + this timeline). They
                never get replaced by a webhook because there's no Jira
                sync. We hide them so the row reads cleanly as icon +
                summary until a real key arrives. */}
              {issue.issueKey.includes("-LOCAL-") ||
              issue.issueKey.includes("-NEW-") ? null : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(buildIssueDetailRoute(issue.issueKey));
                  }}
                  style={{
                    fontSize: 'var(--ds-font-size-400)',
                    fontWeight: 400,
                    color: "var(--ds-link)",
                    textDecoration: "underline",
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "var(--ds-font-family-body)",
                    flexShrink: 0,
                  }}
                  aria-label={`Open ${issue.issueKey} in full page`}
                >
                  {issue.issueKey}
                </button>
              )}
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <span
                  style={{
                    fontSize: 'var(--ds-font-size-400)',
                    fontWeight: isLocated ? 500 : 400,
                    color: isLocated
                      ? "var(--ds-text-inverse)"
                      : "var(--ds-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.3,
                    display: isLocated ? "inline-block" : "block",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    fontFamily: "var(--ds-font-family-body)",
                    ...(isLocated
                      ? {
                          background:
                            "var(--cat-locate-accent)",
                          padding: "0px 6px",
                          borderRadius: 3,
                        }
                      : null),
                  }}
                >
                  {issue.summary}
                </span>
              </div>
            </>
          )}
          </div>
          {!issue.isGroup && depth === 0 && epicTotal > 0 && (
            <div
              title={`${epicDone}/${epicTotal} done`}
              style={{
                width: 200,
                maxWidth: "100%",
                height: 4,
                borderRadius: 2,
                background: "var(--ds-background-neutral)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${epicPct}%`,
                  height: "100%",
                  background: "var(--ds-background-success-bold)",
                }}
              />
            </div>
          )}
        </div>

        {/* status pill — child rows only */}
        {depth > 0 && issue.status && (
          <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <StatusLozenge status={issue.statusCategory ?? ''} label={issue.status} />
          </div>
        )}

        {/* assignee avatar — child rows only */}
        {depth > 0 && issue.assigneeDisplayName && (
          <Tooltip content={issue.assigneeDisplayName} position="left">
            <span style={{ flexShrink: 0, lineHeight: 0 }}>
              <Avatar
                size="xsmall"
                src={resolveAvatarUrl(issue.assigneeDisplayName) ?? undefined}
                name={issue.assigneeDisplayName}
              />
            </span>
          </Tooltip>
        )}

        {/* date range "Jan 4 → May 26" — shows on every row (Epic / parent
          included) whenever start or due is set */}
        {(issue.startDate || issue.dueDate) && (
          <span
            style={{
              fontSize: 'var(--ds-font-size-100)',
              color: "var(--ds-text-subtle)",
              fontFamily: "var(--ds-font-family-body)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {[issue.startDate, issue.dueDate]
              .filter(Boolean)
              .map((d) => formatDateCompact(d))
              .join(" → ")}
          </span>
        )}

        {/* + add child */}
        {showAddChildButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setInlineCreateSibling(false);
              setInlineCreateOpen((v) => !v);
              if (!inlineCreateOpen) setInlineCreateType(childTypes[0]);
            }}
            aria-label={`Add child issue to ${issue.issueKey}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "var(--ds-background-neutral-subtle-hovered)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              ...iconBtnStyle,
              height: 28,
              borderRadius: 4,
              width: rowHovered || inlineCreateOpen ? 28 : 0,
              overflow: "hidden",
              opacity: rowHovered || inlineCreateOpen ? 1 : 0,
              padding: 0,
              transition: "width 80ms ease, opacity 80ms ease",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* open-in-side-panel button — group rows have no detail view */}
        {!issue.isGroup && (
          <button
            type="button"
            aria-label={`Open ${issue.issueKey} in side panel`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(issue);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "var(--ds-background-neutral-subtle-hovered)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              ...iconBtnStyle,
              height: 28,
              borderRadius: 4,
              width: rowHovered ? 28 : 0,
              overflow: "hidden",
              opacity: rowHovered ? 1 : 0,
              padding: 0,
              transition: "width 80ms ease, opacity 80ms ease",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="17.5" y1="8" x2="19" y2="8" />
              <line x1="17.5" y1="12" x2="19" y2="12" />
              <line x1="17.5" y1="16" x2="19" y2="16" />
            </svg>
          </button>
        )}

        {/* ⋯ more actions */}
        {renderMenu && (
          <button
            ref={menuBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label={`More actions for ${issue.issueKey}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "var(--ds-background-neutral-subtle-hovered)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              ...iconBtnStyle,
              height: 28,
              borderRadius: 4,
              width: rowHovered || menuOpen ? 28 : 0,
              overflow: "hidden",
              opacity: rowHovered || menuOpen ? 1 : 0,
              padding: 0,
              transition: "width 80ms ease, opacity 80ms ease",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        )}

        {renderMenu && isJiraVariant && (
          <ProductTimelineRowMenu
            isOpen={menuOpen}
            onClose={() => {
              setMenuOpen(false);
              setRowHovered(false);
            }}
            triggerRef={menuBtnRef}
            issue={issue}
            siblings={siblings}
            isParent={jiraIsColorableParent}
            hasStartDate={!!issue.startDate}
            hasDueDate={!!issue.dueDate}
            parentCandidates={allItems.filter(
              (i) => i.issueKey !== issue.issueKey && !i.isGroup
            )}
            onOpenCreateChild={() => {
              setInlineCreateSibling(false);
              setInlineCreateType(childTypes[0]);
              setInlineCreateOpen(true);
            }}
            onOpenEditDates={openEditDates}
            onOpenEditDependencies={openDepsModal}
            onReorderSibling={
              mutations?.onReorderSibling
                ? (direction) =>
                    mutations.onReorderSibling!(issue.issueKey, direction)
                : undefined
            }
            onChangeColor={
              mutations?.onChangeEpicColor
                ? (hex) => mutations.onChangeEpicColor!(issue.issueKey, hex)
                : undefined
            }
            onChangeParent={
              mutations?.onChangeParent
                ? (newKey) => mutations.onChangeParent!(issue.issueKey, newKey)
                : undefined
            }
            onRemoveStartDate={
              mutations?.onRemoveStartDate
                ? () => mutations.onRemoveStartDate!(issue.issueKey)
                : mutations?.onUpdateDates
                ? () =>
                    mutations.onUpdateDates!(
                      issue.issueKey,
                      null,
                      issue.dueDate
                    )
                : undefined
            }
            onRemoveDueDate={
              mutations?.onRemoveDueDate
                ? () => mutations.onRemoveDueDate!(issue.issueKey)
                : mutations?.onUpdateDates
                ? () =>
                    mutations.onUpdateDates!(
                      issue.issueKey,
                      issue.startDate,
                      null
                    )
                : undefined
            }
            onRemoveAllDates={
              mutations?.onRemoveDates
                ? () => mutations.onRemoveDates!(issue.issueKey)
                : undefined
            }
            showCreateChild={jiraShowCreateChild}
            showChangeParent={jiraShowChangeParent}
            showChangeColor={jiraShowChangeColor}
            showMove={jiraShowMove}
            showEditDates={jiraShowEditDates}
            showRemoveDates={jiraShowRemoveDates}
            showEditDependencies={jiraShowDeps}
          />
        )}

        {renderMenu && !isJiraVariant && (
          <PortalMenu
            isOpen={menuOpen}
            onClose={() => {
              setMenuOpen(false);
              setRowHovered(false);
            }}
            triggerRef={menuBtnRef}
            minWidth={220}
            alignRight
          >
            {showCreateChildInMenu && (
              <MenuItemRow
                label={
                  issue.issueType === "Epic"
                    ? "Create issue in epic"
                    : "Create child issue"
                }
                onClick={() => {
                  setMenuOpen(false);
                  setInlineCreateSibling(false);
                  setInlineCreateType(childTypes[0]);
                  setInlineCreateOpen(true);
                }}
              />
            )}
            {showEpicColorInMenu && (
              <>
                <div
                  style={{
                    height: 1,
                    background: "var(--ds-border)",
                    margin: "4px 0",
                  }}
                />
                <div
                  style={{
                    padding: "4px 12px 2px",
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 600,
                    color: "var(--ds-text-subtlest)",
                    fontFamily: "var(--ds-font-family-body)",
                  }}
                >
                  Epic color
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    padding: "4px 12px 8px",
                  }}
                >
                  {JIRA_EPIC_COLORS.map(({ label, hex }) => (
                    <button
                      key={hex}
                      type="button"
                      title={label}
                      aria-label={`Set epic color to ${label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEpicColorChange(hex);
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        padding: 0,
                        cursor: "pointer",
                        flexShrink: 0,
                        background: hex,
                        outline: "none",
                        border:
                          issue.epicColor === hex
                            ? "2px solid var(--ds-border-selected)"
                            : "2px solid transparent",
                        boxShadow:
                          issue.epicColor === hex
                            ? "0 0 0 1.5px var(--ds-surface) inset"
                            : "none",
                      }}
                    />
                  ))}
                  {issue.epicColor && (
                    <button
                      type="button"
                      title="Remove color"
                      aria-label="Remove epic color"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEpicColorChange("");
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "1.5px dashed var(--ds-border)",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ds-text-subtlest)",
                        fontSize: 'var(--ds-font-size-200)',
                        fontWeight: 600,
                        outline: "none",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
            {(showMoveToReleaseInMenu ||
              showChangeParentInMenu ||
              showDepsInMenu) && (
              <div
                style={{
                  height: 1,
                  background: "var(--ds-border)",
                  margin: "4px 0",
                }}
              />
            )}
            {showMoveToReleaseInMenu && (
              <MenuItemRow label="Move to release" onClick={openMoveModal} />
            )}
            {showChangeParentInMenu && (
              <MenuItemRow label="Change parent" onClick={openParentPicker} />
            )}
            {showDepsInMenu && (
              <MenuItemRow label="Edit dependencies" onClick={openDepsModal} />
            )}
            {(showEditDatesInMenu || showRemoveDatesInMenu) && (
              <div
                style={{
                  height: 1,
                  background: "var(--ds-border)",
                  margin: "4px 0",
                }}
              />
            )}
            {showEditDatesInMenu && (
              <MenuItemRow label="Edit dates" onClick={openEditDates} />
            )}
            {showRemoveDatesInMenu && (
              <MenuItemRow
                label="Remove dates"
                onClick={handleRemoveDates}
                danger
              />
            )}
          </PortalMenu>
        )}

        {editDatesOpen && mutations?.onUpdateDates && !isJiraVariant && (
          <EditDatesModal
            issue={issue}
            onClose={() => setEditDatesOpen(false)}
            onSave={(start, due) =>
              mutations.onUpdateDates!(issue.issueKey, start, due)
            }
          />
        )}
        {editDatesOpen && mutations?.onUpdateDates && isJiraVariant && (
          <ProductEditDatesModal
            issue={issue}
            onClose={() => setEditDatesOpen(false)}
            onSave={(start, due) =>
              mutations.onUpdateDates!(issue.issueKey, start, due)
            }
          />
        )}

        {/* Move to release modal */}
        <ModalTransition>
          {moveOpen && (
            <Modal onClose={() => setMoveOpen(false)} width="small">
              <ModalHeader>
                <ModalTitle>Move to release</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  <div
                    onClick={() => handleMoveTo("")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleMoveTo("");
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: 'var(--ds-font-size-300)',
                      color: "var(--ds-text-subtle)",
                      fontFamily: "var(--ds-font-family-body)",
                      borderRadius: 3,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--ds-background-neutral-subtle-hovered)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    No release
                  </div>
                  {availableVersions.length === 0 && (
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: 'var(--ds-font-size-300)',
                        color: "var(--ds-text-subtlest)",
                        fontStyle: "italic",
                        fontFamily: "var(--ds-font-family-body)",
                      }}
                    >
                      No releases found for this project
                    </div>
                  )}
                  {availableVersions.map((v) => (
                    <div
                      key={v}
                      onClick={() => handleMoveTo(v)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleMoveTo(v);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: 'var(--ds-font-size-300)',
                        color: "var(--ds-text)",
                        fontFamily: "var(--ds-font-family-body)",
                        borderRadius: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--ds-background-neutral-subtle-hovered)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <span style={{ flex: 1 }}>{v}</span>
                      {issue.fixVersions.includes(v) && (
                        <span
                          style={{
                            fontSize: 'var(--ds-font-size-100)',
                            color: "var(--ds-text-subtlest)",
                            fontFamily: "var(--ds-font-family-body)",
                          }}
                        >
                          current
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setMoveOpen(false)}>
                  Cancel
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>

        {/* Change parent modal */}
        <ModalTransition>
          {parentPickerOpen && (
            <Modal onClose={() => setParentPickerOpen(false)} width="small">
              <ModalHeader>
                <ModalTitle>Change parent</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <div style={{ marginBottom: 12 }}>
                  <input
                    autoFocus
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Search by key or summary…"
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      boxSizing: "border-box",
                      border: "1px solid var(--ds-border-input)",
                      borderRadius: 3,
                      fontSize: 'var(--ds-font-size-300)',
                      outline: "none",
                      fontFamily: "var(--ds-font-family-body)",
                      color: "var(--ds-text)",
                      background: "var(--ds-background-input)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--ds-border-focused)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--ds-border-input)";
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                    maxHeight: 260,
                    overflowY: "auto",
                  }}
                >
                  {parentCandidates
                    .filter(
                      (c) =>
                        !parentSearch ||
                        c.issueKey
                          .toLowerCase()
                          .includes(parentSearch.toLowerCase()) ||
                        c.summary
                          .toLowerCase()
                          .includes(parentSearch.toLowerCase())
                    )
                    .slice(0, 50)
                    .map((c) => (
                      <div
                        key={c.issueKey}
                        onClick={() => handleChangeParent(c.issueKey)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleChangeParent(c.issueKey);
                        }}
                        style={{
                          padding: "8px 10px",
                          cursor: "pointer",
                          borderRadius: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--ds-background-neutral-subtle-hovered)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <JiraIssueTypeIcon type={c.issueType} size={14} />
                        <span
                          style={{
                            fontSize: 'var(--ds-font-size-100)',
                            color: "var(--ds-text-subtlest)",
                            fontFamily: "var(--ds-font-family-body)",
                            flexShrink: 0,
                          }}
                        >
                          {c.issueKey}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--ds-font-size-300)',
                            color: "var(--ds-text)",
                            fontFamily: "var(--ds-font-family-body)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.summary}
                        </span>
                      </div>
                    ))}
                  {parentCandidates.filter(
                    (c) =>
                      !parentSearch ||
                      c.issueKey
                        .toLowerCase()
                        .includes(parentSearch.toLowerCase()) ||
                      c.summary
                        .toLowerCase()
                        .includes(parentSearch.toLowerCase())
                  ).length === 0 && (
                    <div
                      style={{
                        padding: "12px",
                        fontSize: 'var(--ds-font-size-300)',
                        color: "var(--ds-text-subtlest)",
                        fontStyle: "italic",
                        fontFamily: "var(--ds-font-family-body)",
                        textAlign: "center",
                      }}
                    >
                      No matching issues found
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  appearance="subtle"
                  onClick={() => setParentPickerOpen(false)}
                >
                  Cancel
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>

        {/* Edit dependencies modal */}
        <ModalTransition>
          {depsOpen && (
            <Modal onClose={() => setDepsOpen(false)} width="medium">
              <ModalHeader>
                <ModalTitle>Edit dependencies</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    background: "var(--ds-background-neutral-subtle)",
                    borderRadius: 3,
                  }}
                >
                  <JiraIssueTypeIcon type={issue.issueType} size={13} />
                  <span
                    style={{
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: 500,
                      color: "var(--ds-text-subtle)",
                      fontFamily: "var(--ds-font-family-body)",
                    }}
                  >
                    {issue.issueKey}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--ds-font-size-200)',
                      color: "var(--ds-text-subtlest)",
                      fontFamily: "var(--ds-font-family-body)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {issue.summary}
                  </span>
                </div>

                {existingLinks.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 'var(--ds-font-size-200)',
                        fontWeight: 600,
                        color: "var(--ds-text-subtle)",
                        fontFamily: "var(--ds-font-family-body)",
                        marginBottom: 4,
                      }}
                    >
                      Existing dependencies
                    </div>
                    {existingLinks.map((link, idx) => {
                      const linkedKey =
                        link.outwardIssue?.key ?? link.inwardIssue?.key ?? "—";
                      const linkLabel =
                        link.type?.outward ??
                        link.type?.inward ??
                        link.type?.name ??
                        "—";
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 0",
                            borderBottom:
                              idx < existingLinks.length - 1
                                ? "1px solid var(--ds-border)"
                                : "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 'var(--ds-font-size-200)',
                              color: "var(--ds-text-subtle)",
                              fontFamily: "var(--ds-font-family-body)",
                              minWidth: 90,
                            }}
                          >
                            {linkLabel}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--ds-font-size-300)',
                              fontWeight: 500,
                              color: "var(--ds-text)",
                              fontFamily: "var(--ds-font-family-body)",
                              flex: 1,
                            }}
                          >
                            {linkedKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--ds-text-danger)",
                              fontSize: 'var(--ds-font-size-200)',
                              fontFamily: "var(--ds-font-family-body)",
                              padding: "0px 6px",
                              borderRadius: 3,
                            }}
                            title="Remove dependency"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: 600,
                    color: "var(--ds-text-subtle)",
                    fontFamily: "var(--ds-font-family-body)",
                    marginBottom: 8,
                  }}
                >
                  Add dependency
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={depsLinkType}
                    onChange={(e) => setDepsLinkType(e.target.value)}
                    style={{
                      height: 36,
                      padding: "0 8px",
                      border: "1px solid var(--ds-border-input)",
                      borderRadius: 3,
                      fontSize: 'var(--ds-font-size-300)',
                      fontFamily: "var(--ds-font-family-body)",
                      color: "var(--ds-text)",
                      background: "var(--ds-background-input)",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="blocks">blocks</option>
                    <option value="is blocked by">is blocked by</option>
                    <option value="relates to">relates to</option>
                    <option value="duplicates">duplicates</option>
                  </select>
                  <input
                    value={depsIssueKey}
                    onChange={(e) => setDepsIssueKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddDependency();
                    }}
                    placeholder="Issue key (e.g. BAU-1234)"
                    style={{
                      flex: 1,
                      minWidth: 160,
                      height: 36,
                      padding: "0 10px",
                      boxSizing: "border-box",
                      border: "1px solid var(--ds-border-input)",
                      borderRadius: 3,
                      fontSize: 'var(--ds-font-size-300)',
                      fontFamily: "var(--ds-font-family-body)",
                      color: "var(--ds-text)",
                      background: "var(--ds-background-input)",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--ds-border-focused)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--ds-border-input)";
                    }}
                  />
                  <Button
                    appearance="primary"
                    onClick={handleAddDependency}
                    isDisabled={!depsIssueKey.trim() || depsSaving}
                  >
                    {depsSaving ? "Saving…" : "Add"}
                  </Button>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setDepsOpen(false)}>
                  Close
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>
      </div>

      {/* divider insert affordance — hover the row's bottom edge ~1s → blue line +
          a "+" button on the table's left border (portaled to escape the clip). */}
      {showAddChildButton && (
        <div ref={dividerRef} style={{ position: "relative", height: 0, zIndex: 6 }}>
          <div
            onMouseEnter={() => {
              dividerTimer.current = window.setTimeout(() => {
                const r = dividerRef.current?.getBoundingClientRect();
                if (r) setDividerRect({ top: r.top, left: r.left, width: r.width });
                setDividerHover(true);
              }, 1000);
            }}
            onMouseLeave={() => {
              if (dividerTimer.current) { clearTimeout(dividerTimer.current); dividerTimer.current = null; }
              setDividerHover(false);
            }}
            onClick={(e) => { e.stopPropagation(); openInlineFromDivider(); }}
            style={{ position: "absolute", left: 0, right: 0, top: -4, height: 8, cursor: "pointer" }}
          />
          {dividerHover && (
            <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: "var(--ds-border-selected)", pointerEvents: "none" }} />
          )}
        </div>
      )}
      {dividerHover && dividerRect && createPortal(
        <>
          <div
            style={{
              position: "fixed", top: dividerRect.top - 14, left: dividerRect.left - 14 - 132,
              height: 28, display: "flex", alignItems: "center", padding: "0 10px",
              background: "var(--ds-background-neutral-bold)", color: "var(--ds-text-inverse)",
              borderRadius: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, whiteSpace: "nowrap",
              fontFamily: "var(--ds-font-family-body)", zIndex: 10000, pointerEvents: "none",
            }}
          >
            Create work item
          </div>
          <button
            type="button"
            aria-label="Create work item"
            onMouseEnter={() => {
              if (dividerTimer.current) { clearTimeout(dividerTimer.current); dividerTimer.current = null; }
              setDividerHover(true);
            }}
            onMouseLeave={() => setDividerHover(false)}
            onClick={(e) => { e.stopPropagation(); openInlineFromDivider(); }}
            style={{
              position: "fixed", top: dividerRect.top - 10, left: dividerRect.left - 10,
              width: 22, height: 22, borderRadius: 4,
              background: "var(--ds-background-selected-bold)", color: "var(--ds-text-inverse)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 10001,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </>,
        document.body
      )}

      {/* inline create — Jira-style elevated container: [type box][input][Create] */}
      {inlineCreateOpen &&
        enableInlineCreate &&
        mutations?.onCreateChild &&
        (() => {
          const canCreate = inlineCreateSummary.trim().length > 0;
          /* Type options + lock — hub-agnostic (project=Epic, product=Business
             Request, incident=its own top-level type via topLevelType):
             - Sibling at top level → only the hub's top-level type (locked).
             - Sibling at child level → the hub's child types (override) or the
               project default; selectable when >1.
             - Child ("+" button) → only the top-level container picks; deeper
               rows lock. */
          const siblingChildTypes =
            childTypesOverride ?? ["Story", "Task", "QA Bug", "Feature"];
          const effTypes = inlineCreateSibling
            ? depth === 0
              ? [topLevelType]
              : siblingChildTypes
            : childTypes;
          const typeLocked = inlineCreateSibling
            ? depth === 0 || effTypes.length <= 1
            : issue.issueType !== topLevelType;
          const card = (
            <div
              ref={inlineCardRef}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--ds-surface)",
                border: "none",
                borderRadius: 6,
                boxShadow:
                  "var(--ds-shadow-overlay, 0px 4px 8px rgba(9,30,66,0.18))",
                padding: 8,
              }}
            >
              {/* type selector box */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  ref={typePickerRef}
                  disabled={typeLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeLocked) return;
                    setShowTypeDropdown((v) => !v);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    height: 36,
                    padding: "0 8px",
                    border: "1px solid var(--ds-border)",
                    borderRadius: 4,
                    background: typeLocked
                      ? "var(--ds-background-disabled)"
                      : "var(--ds-surface)",
                    cursor: typeLocked ? "not-allowed" : "pointer",
                    opacity: typeLocked ? 0.7 : 1,
                  }}
                  title={typeLocked ? "Type is fixed for this parent" : "Select type"}
                  aria-label="Select child issue type"
                  aria-haspopup="listbox"
                  aria-expanded={showTypeDropdown}
                >
                  {inlineCreateType && <JiraIssueTypeIcon type={inlineCreateType} size={16} />}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ds-text-subtle)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <PortalMenu
                  isOpen={showTypeDropdown}
                  onClose={() => setShowTypeDropdown(false)}
                  triggerRef={typePickerRef}
                  minWidth={160}
                >
                  {effTypes.map((ct) => (
                    <div
                      key={ct}
                      role="option"
                      aria-selected={ct === inlineCreateType}
                      onClick={() => {
                        setInlineCreateType(ct);
                        setShowTypeDropdown(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: 'var(--ds-font-size-300)',
                        color: "var(--ds-text)",
                        fontFamily: "var(--ds-font-family-body)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--ds-background-neutral-subtle-hovered)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <JiraIssueTypeIcon type={ct} size={14} />
                      <span>{ct}</span>
                    </div>
                  ))}
                </PortalMenu>
              </div>
              {/* input */}
              <input
                ref={inlineCreateInputRef}
                value={inlineCreateSummary}
                onChange={(e) => setInlineCreateSummary(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateChild();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelInlineCreate();
                  }
                }}
                placeholder="Describe what needs to be done…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 36,
                  padding: "0 8px",
                  border: "1px solid var(--cat-input-blur-border)",
                  borderRadius: 4,
                  fontSize: 'var(--ds-font-size-400)',
                  outline: "none",
                  background: "var(--ds-background-input)",
                  color: "var(--ds-text)",
                  fontFamily: "var(--ds-font-family-body)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--ds-border-focused)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--cat-input-blur-border)";
                }}
              />
              {/* Create — grey/disabled → blue/enabled */}
              <button
                onClick={handleCreateChild}
                disabled={!canCreate}
                title="Create (Enter)"
                aria-label="Create"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 36,
                  padding: "0 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                  flexShrink: 0,
                  fontFamily: "var(--ds-font-family-body)",
                  cursor: canCreate ? "pointer" : "not-allowed",
                  background: canCreate
                    ? "var(--ds-background-brand-bold)"
                    : "var(--ds-background-neutral)",
                  color: canCreate
                    ? "var(--ds-text-inverse)"
                    : "var(--ds-text-disabled)",
                }}
              >
                Create
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: canCreate
                      ? "var(--ds-background-brand-bold-hovered)"
                      : "var(--ds-background-neutral-subtle)",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 10 4 15 9 20" />
                    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                  </svg>
                </span>
              </button>
            </div>
          );
          return (
            <>
              {/* #dddee1 placeholder strip — keeps the inline-create row in the sidebar flow */}
              <div
                ref={inlineWrapRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  height: ROW_H,
                  background: "var(--cat-inline-create-bg)",
                }}
              />
              {/* white card portaled to body so it spills past the sidebar into the calendar */}
              {inlineCardPos &&
                createPortal(
                  <div
                    style={{
                      position: "fixed",
                      top: inlineCardPos.top,
                      left: inlineCardPos.left,
                      width: inlineCardPos.width,
                      zIndex: 9999,
                    }}
                  >
                    {card}
                  </div>,
                  document.body
                )}
            </>
          );
        })()}
    </>
  );
}
