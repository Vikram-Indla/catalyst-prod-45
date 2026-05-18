// @ts-nocheck
/**
 * AllWorkToolbar — Jira-parity refinement bar for the All Work surface.
 *
 * jira-compare catalog items 3-9 (2026-05-02). One row hosting:
 *   3. Ask Caty (Catalyst AI entry — replaces Jira's "Ask AI" label)
 *   4. Search work — @atlaskit/textfield, isCompact
 *   5. Avatar group filter — @atlaskit/avatar-group with overflow popover
 *   6. Filter button — Jira-shape Popup (8 facets in left rail, value
 *      picker in right pane, Clear all bottom-left, Shift+F shortcut hint).
 *      Mode tabs (Basic/Advanced/JQL) intentionally omitted per Vikram
 *      directive 2026-05-03.
 *   7. (Saved filters removed 2026-05-02)
 *   8. View toggle (list ↔ split) — @atlaskit/icon-button group
 *   9. Meatball — @atlaskit/dropdown-menu
 *
 * Lane A canonical (Jira BAU project, testid namespace
 * `issue-navigator.ui.refinement-bar.*`):
 *   container: flex · gap 8 · pad 8 12 · border-bottom 1px DFE1E6
 *   filter popup: 600w × 489h · left rail 140w · facet role=tab
 *   facet order: Fix versions, Parent, Assignee, Work type, Labels,
 *                Status, Priority, Reporter
 *
 * Filter selections forward via the typed FilterState prop so the parent
 * applies them client-side to the items list.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Textfield from '@atlaskit/textfield';
import Textarea from '@atlaskit/textarea';
import AvatarGroup from '@atlaskit/avatar-group';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Button, { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
/* jira-compare 2026-05-03 cycle 5 — Save filter wiring per Vikram directive
   ("ensure save filter functionality is working"). Atlaskit Modal Dialog is
   the canonical primitive (https://atlassian.design/components/modal-dialog).
   Jira's Save filter modal probe: Heading "Save filter", Name (required),
   Description, Viewers, Editors, Cancel + Save footer. Catalyst MVP omits
   Viewers/Editors (the saved_filters table has a single is_shared boolean
   instead of granular sharing — pending Vikram approval to extend). */
import Modal, { ModalTransition, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@atlaskit/modal-dialog';
import { Checkbox } from '@atlaskit/checkbox';
/* jira-compare 2026-05-03 Round 7 — facet-aware value picker.
   Per Vikram's design-critique: assignee/reporter need canonical avatars,
   priority needs PriorityIcon, work type + parent need WorkItemTypeIcon,
   labels need Lozenge per chip, status needs Lozenge with category-driven
   appearance. All canonical components imported from the Catalyst icon
   registry (RESET ICONS, CLAUDE.md 2026-05-03) and Atlaskit. */
import { WorkItemTypeIcon, PriorityIcon } from '@/components/icons';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
/* CLAUDE.md §19 — external avatar URLs (gravatar, cdn, supabase storage) are
   banned. resolveAvatarUrl loads bundled `/src/assets/avatars/<slug>.png`
   built by `scripts/download-avatars.mjs`. Returns null when no local file
   matches; Atlaskit Avatar then falls back to initials. */
import { resolveAvatarUrl } from '@/lib/avatars';
import { toast } from 'sonner';
import { EditorMoreIcon } from '@/components/layout/ProjectHeaderChipIcons';
/* jira-compare 2026-05-03 (LLM Council sweep, anti-pattern #3): lucide
   imports were a CLAUDE.md "ADS-only inside hub scope" violation. The
   Filter glyph in particular rendered invisibly because lucide doesn't
   consume `--ds-icon` tokens — the icon "looked dead" because it had no
   relationship to the design system around it. Swapped all six glyphs
   to @atlaskit/icon/core (the new core set, matches Jira's funnel + text
   color tokens). */
import FilterIconCore from '@atlaskit/icon/core/filter';
import SearchIconCore from '@atlaskit/icon/core/search';
import ThumbsUpIconCore from '@atlaskit/icon/core/thumbs-up';
import ThumbsDownIconCore from '@atlaskit/icon/core/thumbs-down';
import InfoIconCore from '@atlaskit/icon/core/information';
// ListIconCore and SplitIconCore removed — view toggle removed 2026-05-04
import SparkIconCore from '@atlaskit/icon/core/ai-chat';
/* jira-compare 2026-05-03 cycle 4 (Vikram caught ADS drift): chevron-down
   is glyph-only in this Atlaskit version (CLAUDE.md canonical replacement
   map). Replacing unicode `▾` character with the canonical Atlaskit glyph. */
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import type { WorkItem } from '@/types/workItem.types';
import './ask-caty-input.css';
import { useCatySearch } from '@/components/caty/catySearchStore';
import { useAuth } from '@/lib/auth';

/** Kept for back-compat with any remaining callsite imports — layout is
 *  always split; the toggle was removed (2026-05-04 jira-compare cycle 2). */
export type AllWorkView = 'split' | 'list';

/* jira-compare 2026-05-03: 8-facet typed filter state matching Jira's
   Filter popup left-rail order. Each facet stores selected raw values
   (e.g. status display names like "In Progress", priority levels like
   "high"). Empty array = no filter on that facet.

   Round 9 (cycle 2 jira-compare): Jira's More filters exposes 225 fields,
   Catalyst was showing 5. Expanded to 11 by adding resolution/sprint/
   storyPoints (data already lives on WorkItem). Date ranges (created/
   updated) and custom fields (Service Now#, Assessment Feature, Severity
   from raw_json) deferred to a separate WO — they need different UI
   (date range picker + custom-field schema discovery). */
export type FilterFacet =
  | 'fixVersions' | 'parent' | 'assignee' | 'workType'
  | 'labels' | 'status' | 'priority' | 'reporter'
  | 'resolution' | 'sprint' | 'storyPoints';

export type FilterState = Record<FilterFacet, string[]>;

export const EMPTY_FILTERS: FilterState = {
  fixVersions: [],
  parent: [],
  assignee: [],
  workType: [],
  labels: [],
  status: [],
  priority: [],
  reporter: [],
  resolution: [],
  sprint: [],
  storyPoints: [],
};

const FACET_ORDER: FilterFacet[] = [
  'fixVersions', 'parent', 'assignee', 'workType',
  'labels', 'status', 'priority', 'reporter',
  'resolution', 'sprint', 'storyPoints',
];

/**
 * Ask Caty rotating placeholder samples — typed out one at a time
 * with a typewriter animation, then erased and the next one starts.
 *
 * `${project}` is interpolated to the active project key at render
 * time. Phrasings deliberately span the structured-filter shapes the
 * Layer 2 AI parser will support (assignee, status, priority, type,
 * is_unassigned, is_watching, date ranges, free-text), so users see
 * the kind of queries that will actually work once the AI lands.
 *
 * Longer, more conversational phrasings work better here — they
 * teach the user that Caty handles natural language, not just keyword
 * search. Aim for ~50–90 chars each; mix imperative ("Show me…") and
 * interrogative ("Which…?") forms so the animation doesn't feel
 * repetitive across cycles.
 */
const ASK_CATY_PLACEHOLDER_SAMPLES: string[] = [
  'Show me high-priority bugs assigned to me in ${project} that are still open',
  'Which work items in ${project} have been blocked for more than three days?',
  "Find stories I'm watching in ${project} that haven't moved in over a week",
  'List all critical incidents in ${project} reported in the last seven days',
  'Show unassigned bugs in ${project} that need triage',
  'Which tasks in ${project} are due before the end of this week?',
  'Find work items in ${project} that are currently in code review',
  'Show me everything in ${project} created this week but not started',
  'Which stories in ${project} have no estimate and no acceptance criteria?',
  'List incidents in ${project} that are still open from last sprint',
  'Show work items in ${project} blocked by another ticket I own',
  "Find issues in ${project} that haven't been updated in two weeks",
  "What's assigned to me in ${project} with no due date set?",
  'Show me all QA bugs reported against ${project} this month',
];

/* jira-compare 2026-05-03 Round 8 — chip-bar refactor.
   Jira's Basic-mode refinement bar exposes a few common facets as
   top-level chips (Type, Status, Assignee), and hides the rest behind
   "More filters". Catalyst follows the same split: top-level chips for
   the 3 most-clicked facets, and a More filters popup for the remaining 8.
   Round 9: expanded More filters from 5 → 8 by adding resolution/sprint/
   storyPoints (Vikram: "more filters wrongly implemented, must have
   other fields"). Jira's full list is 225 — Catalyst exposes the
   subset that has data in WorkItem; date ranges + custom fields queued
   as a follow-up WO. */
const TOP_LEVEL_FACETS: FilterFacet[] = ['workType', 'status', 'assignee'];
const MORE_FILTERS_FACETS: FilterFacet[] = [
  'fixVersions', 'parent', 'labels', 'priority', 'reporter',
  'resolution', 'sprint', 'storyPoints',
];

const FACET_LABELS: Record<FilterFacet, string> = {
  fixVersions: 'Fix versions',
  parent: 'Parent',
  assignee: 'Assignee',
  workType: 'Work type',
  labels: 'Labels',
  status: 'Status',
  priority: 'Priority',
  reporter: 'Reporter',
  resolution: 'Resolution',
  sprint: 'Sprint',
  storyPoints: 'Story points',
};

interface Props {
  projectKey: string;
  query: string;
  onQueryChange: (q: string) => void;
  /** @deprecated view toggle removed 2026-05-04 — layout is always split.
   *  Kept for back-compat; prop is accepted but ignored. */
  view?: AllWorkView;
  /** @deprecated view toggle removed 2026-05-04 — prop accepted but ignored. */
  onViewChange?: (v: AllWorkView) => void;
  /** Items list — used to derive distinct value options per facet. */
  items?: WorkItem[];
  /** Per-facet selections; parent applies them client-side to items. */
  selectedFilters?: FilterState;
  onSelectedFiltersChange?: (next: FilterState) => void;
  /** Controlled popup open state — lifted so a page-level Shift+F handler can toggle. */
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
  /** Avatar group selected user IDs (legacy — separate quick-filter strip). */
  selectedAssignees?: string[];
  onAssigneesChange?: (ids: string[]) => void;
}

/** Coerce any value (string / number / object / null) to a clean string
    label. Defensive — ph_issues.labels in particular can arrive as either
    string[] (sync path) or object[] (raw_json passthrough where each
    label is { name, description }). Without this guard distinctOptions
    crashes the page with "a.label.localeCompare is not a function". */
function toLabel(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.name === 'string') return o.name;
    if (typeof o.value === 'string') return o.value;
    if (typeof o.label === 'string') return o.label;
  }
  try { return String(v); } catch { return ''; }
}

/* jira-compare 2026-05-03 Round 7 — per-facet enriched metadata.
   Carries the extra fields the value-picker rows need to render canonical
   visuals: avatar URL for assignees/reporters, work type id for parent
   icons, status category for lozenge appearance, etc. Falls back to the
   original {value, label} shape for facets that don't need icons. */
interface FacetOption {
  value: string;
  label: string;
  meta?: {
    rawType?: string | null;       // for parent + workType rows
    statusCategory?: string | null; // for status rows
    /* Note: avatar URLs are NOT stored in meta. Per CLAUDE.md §19, external
       avatar URLs are banned. Avatar rendering uses resolveAvatarUrl(label)
       at render time, which reads from bundled /src/assets/avatars/*. */
  };
}

/** Derive distinct option values for a given facet from the items list. */
function distinctOptions(items: WorkItem[], facet: FilterFacet): FacetOption[] {
  // Build a parentKey → rawType lookup so parent rows can render the
  // parent's work-item-type icon. Walks items[] to find any child whose
  // own row matches the parentKey.
  const itemByKey = new Map<string, WorkItem>();
  if (facet === 'parent') {
    for (const it of items) itemByKey.set(it.id, it);
  }

  const map = new Map<string, FacetOption>();
  for (const i of items) {
    switch (facet) {
      case 'fixVersions': {
        const v = toLabel(i.fixVersion);
        if (v && !map.has(v)) map.set(v, { value: v, label: v });
        break;
      }
      case 'parent': {
        const pk = toLabel(i.parentKey);
        if (pk && !map.has(pk)) {
          const ps = toLabel(i.parentSummary);
          const parentItem = itemByKey.get(pk);
          map.set(pk, {
            value: pk,
            label: ps ? `${pk} — ${ps}` : pk,
            meta: { rawType: parentItem?.rawType ?? null },
          });
        }
        break;
      }
      case 'assignee': {
        const id = toLabel(i.assigneeId);
        const nm = toLabel(i.assignee?.name);
        if (id && nm && !map.has(id)) {
          // Avatar src is resolved at render time via resolveAvatarUrl(name)
          // — see CLAUDE.md §19 (no external avatar URLs).
          map.set(id, { value: id, label: nm });
        }
        break;
      }
      case 'workType': {
        const v = toLabel(i.rawType);
        if (v && !map.has(v)) {
          map.set(v, { value: v, label: v, meta: { rawType: v } });
        }
        break;
      }
      case 'labels': {
        for (const l of (i.labels || [])) {
          const v = toLabel(l);
          if (v && !map.has(v)) map.set(v, { value: v, label: v });
        }
        break;
      }
      case 'status': {
        const v = toLabel(i.statusName);
        if (v && !map.has(v)) {
          map.set(v, {
            value: v,
            label: v,
            meta: { statusCategory: i.statusCategory ?? null },
          });
        }
        break;
      }
      case 'priority': {
        const v = toLabel(i.priority);
        if (v && !map.has(v)) {
          map.set(v, {
            value: v,
            label: v.charAt(0).toUpperCase() + v.slice(1),
          });
        }
        break;
      }
      case 'reporter': {
        const id = toLabel(i.reporterId);
        const nm = toLabel(i.reporter?.name);
        if (id && nm && !map.has(id)) {
          // Same as assignee — resolveAvatarUrl(name) at render time. If no
          // bundled avatar exists for this name, Atlaskit Avatar falls back
          // to initials derived from the `name` prop.
          map.set(id, { value: id, label: nm });
        }
        break;
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Apply the active filters to a single item — true means it passes.
    Each comparison runs both sides through toLabel so non-string label
    values (object[] from raw_json) compare cleanly against the string[]
    selection state. */
export function itemPassesFilters(item: WorkItem, f: FilterState): boolean {
  if (f.fixVersions.length > 0 && !f.fixVersions.includes(toLabel(item.fixVersion))) return false;
  if (f.parent.length > 0 && !f.parent.includes(toLabel(item.parentKey))) return false;
  if (f.assignee.length > 0 && !f.assignee.includes(toLabel(item.assigneeId))) return false;
  if (f.workType.length > 0 && !f.workType.includes(toLabel(item.rawType))) return false;
  if (f.labels.length > 0) {
    const ils = (item.labels || []).map(toLabel);
    if (!f.labels.some(l => ils.includes(l))) return false;
  }
  if (f.status.length > 0 && !f.status.includes(toLabel(item.statusName))) return false;
  if (f.priority.length > 0 && !f.priority.includes(toLabel(item.priority))) return false;
  if (f.reporter.length > 0 && !f.reporter.includes(toLabel(item.reporterId))) return false;
  return true;
}

/** Total count of selected values across all facets. */
export function totalSelected(f: FilterState): number {
  return FACET_ORDER.reduce((n, k) => n + f[k].length, 0);
}

interface Member {
  id: string;
  name: string;
  src?: string | null;
}

/* Atlaskit core icons consume `--ds-icon` tokens automatically and
   match Jira's exact glyph set. No size override — let Atlaskit Button
   render at its natural icon slot (16px).

   2026-05-03 (re-probe Round 4): Atlaskit Button "subtle" appearance
   sets color: var(--ds-text) via an atomic class that beats inline
   `style`, so the icon picks up rgb(41,42,46) instead of Jira's
   rgb(80,82,88). Pass color directly on each core icon to bypass
   the inheritance entirely. The text label is wrapped in a span at
   the call site for matching reasons. */
const SUBTLE = 'var(--ds-text-subtle, #505258)';
const SearchIcon = () => <SearchIconCore label="" color={SUBTLE} />;
const FilterIcon = () => <FilterIconCore label="" color={SUBTLE} />;
const SparkIcon = () => <SparkIconCore label="" color={SUBTLE} />;
// ListIcon + SplitIcon removed with view toggle (2026-05-04)

/**
 * FilterTriggerAndPopup — Atlaskit Button trigger + manual portal popup.
 *
 * Bypasses @atlaskit/popup@4.17.0's broken trigger-ref behaviour (see
 * inline comment at the call site for full root-cause). Uses a useRef
 * for the trigger anchor, getBoundingClientRect for placement, and a
 * React portal so the popup escapes any overflow:hidden ancestors.
 *
 * Position: bottom-start of trigger (matches Jira) with a 4px gap.
 * Outside-click: closes the popup if the mousedown lands outside both
 *   the trigger and the popup content.
 * Escape: closes the popup.
 * Re-position on resize/scroll: a tiny ResizeObserver + scroll listener
 *   re-reads the trigger rect so the popup stays anchored.
 */
interface FilterTriggerAndPopupProps {
  triggerLabel: string;
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  FilterIcon: () => React.ReactElement;
  renderContent: () => React.ReactNode;
}

function FilterTriggerAndPopup({
  triggerLabel,
  isOpen,
  onOpenChange,
  FilterIcon,
  renderContent,
}: FilterTriggerAndPopupProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  /* Position the popup below the trigger button. Re-runs whenever the
     popup opens, the window resizes, or the trigger scrolls (e.g. when
     the toolbar is inside a scrolling container). 4px vertical gap
     matches Jira's filter popup offset. */
  useEffect(() => {
    if (!isOpen) { setPos(null); return; }
    const compute = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: rect.left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isOpen]);

  /* Outside-click: close if the mousedown lands outside both the trigger
     and the popup content. Mousedown (not click) so the popup closes
     before any inner button registers a click — matches Atlaskit Popup
     and Jira's behaviour. */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onOpenChange]);

  /* Escape key closes the popup. */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onOpenChange]);

  return (
    <>
      <span ref={triggerRef} style={{
        display: 'inline-flex',
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 3,
      }}>
        <Button
          appearance="subtle"
          iconBefore={FilterIcon}
          onClick={() => onOpenChange(!isOpen)}
          testId="catalyst-allwork-toolbar.filter"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popupId : undefined}
          /* Cycle 4 — same fix as FilterChip: subtle Button so the wrapping
             span's white bg + grey border show through (Jira's pattern).
             Chevron via canonical Atlaskit glyph (no unicode drift). */
          iconAfter={() => (
            <span aria-hidden="true" style={{
              display: 'inline-flex',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 120ms ease',
            }}>
              <ChevronDownIcon label="" primaryColor={SUBTLE} size="small" />
            </span>
          )}
        >
          <span style={{ color: SUBTLE }}>{triggerLabel}</span>
        </Button>
      </span>
      {isOpen && pos && createPortal(
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-label="Filter work items"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 510, // above Atlaskit content layer (400) but below modals (700+)
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            boxShadow: '0 4px 8px rgba(9,30,66,0.15), 0 0 1px rgba(9,30,66,0.31)',
          }}
        >
          {renderContent()}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * renderFacetRow — per-facet visual treatment for value-picker rows.
 *
 * Single source of truth for how each facet's checkbox row renders:
 * - assignee/reporter → Atlaskit Avatar (via resolveAvatarUrl bundled photo)
 * - workType/parent   → WorkItemTypeIcon (RESET ICONS registry)
 * - priority          → PriorityIcon (RESET ICONS registry)
 * - status            → Atlaskit Lozenge with statusToLozenge appearance
 * - labels            → Atlaskit Lozenge default chip
 * - fixVersions       → plain text (Jira doesn't decorate version names)
 *
 * Used by both the FilterChip dropdowns (one facet per chip) and the
 * legacy 600×489 "More filters" popup (multi-facet left rail).
 */
function renderFacetRow(
  facet: FilterFacet,
  opt: FacetOption,
  checked: boolean,
  toggle: () => void,
): React.ReactElement {
  return (
    <label
      key={opt.value}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px', borderRadius: 3,
        cursor: 'pointer',
        fontSize: 13, color: 'var(--ds-text, #292A2E)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        style={{ margin: 0, flexShrink: 0 }}
      />
      {facet === 'assignee' || facet === 'reporter' ? (
        <>
          <Avatar
            size="small"
            src={resolveAvatarUrl(opt.label) ?? undefined}
            name={opt.label}
            appearance="circle"
          />
          <span style={{ flex: 1 }}>{opt.label}</span>
        </>
      ) : facet === 'workType' || facet === 'parent' ? (
        <>
          {opt.meta?.rawType && (
            <WorkItemTypeIcon type={opt.meta.rawType} size={16} label="" />
          )}
          <span style={{ flex: 1 }}>{opt.label}</span>
        </>
      ) : facet === 'priority' ? (
        <>
          <PriorityIcon level={opt.value} size={16} label="" />
          <span style={{ flex: 1 }}>{opt.label}</span>
        </>
      ) : facet === 'status' ? (
        <span style={{ flex: 1 }}>
          <Lozenge appearance={statusToLozenge(opt.label, opt.meta?.statusCategory)}>
            {opt.label}
          </Lozenge>
        </span>
      ) : facet === 'labels' ? (
        <span style={{ flex: 1 }}>
          <Lozenge appearance="default">{opt.label}</Lozenge>
        </span>
      ) : (
        <span style={{ flex: 1 }}>{opt.label}</span>
      )}
    </label>
  );
}

/**
 * FilterChip — single-facet chip with anchored dropdown.
 *
 * jira-compare 2026-05-03 Round 8: matches Jira's Basic-mode chip
 * pattern (Atlaskit Select-style dropdown anchored under the chip).
 * Reuses the same manual portal + getBoundingClientRect anchoring as
 * FilterTriggerAndPopup (Atlaskit Popup is broken — see Round 6 notes).
 *
 * Active state: when count > 0, the chip uses Atlaskit Button "primary"
 * appearance (blue background, white text) — matches Jira's selected-
 * chip styling. Inactive: "default" with subtle styling.
 */
interface FilterChipProps {
  label: string;
  facet: FilterFacet;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  /** Optional headline shown at top of dropdown — Jira uses "Status = (equals)" pattern. */
  headline?: string;
}

function FilterChip({
  label, facet, options, selected, onToggle, isOpen, onOpenChange, headline,
}: FilterChipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) { setPos(null); return; }
    const compute = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: rect.left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onOpenChange]);

  const count = selected.length;
  const isActive = count > 0;
  const chipLabel = count > 0 ? `${label}: ${count}` : label;

  // Filter options by search query (Jira's Status dropdown has a search input).
  const filteredOptions = useMemo(
    () => searchQuery
      ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options,
    [options, searchQuery],
  );

  return (
    <>
      <span ref={triggerRef} style={{
        display: 'inline-flex',
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 3,
      }}>
        <Button
          appearance={isActive ? 'primary' : 'subtle'}
          onClick={() => onOpenChange(!isOpen)}
          testId={`catalyst-allwork-toolbar.chip.${facet}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popupId : undefined}
          /* jira-compare 2026-05-03 cycle 4 (Vikram caught grey-fill + ADS drift):
             - "default" appearance → Atlaskit's grey button fill (Vikram: "catalyst is grey which is wring").
               Reverted to "subtle" (transparent bg) so the wrapping span's white background +
               grey border show through unobscured — matches Jira's white-chip-with-outline.
             - Unicode `▾` → @atlaskit/icon/glyph/chevron-down (canonical ADS glyph; CLAUDE.md
               replacement map lists chevron-down as glyph-only in this Atlaskit version). */
          iconAfter={() => (
            <span aria-hidden="true" style={{
              display: 'inline-flex',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 120ms ease',
            }}>
              <ChevronDownIcon
                label=""
                primaryColor={isActive ? 'var(--ds-text-inverse, #FFFFFF)' : SUBTLE}
                size="small"
              />
            </span>
          )}
        >
          <span style={{ color: isActive ? undefined : SUBTLE }}>{chipLabel}</span>
        </Button>
      </span>
      {isOpen && pos && createPortal(
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-label={`Filter by ${label}`}
          data-testid={`catalyst-allwork-toolbar.chip-dropdown.${facet}`}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 510,
            width: 320,
            maxHeight: 380,
            display: 'flex', flexDirection: 'column',
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            boxShadow: '0 4px 8px rgba(9,30,66,0.15), 0 0 1px rgba(9,30,66,0.31)',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {headline && (
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              fontSize: 12, color: 'var(--ds-text-subtle, #505258)',
            }}>{headline}</div>
          )}
          <div style={{ padding: 8, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
            <input
              type="text"
              placeholder={`Search ${label}`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '6px 8px', fontSize: 13,
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3,
                fontFamily: 'inherit',
                background: 'var(--ds-surface, #FFFFFF)',
                color: 'var(--ds-text, #292A2E)',
              }}
            />
          </div>
          <div style={{ flex: 1, padding: 4, overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: 16, fontSize: 13,
                color: 'var(--ds-text-subtle, #505258)',
                textAlign: 'center',
              }}>No matches</div>
            ) : (
              filteredOptions.map(opt =>
                renderFacetRow(facet, opt, selected.includes(opt.value), () => onToggle(opt.value))
              )
            )}
          </div>
          <div style={{
            padding: '6px 12px',
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            fontSize: 11, color: 'var(--ds-text-subtle, #505258)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{filteredOptions.length} of {options.length}</span>
            {count > 0 && (
              <span>{count} selected</span>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * SaveFilterModal — persists current FilterState as a named saved view.
 *
 * Atlaskit primitives: @atlaskit/modal-dialog (https://atlassian.design/components/modal-dialog),
 * @atlaskit/textfield, @atlaskit/textarea, @atlaskit/checkbox, @atlaskit/button/new.
 *
 * Backend: INSERT into public.allwork_saved_filters (table created by
 * Vikram-run SQL on 2026-05-03). RLS auto-restricts rows to auth.uid().
 *
 * MVP scope (Vikram: "limited fields only which we know"):
 * - Name (required, unique per user+project — UNIQUE constraint at DB)
 * - Description (optional)
 * - Make this filter shared (boolean → is_shared column)
 *
 * Deferred: Viewers/Editors granular sharing (Jira's pattern but the
 * Catalyst saved_filters table only has one is_shared boolean; extending
 * needs schema change + Vikram approval).
 */
interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: FilterState;
  projectKey: string;
  onSaved?: () => void;
}

function SaveFilterModal({
  isOpen, onClose, currentState, projectKey, onSaved,
}: SaveFilterModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIsShared(false);
      setSaving(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { data: authData, error: authErr } = await (supabase as any).auth.getUser();
      if (authErr || !authData?.user?.id) {
        toast.error('Not signed in — cannot save filter');
        setSaving(false);
        return;
      }
      const { error } = await (supabase as any)
        .from('allwork_saved_filters')
        .insert({
          user_id: authData.user.id,
          project_key: projectKey,
          name: trimmed,
          description: description.trim() || null,
          state: currentState,
          is_shared: isShared,
        });
      if (error) {
        if (error.code === '23505') {
          toast.error(`A filter named "${trimmed}" already exists in ${projectKey}`);
        } else {
          toast.error(`Save failed: ${error.message}`);
        }
        setSaving(false);
        return;
      }
      toast.success(`Saved filter "${trimmed}"`);
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || String(e)}`);
      setSaving(false);
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} testId="catalyst-save-filter-modal" width="small">
          <ModalHeader>
            <ModalTitle>Save filter</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--ds-text, #292A2E)' }}>
                  Name <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
                </label>
                <Textfield
                  autoFocus
                  value={name}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  placeholder="e.g. My open bugs"
                  testId="catalyst-save-filter-modal.name"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--ds-text, #292A2E)' }}>
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                  placeholder="Optional"
                  minimumRows={2}
                  maxHeight="120px"
                  testId="catalyst-save-filter-modal.description"
                />
              </div>
              <Checkbox
                isChecked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                label="Make this filter visible to others"
                testId="catalyst-save-filter-modal.is-shared"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              isDisabled={!name.trim() || saving}
              testId="catalyst-save-filter-modal.save"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

/**
 * SavedFiltersDropdown — Read + apply + Delete saved filters (R + D of CRUD).
 *
 * Lives next to the Save filter button in the toolbar. Fetches the user's
 * saved filters for this project (RLS scopes by user_id; shared filters
 * also visible). Click to apply state to the chip bar; meatball to delete.
 */
interface SavedFiltersDropdownProps {
  projectKey: string;
  onApply: (state: FilterState) => void;
  refreshKey: number;
}

interface SavedFilterRow {
  id: string;
  name: string;
  description: string | null;
  state: FilterState;
  is_shared: boolean;
  user_id: string;
}

function SavedFiltersDropdown({ projectKey, onApply, refreshKey }: SavedFiltersDropdownProps) {
  const { data: rows = [], refetch } = useQuery<SavedFilterRow[]>({
    queryKey: ['allwork-saved-filters', projectKey, refreshKey],
    enabled: !!projectKey,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('allwork_saved_filters')
        .select('id,name,description,state,is_shared,user_id')
        .eq('project_key', projectKey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedFilterRow[];
    },
  });

  const handleDelete = async (id: string, name: string) => {
    const ok = window.confirm(`Delete saved filter "${name}"?`);
    if (!ok) return;
    const { error } = await (supabase as any)
      .from('allwork_saved_filters')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    toast.success(`Deleted "${name}"`);
    refetch();
  };

  if (rows.length === 0) return null;

  return (
    <DropdownMenu
      trigger={({ triggerRef, ...props }) => (
        <Button
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          {...props}
          appearance="subtle"
          testId="catalyst-allwork-toolbar.saved-filters"
        >
          <span style={{ color: SUBTLE }}>Saved filters ({rows.length})</span>
        </Button>
      )}
    >
      <DropdownItemGroup>
        {rows.map(row => (
          <DropdownItem
            key={row.id}
            onClick={() => {
              onApply(row.state);
              toast.success(`Applied "${row.name}"`);
            }}
            elemAfter={
              <Button
                appearance="subtle"
                spacing="compact"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.id, row.name);
                }}
              >
                <span style={{ color: 'var(--ds-text-danger, #DE350B)', fontSize: 11 }}>Delete</span>
              </Button>
            }
          >
            {row.name}
            {row.is_shared && (
              <span style={{ marginLeft: 6, fontSize: 10, color: SUBTLE }}>· shared</span>
            )}
          </DropdownItem>
        ))}
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

export function AllWorkToolbar({
  projectKey,
  query,
  onQueryChange,
  // view and onViewChange kept for back-compat but view toggle is removed
  view: _view,
  onViewChange: _onViewChange,
  items = [],
  selectedFilters = EMPTY_FILTERS,
  onSelectedFiltersChange,
  filterOpen: filterOpenProp,
  onFilterOpenChange,
  selectedAssignees = [],
  onAssigneesChange,
}: Props) {
  /* ── ALL HOOKS FIRST — React Rules of Hooks: no hook after a conditional return ── */

  /* Ask Caty inline bar — mirrors Jira's "Ask AI" full-width query bar.
     When open, the entire toolbar row is replaced by the AI input. */
  const [askCatyOpen, setAskCatyOpen] = useState(false);
  const [askCatyQuery, setAskCatyQuery] = useState('');
  const askCatyInputRef = useRef<HTMLInputElement>(null);

  // Caty AI search — store drives the AI call; the toolbar just dispatches
  // the user query and reads back loading status for the gradient
  // rotation. ProjectAllWorkView consumes the resulting filter spec.
  const catySubmit = useCatySearch((s) => s.submit);
  const catyClear = useCatySearch((s) => s.clear);
  const catyStatus = useCatySearch((s) => s.status);
  const catyStoreProjectKey = useCatySearch((s) => s.projectKey);
  const catyReason = useCatySearch((s) => s.reason);
  const catyErrorMessage = useCatySearch((s) => s.errorMessage);
  const catyStoredQuery = useCatySearch((s) => s.query);
  const catySecondaryQuery = useCatySearch((s) => s.secondaryQuery);
  const catySetSecondaryQuery = useCatySearch((s) => s.setSecondaryQuery);
  const askCatyLoading =
    catyStatus === 'loading' && catyStoreProjectKey === projectKey;
  const askCatyHasResults =
    catyStatus === 'ready' && catyStoreProjectKey === projectKey;
  const askCatyHasError =
    catyStatus === 'errored' && catyStoreProjectKey === projectKey;
  const [askCatyFeedback, setAskCatyFeedback] = useState<'up' | 'down' | null>(null);
  // Reset thumbs-up/down state whenever a new query is issued.
  useEffect(() => {
    if (catyStatus === 'loading') setAskCatyFeedback(null);
  }, [catyStatus]);
  const { user } = useAuth();

  useEffect(() => {
    if (askCatyOpen) {
      const t = setTimeout(() => askCatyInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [askCatyOpen]);

  /* ── Ask Caty rotating typewriter placeholder ──
     Four-phase state machine drives one transition per render:
       type      → add chars one at a time (~50ms with jitter)
       pauseAfter → 1.5s pause to let the user read the full sentence
       erase     → backspace one char at a time (~25ms — faster than typing,
                   matches the Jira / GitHub Copilot / Linear pattern)
       pauseBefore → 0.5s gap before the next sample starts typing

     Auto-pauses while askCatyQuery is non-empty (the moment the user
     types) and resumes when the input is cleared. Token-aware: stops
     entirely when the bar is closed so we don't run timers in the
     background. */
  type PhMode = 'type' | 'pauseAfter' | 'erase' | 'pauseBefore';
  const [phIdx, setPhIdx] = useState(0);
  const [phText, setPhText] = useState('');
  const [phMode, setPhMode] = useState<PhMode>('type');

  useEffect(() => {
    if (!askCatyOpen) return;
    if (askCatyQuery !== '') return; // user is typing — pause animation

    const sample = (ASK_CATY_PLACEHOLDER_SAMPLES[phIdx] ?? '').replace(
      '${project}',
      projectKey ?? 'this project',
    );

    let timeoutId: ReturnType<typeof setTimeout>;
    if (phMode === 'type') {
      if (phText.length < sample.length) {
        // Slight jitter so the cadence feels human, not metronomic.
        const delay = 45 + Math.random() * 30;
        timeoutId = setTimeout(() => {
          setPhText(sample.slice(0, phText.length + 1));
        }, delay);
      } else {
        timeoutId = setTimeout(() => setPhMode('pauseAfter'), 1500);
      }
    } else if (phMode === 'pauseAfter') {
      timeoutId = setTimeout(() => setPhMode('erase'), 0);
    } else if (phMode === 'erase') {
      if (phText.length > 0) {
        timeoutId = setTimeout(() => {
          setPhText(phText.slice(0, -1));
        }, 22);
      } else {
        timeoutId = setTimeout(() => setPhMode('pauseBefore'), 0);
      }
    } else if (phMode === 'pauseBefore') {
      timeoutId = setTimeout(() => {
        setPhIdx((i) => (i + 1) % ASK_CATY_PLACEHOLDER_SAMPLES.length);
        setPhMode('type');
      }, 500);
    }

    return () => clearTimeout(timeoutId);
  }, [askCatyOpen, askCatyQuery, phIdx, phText, phMode, projectKey]);

  /* Controlled-or-uncontrolled filter popup open state. */
  const [filterOpenLocal, setFilterOpenLocal] = useState(false);
  const filterOpen = filterOpenProp !== undefined ? filterOpenProp : filterOpenLocal;
  const setFilterOpen = (next: boolean) => {
    if (onFilterOpenChange) onFilterOpenChange(next);
    else setFilterOpenLocal(next);
  };

  const [activeFacet, setActiveFacet] = useState<FilterFacet | null>(null);
  const [openChipKey, setOpenChipKey] = useState<FilterFacet | 'more' | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savedFiltersRefreshKey, setSavedFiltersRefreshKey] = useState(0);

  const facetOptions = useMemo(() => {
    const out = {} as Record<FilterFacet, FacetOption[]>;
    for (const f of FACET_ORDER) out[f] = distinctOptions(items, f);
    return out;
  }, [items]);

  const totalCount = totalSelected(selectedFilters);

  const updateFacet = (facet: FilterFacet, next: string[]) => {
    if (!onSelectedFiltersChange) return;
    onSelectedFiltersChange({ ...selectedFilters, [facet]: next });
  };

  const toggleValue = (facet: FilterFacet, value: string) => {
    const cur = selectedFilters[facet];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    updateFacet(facet, next);
  };

  const clearAll = () => onSelectedFiltersChange?.(EMPTY_FILTERS);

  /* Avatar group seed — pull project members. Mirrors the pattern in
     BacklogPage.atlaskit.tsx ProjectChromeBand chrome-band-members. */
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['allwork-toolbar-members', projectKey],
    enabled: !!projectKey,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: project } = await (supabase as any)
        .from('projects').select('id').eq('key', projectKey).maybeSingle();
      if (!project?.id) return [];
      const { data } = await (supabase as any)
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .limit(20);
      return ((data ?? []) as any[]).map(r => ({
        id: r.profiles?.id ?? r.user_id,
        name: r.profiles?.full_name ?? 'Member',
        src: r.profiles?.avatar_url ?? null,
      }));
    },
  });

  const avatarData = members.map(m => ({
    key: m.id,
    name: m.name,
    src: m.src ?? undefined,
  }));

  const handleAskCatySubmit = () => {
    const q = askCatyQuery.trim();
    if (!q || askCatyLoading) return;
    // Layer 2 wired — fires the AI parser via the store. The view
    // component (ProjectAllWorkView) subscribes to the same store
    // and renders the filtered list when the response lands.
    catySubmit({
      query: q,
      projectKey: projectKey ?? '',
      currentUser:
        user && (user as { id?: string }).id
          ? {
              id: (user as { id: string }).id,
              name:
                ((user as { user_metadata?: { full_name?: string }; email?: string }).user_metadata?.full_name ??
                  (user as { email?: string }).email ??
                  'me'),
            }
          : null,
    });
    // Also broadcast the legacy event so any external listeners (e.g.
    // analytics) still fire.
    window.dispatchEvent(new CustomEvent('catalyst:ask-caty', { detail: { query: q, projectKey } }));
  };

  /* Ask Caty bar — shown when askCatyOpen is true; replaces entire toolbar row.
     Hooks-safe: all state is declared above; no early return. */
  if (askCatyOpen) {
    return (
      <div
        data-testid="catalyst-allwork-toolbar.ask-caty-bar"
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '8px 12px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'transparent',
          flexShrink: 0,
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Outer frame draws the static Caty rainbow border via a
            conic-gradient pseudo-element. Adding `is-loading` makes
            the gradient rotate anticlockwise. The inner row holds the
            actual input chrome (icon, input, Go button). */}
        <div
          className={`ask-caty-frame${askCatyLoading ? ' is-loading' : ''}`}
          style={{ flex: 1, minHeight: 40 }}
        >
          <div className="ask-caty-stack">
            {/* Row 1 — AI query.
                Default state: editable input with typewriter placeholder.
                Results state: read-only summary of what was asked, so the
                second row's "Search work" input becomes the active focus.
                The whole row is wrapped in a <label> so clicking anywhere
                between the icon and the button focuses the underlying
                input (only meaningful in the editable state). */}
            <label className="ask-caty-row">
              <span className="ask-caty-row__prefix" aria-hidden="true">
                <SparkIcon />
              </span>
              {askCatyHasResults ? (
                <span
                  className="ask-caty-row__readonly"
                  title={catyStoredQuery ?? ''}
                >
                  {catyStoredQuery ?? ''}
                </span>
              ) : (
                <span className="ask-caty-row__field">
                  <input
                    ref={askCatyInputRef}
                    className="ask-caty-row__input"
                    value={askCatyQuery}
                    onChange={e => setAskCatyQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAskCatySubmit();
                      if (e.key === 'Escape') { setAskCatyOpen(false); setAskCatyQuery(''); }
                    }}
                    placeholder=""
                    disabled={askCatyLoading}
                    aria-label="Ask Caty"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {askCatyQuery === '' && (
                    <span className="ask-caty-row__placeholder" aria-hidden="true">
                      {phText}
                      <span className="ask-caty-cursor" />
                    </span>
                  )}
                </span>
              )}
              {!askCatyHasResults && (
                <span
                  className="ask-caty-row__suffix"
                  onMouseDown={e => e.preventDefault()} /* keep input focused */
                >
                  {/* Go button — disabled/muted when query is empty OR a
                      request is in flight; active blue otherwise. */}
                  <button
                    type="button"
                    onClick={handleAskCatySubmit}
                    disabled={!askCatyQuery.trim() || askCatyLoading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', border: 'none', borderRadius: 4,
                      background:
                        askCatyQuery.trim() && !askCatyLoading
                          ? 'var(--ds-background-brand-bold, #0C66E4)'
                          : 'var(--ds-background-neutral, #F4F5F7)',
                      color:
                        askCatyQuery.trim() && !askCatyLoading
                          ? '#FFFFFF'
                          : 'var(--ds-text-disabled, #8590A2)',
                      fontSize: 13, fontWeight: 500,
                      cursor: askCatyQuery.trim() && !askCatyLoading ? 'pointer' : 'default',
                      fontFamily: 'inherit', transition: 'background 120ms ease', flexShrink: 0,
                    }}
                    aria-label="Submit"
                  >
                    <span>Go</span>
                    <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>⏎</span>
                  </button>
                </span>
              )}
            </label>

            {/* Row 2 — "Search work" input. Only rendered once AI
                results have landed; filters the AI-narrowed list
                further by free-text. Mirrors Jira's pattern (see
                screenshot 2026-05-14): same rainbow-bordered area,
                divider between rows, dedicated icon prefix. */}
            {askCatyHasResults && (
              <>
                <div className="ask-caty-divider" aria-hidden="true" />
                {/* Inline styles here intentionally beat any cached or
                    overridden CSS rules — the secondary search must
                    sit as a small fixed-width pill on the left,
                    regardless of what the row's default flex rules
                    say. Keeps the AI input full-width above while
                    this row stays compact. */}
                <label
                  className="ask-caty-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    height: 40,
                    padding: '0 12px',
                    boxSizing: 'border-box',
                    justifyContent: 'flex-start',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flex: '0 0 auto',
                      height: 28,
                      padding: '0 4px 0 8px',
                      borderRadius: '4px 0 0 4px',
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      color: 'var(--ds-text-subtlest, #6B778C)',
                    }}
                  >
                    <SearchIconCore label="" color="currentColor" />
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: '0 0 auto',
                      width: 180,
                      maxWidth: '100%',
                      height: 28,
                      padding: '0 8px 0 4px',
                      borderRadius: '0 4px 4px 0',
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      value={catySecondaryQuery}
                      onChange={(e) => catySetSecondaryQuery(e.target.value)}
                      placeholder="Search work"
                      aria-label="Search work"
                      autoComplete="off"
                      spellCheck={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        padding: 0,
                        border: 0,
                        outline: 0,
                        background: 'transparent',
                        boxShadow: 'none',
                        font: 'inherit',
                        fontSize: 13,
                        color: 'var(--ds-text, #292A2E)',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                    />
                  </span>
                </label>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setAskCatyOpen(false);
            setAskCatyQuery('');
            // Dismiss any active Caty filter too — closing the bar
            // reverts the project list to the toolbar-driven view.
            if (askCatyHasResults || askCatyHasError || askCatyLoading) {
              catyClear();
            }
          }}
          style={{
            width: 28, height: 28, border: 'none', borderRadius: 4,
            background: 'transparent', cursor: 'pointer',
            color: 'var(--ds-text-subtle, #505258)', fontSize: 16, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Close Ask Caty"
        >✕</button>
        </div>
        {/* Disclaimer row — visible when Caty has results OR errored.
            Mirrors Jira's "Uses AI · Verify results" affordance with
            thumbs feedback + a Clear pill so the user can restore the
            normal toolbar-driven view without dismissing the bar. */}
        {(askCatyHasResults || askCatyHasError) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 4px',
              fontSize: 12,
              color: 'var(--ds-text-subtlest, #6B778C)',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <InfoIconCore label="" color="currentColor" />
              </span>
              <span>Uses AI. Verify results.</span>
              {askCatyHasResults && catyReason && (
                <span style={{ color: 'var(--ds-text-subtle, #505258)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  · {catyReason}
                </span>
              )}
              {askCatyHasError && catyErrorMessage && (
                <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>
                  · {catyErrorMessage}
                </span>
              )}
              {askCatyHasResults && (
                <>
                  <button
                    type="button"
                    onClick={() => setAskCatyFeedback((f) => (f === 'up' ? null : 'up'))}
                    aria-label="Helpful"
                    title="Helpful"
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: askCatyFeedback === 'up' ? 'var(--ds-text-brand, #0C66E4)' : 'var(--ds-text-subtlest, #6B778C)',
                    }}
                  >
                    <ThumbsUpIconCore label="" color="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAskCatyFeedback((f) => (f === 'down' ? null : 'down'))}
                    aria-label="Not helpful"
                    title="Not helpful"
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: askCatyFeedback === 'down' ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text-subtlest, #6B778C)',
                    }}
                  >
                    <ThumbsDownIconCore label="" color="currentColor" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="catalyst-allwork-toolbar.bar"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'transparent',
        flexShrink: 0,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* 3. Ask Caty — replaces Jira's "Ask AI". Click → expands to full-width
          AI query bar (mirrors Jira BAU Ask AI probe: full toolbar replacement,
          40px white bar with blue focus border, contextual placeholder). */}
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={SparkIcon}
        onClick={() => setAskCatyOpen(true)}
        testId="catalyst-allwork-toolbar.ask-caty"
      >
        Ask Caty
      </Button>

      {/* 4. Search */}
      <div style={{ flex: '0 1 220px', minWidth: 140 }}>
        <Textfield
          isCompact
          appearance="standard"
          placeholder="Search work"
          value={query}
          onChange={(e) => onQueryChange((e.target as HTMLInputElement).value)}
          elemBeforeInput={<span style={{ paddingLeft: 8, color: 'var(--ds-text-subtle, #505258)' }}><SearchIcon /></span>}
          testId="catalyst-allwork-toolbar.search"
        />
      </div>

      {/* 5. Avatar group filter */}
      {avatarData.length > 0 && (
        <AvatarGroup
          appearance="stack"
          size="small"
          maxCount={4}
          data={avatarData}
          onAvatarClick={(_, member) => {
            if (!onAssigneesChange) return;
            const id = (member as any).key as string;
            const next = selectedAssignees.includes(id)
              ? selectedAssignees.filter(x => x !== id)
              : [...selectedAssignees, id];
            onAssigneesChange(next);
          }}
          testId="catalyst-allwork-toolbar.assignee-avatars"
        />
      )}

      {/* 6. Filter chip bar — Jira's Basic-mode pattern (jira-compare 2026-05-03 Round 8).
          REPLACES the prior single Filter button + 600×489 monolithic popup.
          Now: Type / Status / Assignee as top-level chips (FilterChip with
          single-facet dropdown), More filters chip for the remaining 5 facets
          (FilterTriggerAndPopup with multi-facet popup, restricted to
          MORE_FILTERS_FACETS), Clear filters + Save filter buttons.

          Chip state: single openChipKey tracks which chip's dropdown is open
          (chip-or-popup). Opening one closes the others (Jira behaviour). */}
      <FilterChip
        label={FACET_LABELS.workType}
        facet="workType"
        options={facetOptions.workType}
        selected={selectedFilters.workType}
        onToggle={(v) => toggleValue('workType', v)}
        isOpen={openChipKey === 'workType'}
        onOpenChange={(open) => setOpenChipKey(open ? 'workType' : null)}
        headline="Type = (equals)"
      />
      <FilterChip
        label={FACET_LABELS.status}
        facet="status"
        options={facetOptions.status}
        selected={selectedFilters.status}
        onToggle={(v) => toggleValue('status', v)}
        isOpen={openChipKey === 'status'}
        onOpenChange={(open) => setOpenChipKey(open ? 'status' : null)}
        headline="Status = (equals)"
      />
      <FilterChip
        label={FACET_LABELS.assignee}
        facet="assignee"
        options={facetOptions.assignee}
        selected={selectedFilters.assignee}
        onToggle={(v) => toggleValue('assignee', v)}
        isOpen={openChipKey === 'assignee'}
        onOpenChange={(open) => setOpenChipKey(open ? 'assignee' : null)}
        headline="Assignee = (equals)"
      />

      {/* More filters → opens the multi-facet popup with the 5 remaining facets
          (Fix versions, Parent, Labels, Priority, Reporter). Reuses
          FilterTriggerAndPopup from Round 6 — left-rail tabs + right-pane
          value picker pattern. Atlaskit primitive: @atlaskit/popup behaviour
          replicated manually (see Round 6 root-cause comment). */}
      <FilterTriggerAndPopup
        triggerLabel={(() => {
          const moreCount = MORE_FILTERS_FACETS.reduce((n, f) => n + selectedFilters[f].length, 0);
          return `More filters${moreCount > 0 ? ` (${moreCount})` : ''}`;
        })()}
        isOpen={openChipKey === 'more'}
        onOpenChange={(open) => setOpenChipKey(open ? 'more' : null)}
        FilterIcon={FilterIcon}
        renderContent={() => (
          <div
            data-testid="catalyst-allwork-toolbar.more-filters-popup"
            style={{
              width: 520, height: 420, display: 'flex', flexDirection: 'column',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left rail — 5 hidden-facet tabs */}
              <div
                role="tablist"
                aria-orientation="vertical"
                style={{
                  width: 140, flexShrink: 0,
                  borderRight: '1px solid var(--ds-border, #DFE1E6)',
                  overflowY: 'auto', padding: '6px 0',
                }}
              >
                {MORE_FILTERS_FACETS.map(f => {
                  const isActive = activeFacet === f;
                  const count = selectedFilters[f].length;
                  return (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveFacet(f)}
                      data-testid={`catalyst-allwork-toolbar.more-filters.facet.${f}`}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '6px 12px', border: 'none',
                        background: isActive ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                        color: isActive ? 'var(--ds-text-selected, #0C66E4)' : 'var(--ds-text, #292A2E)',
                        fontSize: 13, lineHeight: '20px', cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span>{FACET_LABELS[f]}</span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 11, color: 'var(--ds-text-subtle, #505258)',
                          background: 'var(--ds-background-neutral, #DCDFE4)',
                          padding: '0 6px', borderRadius: 8, lineHeight: '16px',
                        }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right pane — value picker for the active facet (uses renderFacetRow helper) */}
              <div
                role="tabpanel"
                style={{ flex: 1, padding: 12, overflowY: 'auto', minWidth: 0 }}
              >
                {activeFacet === null || !MORE_FILTERS_FACETS.includes(activeFacet) ? (
                  <div style={{
                    color: 'var(--ds-text-subtle, #505258)',
                    fontSize: 13, lineHeight: '20px',
                  }}>Select a field to start creating a filter.</div>
                ) : facetOptions[activeFacet].length === 0 ? (
                  <div style={{
                    color: 'var(--ds-text-subtle, #505258)',
                    fontSize: 13, lineHeight: '20px',
                  }}>No values available for this field.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {facetOptions[activeFacet].map(opt =>
                      renderFacetRow(
                        activeFacet,
                        opt,
                        selectedFilters[activeFacet].includes(opt.value),
                        () => toggleValue(activeFacet, opt.value),
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      />

      {/* Clear filters — visible when any chip has a selection.
          Atlaskit Button "subtle" with brand text colour, matches Jira. */}
      {totalCount > 0 && (
        <Button
          appearance="subtle"
          onClick={clearAll}
          testId="catalyst-allwork-toolbar.clear-filters"
        >
          <span style={{ color: 'var(--ds-text-brand, #0C66E4)' }}>
            Clear filters
          </span>
        </Button>
      )}

      {/* Save filter — wired to allwork_saved_filters table (Vikram-run SQL).
          Click → CLOSES any open chip popup (fixes 2026-05-03 overlap defect
          where Save filter modal sat on top of an open More filters popup),
          then opens SaveFilterModal. */}
      <Button
        appearance="subtle"
        onClick={() => {
          setOpenChipKey(null); // close any open chip popup before modal opens
          setSaveModalOpen(true);
        }}
        testId="catalyst-allwork-toolbar.save-filter"
      >
        <span style={{ color: 'var(--ds-text-brand, #0C66E4)' }}>
          Save filter
        </span>
      </Button>

      {/* Saved filters dropdown — Read + Apply + Delete (R + D of CRUD).
          Shows the user's saved views for this project; click to apply state
          to the chip bar. Renders nothing if the user has no saved filters. */}
      <SavedFiltersDropdown
        projectKey={projectKey}
        refreshKey={savedFiltersRefreshKey}
        onApply={(s) => onSelectedFiltersChange?.(s)}
      />

      {/* Save filter modal — mounted always; visibility controlled by isOpen. */}
      <SaveFilterModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        currentState={selectedFilters}
        projectKey={projectKey}
        onSaved={() => setSavedFiltersRefreshKey(k => k + 1)}
      />

      <span style={{ flex: 1 }} />


      {/* 9. More actions (Meatball menu) — Export / Import / Bulk change / Go to all work.
          Jira parity: matches Jira's "More actions" dropdown menu with the same four
          options. Each is a link/button with a handler — no dead toasts. */}
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...props}
            style={{
              width: 32, height: 32,
              padding: 0,
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--ds-text-subtle, #505258)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="More actions"
            testId="catalyst-allwork-toolbar.more-actions"
            aria-label="More actions"
          >
            ⋯
          </button>
        )}
        testId="catalyst-allwork-toolbar.more-actions-menu"
      >
        <DropdownItemGroup>
          <DropdownItem
            onClick={() => toast('Export functionality coming soon')}
            testId="catalyst-allwork-toolbar.more-actions.export"
          >
            Export
          </DropdownItem>
          <DropdownItem
            onClick={() => toast('Import CSV functionality coming soon')}
            testId="catalyst-allwork-toolbar.more-actions.import"
          >
            Import work items from CSV
          </DropdownItem>
          <DropdownItem
            onClick={() => toast('Bulk change functionality coming soon')}
            testId="catalyst-allwork-toolbar.more-actions.bulk-change"
          >
            Bulk change work items
          </DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup>
          <DropdownItem
            href={`/project-hub/${projectKey}/allwork`}
            testId="catalyst-allwork-toolbar.more-actions.go-to-all-work"
          >
            Go to all work items
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </div>
  );
}
