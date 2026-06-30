/**
 * CanonicalFilter — Phase 1 (UI shell only).
 *
 * Canonical filter component intended to replace JiraFilterAtlaskit and any
 * other per-surface filter dropdowns app-wide. Phase 1 ships the visual
 * structure (tabs strap, saved-filters dropdown, basic field rail, footer)
 * with no functional wiring. Field editors, JQL, saved-filter persistence,
 * and value application come in subsequent phases.
 *
 * Mounted first on /project-hub/:key/backlog. Other surfaces migrate once
 * this is feature-complete.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import FilterIcon from '@atlaskit/icon/core/filter';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import SearchIcon from '@atlaskit/icon/core/search';
import AddIcon from '@atlaskit/icon/core/add';
import StarIcon from '@atlaskit/icon/glyph/star';
import MegaphoneIcon from '@atlaskit/icon/core/megaphone';
import PinIcon from '@atlaskit/icon/core/pin';
import PinFilledIcon from '@atlaskit/icon/core/pin-filled';
import MoreIcon from '@atlaskit/icon/core/show-more-horizontal';
import DragHandleIcon from '@atlaskit/icon/core/drag-handle-vertical';
import PriorityHighestIcon from '@atlaskit/icon/core/priority-highest';
import PriorityHighIcon from '@atlaskit/icon/core/priority-high';
import PriorityMediumIcon from '@atlaskit/icon/core/priority-medium';
import PriorityLowIcon from '@atlaskit/icon/core/priority-low';
import PriorityLowestIcon from '@atlaskit/icon/core/priority-lowest';
import PriorityBlockerIcon from '@atlaskit/icon/core/priority-blocker';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import Tooltip from '@atlaskit/tooltip';
import { StatusLozenge } from '@/components/shared/StatusLozenge/StatusLozenge';
import Spinner from '@atlaskit/spinner';
import FullscreenEnterIcon from '@atlaskit/icon/core/fullscreen-enter';
import FullscreenExitIcon from '@atlaskit/icon/core/fullscreen-exit';
import QuestionIcon from '@atlaskit/icon/core/question-circle';
import {
  jqlToCanonicalFilterValue,
  canonicalFilterValueToJql,
} from '@/lib/jql/canonicalFilterJql';

export type FilterTab = 'basic' | 'jql';

export interface CanonicalSavedFilter {
  id: string;
  name: string;
  starred?: boolean;
}

/** Sentinel used in `parent` selection to mean "items with no parent". */
export const NO_PARENT_SENTINEL = '__NO_PARENT__';

export interface CanonicalFilterValue {
  parent: string[];
  assignee: string[];
  status: string[];
  labels: string[];
  workType: string[];
  priority: string[];
  severity: string[];
  /** Exclude variants — populated when the Advanced chip operator is `!=`. */
  parentExclude: string[];
  assigneeExclude: string[];
  statusExclude: string[];
  labelsExclude: string[];
  workTypeExclude: string[];
  priorityExclude: string[];
  severityExclude: string[];
}

export const emptyCanonicalFilterValue: CanonicalFilterValue = {
  parent: [],
  assignee: [],
  status: [],
  labels: [],
  workType: [],
  priority: [],
  severity: [],
  parentExclude: [],
  assigneeExclude: [],
  statusExclude: [],
  labelsExclude: [],
  workTypeExclude: [],
  priorityExclude: [],
  severityExclude: [],
};

export function countCanonicalActiveFields(v: CanonicalFilterValue): number {
  let n = 0;
  if (v.parent.length || v.parentExclude.length) n++;
  if (v.assignee.length || v.assigneeExclude.length) n++;
  if (v.status.length || v.statusExclude.length) n++;
  if (v.labels.length || v.labelsExclude.length) n++;
  if (v.workType.length || v.workTypeExclude.length) n++;
  if (v.priority.length || v.priorityExclude.length) n++;
  if (v.severity.length || v.severityExclude.length) n++;
  return n;
}

export interface CanonicalPriorityOption { id: string; label: string }
export interface CanonicalSeverityOption { id: string; label: string }

/** Canonical Jira-standard priority taxonomy. */
export const CANONICAL_PRIORITY_OPTIONS: CanonicalPriorityOption[] = [
  { id: 'Highest', label: 'Highest' },
  { id: 'High',    label: 'High' },
  { id: 'Medium',  label: 'Medium' },
  { id: 'Low',     label: 'Low' },
  { id: 'Lowest',  label: 'Lowest' },
];

/** Map a priority id → its Atlaskit core icon (color tinted). */
function priorityIcon(id: string): React.ReactNode {
  switch (id) {
    case 'Highest': return <span style={{ display: 'inline-flex', color: 'var(--ds-text-inverse)', background: 'var(--ds-background-danger-bold)', borderRadius: 2, padding: '0 2px' }}><PriorityHighestIcon label="" size="small" /></span>;
    case 'High':    return <span style={{ display: 'inline-flex', color: 'var(--ds-text-danger)' }}><PriorityHighIcon    label="" size="small" /></span>;
    case 'Medium':  return <span style={{ display: 'inline-flex', color: 'var(--ds-text-warning)' }}><PriorityMediumIcon  label="" size="small" /></span>;
    case 'Low':     return <span style={{ display: 'inline-flex', color: 'var(--ds-link)' }}><PriorityLowIcon     label="" size="small" /></span>;
    case 'Lowest':  return <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtlest)' }}><PriorityLowestIcon  label="" size="small" /></span>;
    default:        return null;
  }
}
/** Map a severity id → its Atlaskit core icon (color tinted). */
function severityIcon(id: string): React.ReactNode {
  switch (id) {
    case 'Blocker': return <span style={{ display: 'inline-flex', color: 'var(--ds-text-danger)' }}><PriorityBlockerIcon label="" size="small" /></span>;
    case 'High':    return <span style={{ display: 'inline-flex', color: 'var(--ds-background-danger-bold)' }}><PriorityHighIcon    label="" size="small" /></span>;
    case 'Medium':  return <span style={{ display: 'inline-flex', color: 'var(--ds-background-warning-bold)' }}><PriorityMediumIcon  label="" size="small" /></span>;
    case 'Low':     return <span style={{ display: 'inline-flex', color: 'var(--ds-link)' }}><PriorityLowIcon     label="" size="small" /></span>;
    default:        return null;
  }
}

/** Defect-tier severity (customfield_10125: Blocker / High / Medium / Low). */
export const CANONICAL_SEVERITY_OPTIONS: CanonicalSeverityOption[] = [
  { id: 'Blocker', label: 'Blocker' },
  { id: 'High',    label: 'High' },
  { id: 'Medium',  label: 'Medium' },
  { id: 'Low',     label: 'Low' },
];

/**
 * Default canonical work-type catalog covering every type tracked in
 * Catalyst (CLAUDE.md 2026-06-12 hierarchy map + DEFAULT_WORK_ITEM_TYPES).
 * Surfaces that don't supply their own workTypeOptions inherit this list.
 * Each id mirrors the value used in ph_issues.issue_type so it round-trips
 * through matchesCanonical predicates and JQL serialization unchanged.
 */
export const DEFAULT_CANONICAL_WORK_TYPE_OPTIONS: CanonicalWorkTypeOption[] = [
  { id: 'Epic',                label: 'Epic',                icon: <JiraIssueTypeIcon type="Epic"                size={14} /> },
  { id: 'Feature',             label: 'Feature',             icon: <JiraIssueTypeIcon type="Feature"             size={14} /> },
  { id: 'Story',               label: 'Story',               icon: <JiraIssueTypeIcon type="Story"               size={14} /> },
  { id: 'Task',                label: 'Task',                icon: <JiraIssueTypeIcon type="Task"                size={14} /> },
  { id: 'Sub-task',            label: 'Sub-task',            icon: <JiraIssueTypeIcon type="Sub-task"            size={14} /> },
  { id: 'QA Bug',              label: 'QA Bug',              icon: <JiraIssueTypeIcon type="QA Bug"              size={14} /> },
  { id: 'Production Incident', label: 'Production Incident', icon: <JiraIssueTypeIcon type="Production Incident" size={14} /> },
  { id: 'Change Request',      label: 'Change Request',      icon: <JiraIssueTypeIcon type="Change Request"      size={14} /> },
  { id: 'Business Gap',        label: 'Business Gap',        icon: <JiraIssueTypeIcon type="Business Gap"        size={14} /> },
  { id: 'Business Request',    label: 'Business Request',    icon: <JiraIssueTypeIcon type="Business Request"    size={14} /> },
  { id: 'Backend',             label: 'Backend',             icon: <JiraIssueTypeIcon type="Backend"             size={14} /> },
  { id: 'Frontend',            label: 'Frontend',            icon: <JiraIssueTypeIcon type="Frontend"             size={14} /> },
  { id: 'Integration',         label: 'Integration',         icon: <JiraIssueTypeIcon type="Integration"         size={14} /> },
  { id: 'API Requirement',     label: 'API Requirement',     icon: <JiraIssueTypeIcon type="API Requirement"     size={14} /> },
  { id: 'Figma',               label: 'Figma',               icon: <JiraIssueTypeIcon type="Figma"               size={14} /> },
  { id: 'Idea',                label: 'Idea',                icon: <JiraIssueTypeIcon type="Idea"                size={14} /> },
];

export interface CanonicalStatusOption {
  value: string;
  label: string;
  appearance?: 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';
}
export interface CanonicalAssigneeOption {
  id: string;          // jira account_id or profile id used in row matching
  label: string;
  avatarUrl?: string;
}
export interface CanonicalWorkTypeOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CanonicalFilterProps {
  /** "My filters" list (scoped to the surface — project / product / etc.). */
  myFilters?: CanonicalSavedFilter[];
  /** Controlled value (selected items per field). */
  value?: CanonicalFilterValue;
  onChange?: (next: CanonicalFilterValue) => void;
  /** Option pools per field. */
  statusOptions?: CanonicalStatusOption[];
  assigneeOptions?: CanonicalAssigneeOption[];
  labelOptions?: string[];
  workTypeOptions?: CanonicalWorkTypeOption[];
  priorityOptions?: CanonicalPriorityOption[];
  severityOptions?: CanonicalSeverityOption[];
  /** Persistence scope — used for rail prefs AND parent query scoping. */
  scopeType?: string;
  scopeKey?: string;
  /**
   * Context that drives which fields appear in the Basic tab.
   * 'business-request' — hides Parent + Severity; work type = BR/BRD/BizGap/ChangeReq
   * 'project'          — shows Parent; work type = Feature/Story/Task/Sub-task
   * 'product'          — all fields; work type = all types
   * 'testhub'          — hides Parent; work type = QA Bug/Defect
   * 'incident'         — hides Parent; work type = Production Incident only
   * 'tasks'            — hides Parent + Severity; work type = Task/Sub-task
   */
  filterContext?: 'business-request' | 'product' | 'project' | 'testhub' | 'incident' | 'tasks';
}

const BASIC_FIELDS = ['Parent', 'Assignee', 'Status', 'Labels', 'Work type', 'Priority', 'Severity'];

const DEFAULT_FILTERS = [
  'Assigned to me',
  'My open work items',
  'Reported by me',
  'Open work items',
  'Done work items',
  'Viewed recently',
  'Resolved recently',
  'Updated recently',
];

export function CanonicalFilter({
  myFilters = [],
  value,
  onChange,
  statusOptions = [],
  assigneeOptions = [],
  labelOptions = [],
  workTypeOptions = DEFAULT_CANONICAL_WORK_TYPE_OPTIONS,
  priorityOptions = CANONICAL_PRIORITY_OPTIONS,
  severityOptions = CANONICAL_SEVERITY_OPTIONS,
  scopeType,
  scopeKey,
  filterContext,
}: CanonicalFilterProps) {
  const scopeReady = !!(scopeType && scopeKey);
  // Uncontrolled fallback so component still works without value/onChange.
  const [innerValue, setInnerValue] = useState<CanonicalFilterValue>(emptyCanonicalFilterValue);
  const effValue = value ?? innerValue;
  const setEff = useCallback((next: CanonicalFilterValue) => {
    if (onChange) onChange(next);
    else setInnerValue(next);
  }, [onChange]);
  // ProjectChip selections live at this level so the trigger badge can
  // count them alongside canonical fields. Default = the current project
  // key when scope is provided.
  const [projectSelections, setProjectSelections] = useState<string[]>(() => scopeKey ? [scopeKey] : []);
  useEffect(() => {
    setProjectSelections(scopeKey ? [scopeKey] : []);
  }, [scopeKey]);
  const activeFieldCount = countCanonicalActiveFields(effValue);
  const onClearAll = useCallback(() => setEff(emptyCanonicalFilterValue), [setEff]);

  // Context-aware field visibility.
  const NO_PARENT_CONTEXTS = ['business-request', 'testhub', 'incident', 'tasks'];
  const NO_SEVERITY_CONTEXTS = ['business-request', 'tasks'];
  const showParent = !NO_PARENT_CONTEXTS.includes(filterContext ?? '');
  const showSeverity = !NO_SEVERITY_CONTEXTS.includes(filterContext ?? '');

  // Work type options scoped to context.
  const BR_WORK_TYPES = new Set(['Business Request', 'Business Gap', 'BRD Task', 'Change Request']);
  const PROJECT_WORK_TYPES = new Set(['Feature', 'Story', 'Task', 'Sub-task']);
  const TESTHUB_WORK_TYPES = new Set(['QA Bug', 'Defect']);
  const INCIDENT_WORK_TYPES = new Set(['Production Incident']);
  const TASKS_WORK_TYPES = new Set(['Task', 'Sub-task']);
  const contextWorkTypeOptions = useMemo(() => {
    if (!filterContext || filterContext === 'product') return workTypeOptions;
    const allowed = filterContext === 'business-request' ? BR_WORK_TYPES
      : filterContext === 'project' ? PROJECT_WORK_TYPES
      : filterContext === 'incident' ? INCIDENT_WORK_TYPES
      : filterContext === 'tasks' ? TASKS_WORK_TYPES
      : TESTHUB_WORK_TYPES;
    const filtered = workTypeOptions.filter((w) => allowed.has(w.label));
    return filtered.length > 0 ? filtered : workTypeOptions;
  }, [filterContext, workTypeOptions]);
  const clearField = useCallback((field: keyof CanonicalFilterValue) => {
    setEff({ ...effValue, [field]: [] });
  }, [effValue, setEff]);
  const toggleSelection = useCallback((field: keyof CanonicalFilterValue, optionId: string) => {
    const list = effValue[field];
    const next = list.includes(optionId)
      ? list.filter((x) => x !== optionId)
      : [...list, optionId];
    setEff({ ...effValue, [field]: next });
  }, [effValue, setEff]);
  function fieldKeyFor(label: string): keyof CanonicalFilterValue | null {
    switch (label) {
      case 'Parent': return 'parent';
      case 'Assignee': return 'assignee';
      case 'Status': return 'status';
      case 'Labels': return 'labels';
      case 'Work type': return 'workType';
      case 'Priority': return 'priority';
      case 'Severity': return 'severity';
      default: return null;
    }
  }
  function excludeKeyFor(field: keyof CanonicalFilterValue): keyof CanonicalFilterValue | null {
    switch (field) {
      case 'parent': return 'parentExclude';
      case 'assignee': return 'assigneeExclude';
      case 'status': return 'statusExclude';
      case 'labels': return 'labelsExclude';
      case 'workType': return 'workTypeExclude';
      case 'priority': return 'priorityExclude';
      case 'severity': return 'severityExclude';
      default: return null;
    }
  }
  function countFor(label: string): number {
    const k = fieldKeyFor(label);
    if (!k) return 0;
    const inc = effValue[k]?.length ?? 0;
    const exK = excludeKeyFor(k);
    const exc = exK ? (effValue[exK]?.length ?? 0) : 0;
    return inc + exc;
  }
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>('basic');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedSearch, setSavedSearch] = useState('');

  // Pin/order/remove state for left-rail fields. All BASIC_FIELDS pinned by
  // default; unpinned grows on click of filled pin; removed grows on "Remove
  // filter" menu action. Order within each section is independent.
  //
  // Persistence: per-user rows in public.filter_rail_preferences keyed by
  // (user_id, scope_type, scope_key, field_label). Loaded on mount when
  // scope is supplied; upserted on every state change. Missing rows default
  // to 'pinned' so new BASIC_FIELDS added later auto-appear.
  const [pinnedFields, setPinnedFields] = useState<string[]>(() => [...BASIC_FIELDS]);
  const [unpinnedFields, setUnpinnedFields] = useState<string[]>([]);
  const [removedFields, setRemovedFields] = useState<string[]>([]);
  // `prefsLoaded` flips true after the initial Supabase fetch returns. Used
  // to gate the upsert effect so we don't overwrite remote prefs with the
  // unhydrated default state on mount.
  const [prefsLoaded, setPrefsLoaded] = useState<boolean>(!scopeReady);
  const userIdRef = useRef<string | null>(null);

  // Self-fetch org members when caller passes empty assigneeOptions.
  // Uses the lightweight profiles query — no joins, just id+name+avatar.
  const [fetchedAssignees, setFetchedAssignees] = useState<CanonicalAssigneeOption[]>([]);
  useEffect(() => {
    if (assigneeOptions.length > 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true })
        .limit(500);
      if (cancelled || error || !data) return;
      setFetchedAssignees(
        (data as Array<{ id: string; full_name: string | null; avatar_url: string | null }>)
          .filter((p) => p.full_name)
          .map((p) => ({ id: p.id, label: p.full_name!, avatarUrl: p.avatar_url ?? undefined }))
      );
    })();
    return () => { cancelled = true; };
  }, [assigneeOptions.length]);
  const effectiveAssigneeOptions = assigneeOptions.length > 0 ? assigneeOptions : fetchedAssignees;

  useEffect(() => {
    if (!scopeReady) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setPrefsLoaded(true); return; }
      userIdRef.current = user.id;
      const { data, error } = await supabase
        .from('filter_rail_preferences' as any)
        .select('field_label, state, position')
        .eq('user_id', user.id)
        .eq('scope_type', scopeType!)
        .eq('scope_key', scopeKey!);
      if (cancelled) return;
      if (error || !data) { setPrefsLoaded(true); return; }
      const rows = data as Array<{ field_label: string; state: string; position: number }>;
      const known = new Set(BASIC_FIELDS);
      const byState: Record<'pinned' | 'unpinned' | 'removed', Array<{ label: string; pos: number }>> = {
        pinned: [], unpinned: [], removed: [],
      };
      for (const r of rows) {
        if (!known.has(r.field_label)) continue;
        if (r.state !== 'pinned' && r.state !== 'unpinned' && r.state !== 'removed') continue;
        byState[r.state].push({ label: r.field_label, pos: r.position });
      }
      for (const k of ['pinned', 'unpinned', 'removed'] as const) {
        byState[k].sort((a, b) => a.pos - b.pos);
      }
      const accounted = new Set<string>();
      const pinned = byState.pinned.map((x) => { accounted.add(x.label); return x.label; });
      const unpinned = byState.unpinned.map((x) => { accounted.add(x.label); return x.label; });
      const removed = byState.removed.map((x) => { accounted.add(x.label); return x.label; });
      // BASIC_FIELDS missing from DB default to pinned (handles future fields).
      const fresh = BASIC_FIELDS.filter((x) => !accounted.has(x));
      setPinnedFields([...pinned, ...fresh]);
      setUnpinnedFields(unpinned);
      setRemovedFields(removed);
      setPrefsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [scopeReady, scopeType, scopeKey]);

  useEffect(() => {
    if (!scopeReady || !prefsLoaded) return;
    const uid = userIdRef.current;
    if (!uid) return;
    const rows: Array<{
      user_id: string;
      scope_type: string;
      scope_key: string;
      field_label: string;
      state: 'pinned' | 'unpinned' | 'removed';
      position: number;
    }> = [];
    pinnedFields.forEach((label, i) => rows.push({ user_id: uid, scope_type: scopeType!, scope_key: scopeKey!, field_label: label, state: 'pinned', position: i }));
    unpinnedFields.forEach((label, i) => rows.push({ user_id: uid, scope_type: scopeType!, scope_key: scopeKey!, field_label: label, state: 'unpinned', position: i }));
    removedFields.forEach((label, i) => rows.push({ user_id: uid, scope_type: scopeType!, scope_key: scopeKey!, field_label: label, state: 'removed', position: i }));
    if (rows.length === 0) return;
    // Fire-and-forget. Best-effort persistence; UI does not block on writes.
    void supabase
      .from('filter_rail_preferences' as any)
      .upsert(rows, { onConflict: 'user_id,scope_type,scope_key,field_label' });
  }, [scopeReady, prefsLoaded, scopeType, scopeKey, pinnedFields, unpinnedFields, removedFields]);
  const [ellipsisOpenFor, setEllipsisOpenFor] = useState<string | null>(null);
  const [ellipsisPos, setEllipsisPos] = useState<{ top: number; left: number } | null>(null);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const ellipsisMenuRef = useRef<HTMLDivElement>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const addFieldBtnRef = useRef<HTMLButtonElement>(null);
  const addFieldMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!addFieldOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addFieldMenuRef.current?.contains(e.target as Node)) return;
      if (addFieldBtnRef.current?.contains(e.target as Node)) return;
      setAddFieldOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAddFieldOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [addFieldOpen]);
  function restoreField(label: string) {
    setRemovedFields((r) => r.filter((x) => x !== label));
    setPinnedFields((p) => p.includes(label) ? p : [...p, label]);
    setAddFieldOpen(false);
  }

  type RailSection = 'pinned' | 'unpinned';
  function sectionOf(label: string): RailSection {
    return pinnedFields.includes(label) ? 'pinned' : 'unpinned';
  }
  function togglePin(label: string) {
    if (pinnedFields.includes(label)) {
      setPinnedFields((p) => p.filter((x) => x !== label));
      setUnpinnedFields((u) => [...u, label]);
    } else {
      setUnpinnedFields((u) => u.filter((x) => x !== label));
      setPinnedFields((p) => [...p, label]);
    }
  }
  function moveWithinSection(label: string, action: 'top' | 'up' | 'down' | 'bottom') {
    const section = sectionOf(label);
    const list = section === 'pinned' ? pinnedFields : unpinnedFields;
    const setter = section === 'pinned' ? setPinnedFields : setUnpinnedFields;
    const i = list.indexOf(label);
    if (i < 0) return;
    const next = [...list];
    next.splice(i, 1);
    let target = i;
    if (action === 'top') target = 0;
    else if (action === 'bottom') target = next.length;
    else if (action === 'up') target = Math.max(0, i - 1);
    else if (action === 'down') target = Math.min(next.length, i + 1);
    next.splice(target, 0, label);
    setter(next);
  }
  function removeField(label: string) {
    setPinnedFields((p) => p.filter((x) => x !== label));
    setUnpinnedFields((u) => u.filter((x) => x !== label));
    setRemovedFields((r) => (r.includes(label) ? r : [...r, label]));
    if (selectedField === label) setSelectedField(null);
  }

  function dropOn(targetLabel: string) {
    if (!draggingField || draggingField === targetLabel) return;
    const fromSection = sectionOf(draggingField);
    const toSection = sectionOf(targetLabel);
    if (fromSection !== toSection) return; // scope-locked
    const list = fromSection === 'pinned' ? pinnedFields : unpinnedFields;
    const setter = fromSection === 'pinned' ? setPinnedFields : setUnpinnedFields;
    const next = list.filter((x) => x !== draggingField);
    const insertAt = next.indexOf(targetLabel);
    next.splice(insertAt, 0, draggingField);
    setter(next);
  }

  // Close ellipsis menu on outside click / Escape.
  useEffect(() => {
    if (!ellipsisOpenFor) return;
    const onDown = (e: MouseEvent) => {
      if (ellipsisMenuRef.current?.contains(e.target as Node)) return;
      setEllipsisOpenFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setEllipsisOpenFor(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [ellipsisOpenFor]);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const savedTriggerRef = useRef<HTMLButtonElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function openDrawer() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Anchor drawer's LEFT edge to trigger's LEFT — drawer opens rightward
    // (natural direction). Clamp inside viewport with an 8px gutter so the
    // drawer never spills off the right edge on narrow viewports.
    const DRAWER_W = 720;
    const GUTTER = 8;
    const maxLeft = Math.max(GUTTER, window.innerWidth - DRAWER_W - GUTTER);
    const left = Math.min(rect.left, maxLeft);
    setPos({ top: rect.bottom + 4, left });
    setOpen(true);
  }

  // Click-outside + Escape (capture phase so it beats parent modal handlers).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (drawerRef.current?.contains(t)) return;
      if (savedRef.current?.contains(t)) return;
      setSavedOpen(false);
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (savedOpen) setSavedOpen(false);
      else setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, savedOpen]);

  // Shift+F toggle (ignore when typing in an input).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'F' && e.key !== 'f') return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && /^(input|textarea|select)$/i.test(tgt.tagName)) return;
      if (tgt && tgt.isContentEditable) return;
      e.preventDefault();
      if (open) setOpen(false);
      else openDrawer();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  // Auto-focus saved-filters search when the popover opens.
  useEffect(() => {
    if (!savedOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [savedOpen]);

  const filteredMine = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    if (!q) return myFilters;
    return myFilters.filter((f) => f.name.toLowerCase().includes(q));
  }, [myFilters, savedSearch]);

  const filteredDefaults = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    if (!q) return DEFAULT_FILTERS;
    return DEFAULT_FILTERS.filter((n) => n.toLowerCase().includes(q));
  }, [savedSearch]);

  const blue = token('color.text.selected', 'var(--ds-link)');
  const blueBg = token('color.background.selected', 'var(--ds-background-selected)');
  const blueBorder = token('color.border.selected', 'var(--ds-link)');
  const borderSubtle = token('color.border', 'var(--ds-border)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const surface = token('elevation.surface', 'var(--ds-surface)');
  const surfaceOverlay = token('elevation.surface.overlay', 'var(--ds-surface)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');
  const textDisabled = token('color.text.disabled', 'var(--ds-text-disabled)');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDrawer())}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 32,
          padding: '0 10px',
          borderRadius: 3,
          border: `1px solid ${open ? blueBorder : borderSubtle}`,
          background: open ? blueBg : surface,
          color: open ? blue : textPrimary,
          fontSize: 'var(--ds-font-size-300)',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <FilterIcon label="" />
        <span>Filter</span>
        {effValue.assignee.length > 0 && (
          <AssigneeAvatarStack
            selectedIds={effValue.assignee}
            options={effectiveAssigneeOptions}
            max={3}
          />
        )}
        {activeFieldCount > 0 && (
          <span
            style={{
              marginLeft: 4,
              padding: '0 6px',
              minWidth: 22,
              height: 18,
              borderRadius: 3,
              background: token('color.background.accent.blue.subtle', 'var(--ds-background-information-bold)'),
              color: token('color.text', 'var(--ds-text)'),
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeFieldCount}
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={drawerRef}
          role="dialog"
          aria-label="Filter"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 520,
            maxHeight: 'min(560px, calc(100vh - 96px))',
            background: surfaceOverlay,
            border: `1px solid ${borderSubtle}`,
            borderRadius: 6,
            boxShadow: 'var(--ds-shadow-raised)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            font: token('font.body'),
            overflow: 'hidden',
          }}
        >
          {/* Header — tabs strap + saved-filters dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
                padding: 4,
                border: `1px solid ${borderSubtle}`,
                borderRadius: 6,
                background: surface,
              }}
            >
              {(['basic', 'jql'] as FilterTab[]).map((t) => {
                const active = tab === t;
                const label = t === 'jql' ? 'JQL' : t.charAt(0).toUpperCase() + t.slice(1);
                return (
                  <TabButton
                    key={t}
                    label={label}
                    active={active}
                    onClick={() => setTab(t)}
                  />
                );
              })}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                ref={savedTriggerRef}
                type="button"
                onClick={() => setSavedOpen((v) => !v)}
                aria-expanded={savedOpen}
                aria-haspopup="menu"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 28,
                  padding: '0 8px',
                  border: `1px solid ${savedOpen ? blueBorder : 'transparent'}`,
                  borderRadius: 3,
                  background: savedOpen ? blueBg : 'transparent',
                  color: savedOpen ? blue : textPrimary,
                  font: 'inherit',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!savedOpen) e.currentTarget.style.background = hoverNeutral;
                }}
                onMouseLeave={(e) => {
                  if (!savedOpen) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>Saved filters</span>
                <ChevronDownIcon label="" size="small" />
              </button>

              {savedOpen && (
                <div
                  ref={savedRef}
                  role="menu" data-canonical-filter-popup="true"
                  style={{
                    position: 'absolute',
                    top: 32,
                    right: 0,
                    width: 320,
                    maxHeight: 420,
                    background: surfaceOverlay,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: 6,
                    boxShadow: 'var(--ds-shadow-raised)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 1,
                  }}
                >
                  <div style={{ padding: 8 }}>
                    <SavedSearchInput
                      inputRef={searchInputRef}
                      value={savedSearch}
                      onChange={setSavedSearch}
                    />
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                    <SavedSection
                      title="My filters"
                      items={filteredMine.map((f) => f.name)}
                      selected={selectedFilter}
                      onSelect={setSelectedFilter}
                      showStar
                    />
                    <div style={{ height: 1, background: borderSubtle, margin: '4px 0' }} />
                    <SavedSection
                      title="Default filters"
                      items={filteredDefaults}
                      selected={selectedFilter}
                      onSelect={setSelectedFilter}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: borderSubtle }} />

          {/* Body — tab-driven. Basic renders left rail + right editor.
              JQL renders the full-width JQL composer. Advanced reserved
              for a later phase. */}
          {tab === 'jql' && (
            <JqlTabBody
              value={effValue}
              onChange={setEff}
              scopeKey={scopeKey}
            />
          )}
          {tab === 'basic' && (
          <div style={{ display: 'flex', flex: 1, minHeight: 320 }}>
            <div
              style={{
                width: 220,
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${borderSubtle}`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  overflowY: 'auto',
                }}
              >
                {pinnedFields.filter((f) => (showParent || f !== 'Parent') && (showSeverity || f !== 'Severity')).map((f) => (
                  <FieldItem
                    key={f}
                    label={f}
                    active={selectedField === f}
                    pinned
                    isDragOver={dragOverField === f && draggingField !== null && sectionOf(draggingField) === 'pinned'}
                    selectionCount={countFor(f)}
                    onClick={() => setSelectedField(f)}
                    onTogglePin={() => togglePin(f)}
                    onOpenEllipsis={(rect) => {
                      setEllipsisOpenFor(f);
                      setEllipsisPos({ top: rect.bottom + 4, left: rect.left });
                    }}
                    onDragStart={() => setDraggingField(f)}
                    onDragEnd={() => { setDraggingField(null); setDragOverField(null); }}
                    onDragOver={() => setDragOverField(f)}
                    onDrop={() => dropOn(f)}
                  />
                ))}
                {unpinnedFields.filter((f) => (showParent || f !== 'Parent') && (showSeverity || f !== 'Severity')).length > 0 && (
                  <div style={{ height: 1, background: borderSubtle, margin: '4px 0' }} />
                )}
                {unpinnedFields.filter((f) => (showParent || f !== 'Parent') && (showSeverity || f !== 'Severity')).map((f) => (
                  <FieldItem
                    key={f}
                    label={f}
                    active={selectedField === f}
                    pinned={false}
                    isDragOver={dragOverField === f && draggingField !== null && sectionOf(draggingField) === 'unpinned'}
                    selectionCount={countFor(f)}
                    onClick={() => setSelectedField(f)}
                    onTogglePin={() => togglePin(f)}
                    onOpenEllipsis={(rect) => {
                      setEllipsisOpenFor(f);
                      setEllipsisPos({ top: rect.bottom + 4, left: rect.left });
                    }}
                    onDragStart={() => setDraggingField(f)}
                    onDragEnd={() => { setDraggingField(null); setDragOverField(null); }}
                    onDragOver={() => setDragOverField(f)}
                    onDrop={() => dropOn(f)}
                  />
                ))}
                <div style={{ position: 'relative', marginTop: 4, marginLeft: 16, alignSelf: 'flex-start' }}>
                  <button
                    ref={addFieldBtnRef}
                    type="button"
                    disabled={removedFields.length === 0}
                    onClick={() => setAddFieldOpen((v) => !v)}
                    style={{
                      height: 28,
                      padding: '0 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: 3,
                      background: surface,
                      color: removedFields.length === 0 ? token('color.text.disabled', 'var(--ds-text-disabled)') : textSubtle,
                      font: 'inherit',
                      fontWeight: 500,
                      cursor: removedFields.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => { if (removedFields.length > 0) e.currentTarget.style.background = hoverNeutral; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = surface; }}
                  >
                    <TinyIcon><AddIcon label="" size="small" /></TinyIcon>
                    Add field
                  </button>
                  {addFieldOpen && removedFields.length > 0 && addFieldBtnRef.current && createPortal(
                    <div
                      ref={addFieldMenuRef}
                      role="menu" data-canonical-filter-popup="true"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'fixed',
                        top: addFieldBtnRef.current.getBoundingClientRect().bottom + 4,
                        left: addFieldBtnRef.current.getBoundingClientRect().left,
                        minWidth: 180,
                        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
                        border: `1px solid ${borderSubtle}`,
                        borderRadius: 6,
                        boxShadow: 'var(--ds-shadow-raised)',
                        padding: '4px 0',
                        zIndex: 10001,
                        font: token('font.body'),
                      }}
                    >
                      {removedFields.map((f) => (
                        <EllipsisMenuItem key={f} label={f} enabled onClick={() => restoreField(f)} />
                      ))}
                    </div>,
                    document.body,
                  )}
                </div>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <button
                  type="button"
                  disabled={activeFieldCount === 0}
                  onClick={onClearAll}
                  style={{
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    color: activeFieldCount > 0 ? blue : textDisabled,
                    cursor: activeFieldCount > 0 ? 'pointer' : 'not-allowed',
                    font: 'inherit',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!selectedField ? (
                <div style={{ padding: '16px 16px', color: textSubtle, fontSize: 'var(--ds-font-size-400)' }}>
                  Select a field to start creating a filter.
                </div>
              ) : (() => {
                const fieldKey = fieldKeyFor(selectedField);
                if (!fieldKey) return null;
                return (
                  <FieldEditor
                    fieldKey={fieldKey}
                    fieldLabel={selectedField}
                    selected={effValue[fieldKey]}
                    onToggle={(id) => toggleSelection(fieldKey, id)}
                    onClearField={() => clearField(fieldKey)}
                    statusOptions={statusOptions}
                    assigneeOptions={effectiveAssigneeOptions}
                    labelOptions={labelOptions}
                    workTypeOptions={contextWorkTypeOptions}
                    priorityOptions={priorityOptions}
                    severityOptions={severityOptions}
                    scopeType={scopeType}
                    scopeKey={scopeKey}
                  />
                );
              })()}
            </div>
          </div>
          )}

        </div>,
        document.body,
      )}

      {ellipsisOpenFor && ellipsisPos && createPortal(
        (() => {
          const section = sectionOf(ellipsisOpenFor);
          const list = section === 'pinned' ? pinnedFields : unpinnedFields;
          const i = list.indexOf(ellipsisOpenFor);
          const canUp = i > 0;
          const canDown = i >= 0 && i < list.length - 1;
          const items: Array<{ key: 'top'|'up'|'down'|'bottom'; label: string; enabled: boolean }> = [
            { key: 'top',    label: 'Move to top',    enabled: canUp },
            { key: 'up',     label: 'Move up',        enabled: canUp },
            { key: 'down',   label: 'Move down',      enabled: canDown },
            { key: 'bottom', label: 'Move to bottom', enabled: canDown },
          ];
          return (
            <div
              ref={ellipsisMenuRef}
              role="menu" data-canonical-filter-popup="true"
              style={{
                position: 'fixed',
                top: ellipsisPos.top,
                left: ellipsisPos.left,
                minWidth: 180,
                background: token('elevation.surface.overlay', 'var(--ds-surface)'),
                border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                borderRadius: 6,
                boxShadow: 'var(--ds-shadow-raised)',
                padding: '4px 0',
                zIndex: 10000,
                font: token('font.body'),
              }}
            >
              {items.map((it) => (
                <EllipsisMenuItem
                  key={it.key}
                  label={it.label}
                  enabled={it.enabled}
                  onClick={() => {
                    if (!it.enabled) return;
                    const target = ellipsisOpenFor;
                    setEllipsisOpenFor(null);
                    if (target) moveWithinSection(target, it.key);
                  }}
                />
              ))}
              <div style={{ height: 1, background: token('color.border', 'var(--ds-border)'), margin: '4px 0' }} />
              <EllipsisMenuItem
                label="Remove filter"
                enabled
                onClick={() => {
                  const target = ellipsisOpenFor;
                  setEllipsisOpenFor(null);
                  if (target) removeField(target);
                }}
              />
            </div>
          );
        })(),
        document.body,
      )}
    </>
  );
}

function EllipsisMenuItem({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textDisabled = token('color.text.disabled', 'var(--ds-text-disabled)');
  return (
    <div
      role="menuitem"
      aria-disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      onMouseEnter={() => enabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 32,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 500,
        cursor: enabled ? 'pointer' : 'not-allowed',
        color: enabled ? textPrimary : textDisabled,
        background: hover ? hoverNeutral : 'transparent',
      }}
    >
      {label}
    </div>
  );
}

/* ───── Subcomponents ───── */

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const blue = token('color.text.selected', 'var(--ds-link)');
  const blueBg = token('color.background.selected', 'var(--ds-background-selected)');
  const blueBorder = token('color.border.selected', 'var(--ds-link)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const textPrimary = token('color.text', 'var(--ds-text)');

  let background: string = 'transparent';
  if (active) background = blueBg;
  else if (hover) background = hoverNeutral;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 28,
        padding: '0 12px',
        border: `1px solid ${active ? blueBorder : 'transparent'}`,
        background,
        color: active ? blue : textPrimary,
        font: 'inherit',
        fontWeight: 500,
        borderRadius: 4,
        cursor: 'pointer',
        filter: active && hover ? 'brightness(0.97)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function FieldItem({
  label,
  active,
  pinned,
  isDragOver,
  selectionCount,
  onClick,
  onTogglePin,
  onOpenEllipsis,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  label: string;
  active: boolean;
  pinned: boolean;
  isDragOver: boolean;
  selectionCount: number;
  onClick: () => void;
  onTogglePin: () => void;
  onOpenEllipsis: (rect: DOMRect) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  const [hover, setHover] = useState(false);
  const blue = token('color.text.selected', 'var(--ds-link)');
  const blueBg = token('color.background.selected', 'var(--ds-background-selected)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');

  let background: string = 'transparent';
  if (active) background = blueBg;
  else if (hover) background = hoverNeutral;

  // Rod ONLY on active state (not on hover).
  const showRod = active;
  // Grip visible on active OR hover. Color blue when active.
  const showGrip = active || hover;
  // Pin + ellipsis only on hover.
  const showHoverActions = hover;
  const gripColor = active ? blue : textSubtle;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Grip lives OUTSIDE the row background. Width pinned so layout doesn't
          shift between hidden and visible states. */}
      <span
        style={{
          width: 14,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          visibility: showGrip ? 'visible' : 'hidden',
          color: gripColor,
        }}
      >
        <Tooltip content="Drag to reorder" position="top">
          <span
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', label);
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'grab',
              color: 'inherit',
            }}
          >
            <TinyIcon><DragHandleIcon label="Drag to reorder" size="small" /></TinyIcon>
          </span>
        </Tooltip>
      </span>

      {/* Inner row — carries bg, rod, click target, label, pin, ellipsis. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          height: 32,
          padding: '0 6px 0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 500,
          cursor: 'pointer',
          borderRadius: 3,
          background,
          color: active || hover ? blue : textPrimary,
          outline: isDragOver ? `2px solid ${token('color.border.selected', 'var(--ds-link)')}` : 'none',
          outlineOffset: isDragOver ? -2 : 0,
        }}
      >
        {showRod && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: token('color.background.selected.bold', 'var(--ds-link)'),
            }}
          />
        )}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {!showHoverActions && selectionCount > 0 && (
          <span
            style={{
              minWidth: 22,
              height: 18,
              padding: '0 6px',
              borderRadius: 3,
              background: token('color.background.accent.blue.subtle', 'var(--ds-background-information-bold)'),
              color: token('color.text', 'var(--ds-text)'),
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectionCount}
          </span>
        )}
        {showHoverActions && (
          <>
            <Tooltip content={pinned ? 'Unpin field' : 'Pin field'} position="top">
              <button
                type="button"
                aria-label={pinned ? 'Unpin field' : 'Pin field'}
                onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
                style={{ ...iconBtnStyle(), color: token('color.text', 'var(--ds-text, var(--ds-text))') }}
              >
                <TinyIcon>
                  {pinned
                    ? <PinFilledIcon label="" size="small" color="color.text" />
                    : <PinIcon label="" size="small" color="color.text" />}
                </TinyIcon>
              </button>
            </Tooltip>
            <button
              type="button"
              aria-label="More actions"
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                onOpenEllipsis(rect);
              }}
              style={iconBtnStyle()}
            >
              <TinyIcon><MoreIcon label="" size="small" /></TinyIcon>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Visually shrinks an Atlaskit icon (smallest built-in size is 16px) to 12px
// via CSS transform on a fixed 12×12 wrapper. Used by grip, pin, ellipsis.
function TinyIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 12,
        height: 12,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'scale(0.75)',
          transformOrigin: 'center',
        }}
      >
        {children}
      </span>
    </span>
  );
}

function iconBtnStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    padding: 0,
    background: 'transparent',
    border: 0,
    borderRadius: 3,
    cursor: 'pointer',
    color: 'inherit',
  };
}

function SavedSearchInput({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const blueBorder = token('color.border.selected', 'var(--ds-link)');
  const borderInput = token('color.border.input', 'var(--ds-text-disabled)');

  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          pointerEvents: 'none',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        }}
      >
        <SearchIcon label="" />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search filters"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: 32,
          padding: '0 8px 0 32px',
          border: `1px solid ${focused ? blueBorder : borderInput}`,
          borderRadius: 3,
          outline: 'none',
          font: 'inherit',
          color: token('color.text', 'var(--ds-text)'),
          background: token('elevation.surface', 'var(--ds-surface)'),
          boxShadow: focused ? `0 0 0 1px ${blueBorder}` : 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function SavedSection({
  title,
  items,
  selected,
  onSelect,
  showStar,
}: {
  title: string;
  items: string[];
  selected: string | null;
  onSelect: (v: string) => void;
  showStar?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          padding: '4px 12px',
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 700,
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <div
          style={{
            padding: '4px 12px',
            fontSize: 'var(--ds-font-size-200)',
            color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
          }}
        >
          No filters
        </div>
      ) : (
        items.map((name) => (
          <SavedItem
            key={name}
            name={name}
            active={selected === name}
            onClick={() => onSelect(name)}
            showStar={showStar}
          />
        ))
      )}
    </div>
  );
}

function SavedItem({
  name,
  active,
  onClick,
  showStar,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  showStar?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const blue = token('color.text.selected', 'var(--ds-link)');
  const blueBg = token('color.background.selected', 'var(--ds-background-selected)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const textPrimary = token('color.text', 'var(--ds-text)');

  let background: string = 'transparent';
  if (active) background = blueBg;
  else if (hover) background = hoverNeutral;

  const showRod = active || hover;

  return (
    <div
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        height: 32,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 500,
        background,
        color: active || hover ? blue : textPrimary,
      }}
    >
      {showRod && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: token('color.background.selected.bold', 'var(--ds-link)'),
          }}
        />
      )}
      <span>{name}</span>
      {showStar && hover && (
        <span
          title="Star filter"
          aria-label="Star filter"
          style={{
            display: 'inline-flex',
            color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <StarIcon label="Star filter" size="small" />
        </span>
      )}
    </div>
  );
}

function FeedbackButton() {
  const [hover, setHover] = useState(false);
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 6px',
        background: hover ? hoverNeutral : 'transparent',
        border: 0,
        cursor: 'pointer',
        color: 'inherit',
        fontSize: 'var(--ds-font-size-200)',
        fontFamily: 'inherit',
        borderRadius: 3,
      }}
    >
      <MegaphoneIcon label="" />
      Give feedback
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 22,
        height: 20,
        padding: '0 6px',
        background: token('color.background.neutral', 'var(--ds-background-neutral)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 3,
        fontSize: 'var(--ds-font-size-100)',
        fontFamily: 'inherit',
        fontWeight: 600,
        color: token('color.text', 'var(--ds-text)'),
      }}
    >
      {children}
    </span>
  );
}

/* ───── Advanced tab body — chip-based clause builder ─────
 * Same data model as Basic (CanonicalFilterValue + *Exclude arrays).
 * Each clause = chip with three segments: field label / operator /
 * value picker. Adding a clause = activating a field via "+ Add filter".
 * Removing a clause = clearing both include + exclude arrays of that field.
 *
 * Two-way binding with Basic + JQL is automatic — they all share the same
 * canonical value state. Switch tabs to see the same predicate rendered
 * three ways.
 */

const ADVANCED_FIELDS: Array<{ key: keyof CanonicalFilterValue; label: string }> = [
  { key: 'parent',   label: 'Parent' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status',   label: 'Status' },
  { key: 'labels',   label: 'Labels' },
  { key: 'workType', label: 'Work type' },
  { key: 'priority', label: 'Priority' },
  { key: 'severity', label: 'Severity' },
];

function excludeKeyOf(field: keyof CanonicalFilterValue): keyof CanonicalFilterValue {
  switch (field) {
    case 'parent':   return 'parentExclude';
    case 'assignee': return 'assigneeExclude';
    case 'status':   return 'statusExclude';
    case 'labels':   return 'labelsExclude';
    case 'workType': return 'workTypeExclude';
    case 'priority': return 'priorityExclude';
    case 'severity': return 'severityExclude';
    default:         return field;
  }
}

function clauseSummary(values: string[]): string {
  if (values.length === 0) return 'Select…';
  if (values.length === 1) {
    const v = values[0];
    return v === NO_PARENT_SENTINEL ? 'No parent' : v;
  }
  return `${values.length} selected`;
}

function AdvancedTabBody({
  value,
  onChange,
  scopeKey,
  statusOptions,
  assigneeOptions,
  labelOptions,
  workTypeOptions,
  priorityOptions,
  severityOptions,
  projectSelections,
  onProjectSelectionsChange,
}: {
  value: CanonicalFilterValue;
  onChange: (next: CanonicalFilterValue) => void;
  scopeKey?: string;
  statusOptions: CanonicalStatusOption[];
  assigneeOptions: CanonicalAssigneeOption[];
  labelOptions: string[];
  workTypeOptions: CanonicalWorkTypeOption[];
  priorityOptions: CanonicalPriorityOption[];
  severityOptions: CanonicalSeverityOption[];
  projectSelections: string[];
  onProjectSelectionsChange: (next: string[]) => void;
}) {
  // Project name + avatar lookup so chips show display names and option
  // rows show colored project icons.
  const [projectMetaMap, setProjectMetaMap] = useState<Record<string, { name: string; avatarUrl: string | null; color: string | null }>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('ph_jira_projects')
        .select('project_key, name, avatar_url, color');
      if (cancelled) return;
      if (error || !data) return;
      const m: Record<string, { name: string; avatarUrl: string | null; color: string | null }> = {};
      (data as Array<{ project_key: string; name: string; avatar_url: string | null; color: string | null }>).forEach((r) => {
        m[r.project_key] = { name: r.name || r.project_key, avatarUrl: r.avatar_url, color: r.color };
      });
      setProjectMetaMap(m);
    })();
    return () => { cancelled = true; };
  }, []);
  const projectNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const k of Object.keys(projectMetaMap)) m[k] = projectMetaMap[k].name;
    return m;
  }, [projectMetaMap]);
  const borderSubtle = token('color.border', 'var(--ds-border)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');
  const surface = token('elevation.surface', 'var(--ds-surface)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');

  const [addOpen, setAddOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Which fields have at least one include or exclude value → render a chip.
  const activeFields = ADVANCED_FIELDS.filter((f) => {
    const inc = value[f.key]?.length ?? 0;
    const exc = value[excludeKeyOf(f.key)]?.length ?? 0;
    return inc + exc > 0;
  });
  const inactiveFields = ADVANCED_FIELDS.filter((f) => !activeFields.includes(f));

  function activateField(field: keyof CanonicalFilterValue) {
    // Empty activation — chip appears with no values; user opens the value
    // picker next. Sentinel: push a placeholder by setting include to []
    // and an inert marker via excludeKey untouched. Use a side state instead
    // since arrays can't carry an "activated-but-empty" flag — we add the
    // field to `pendingChips` so the chip renders even with zero values.
    setPendingChips((p) => p.includes(field) ? p : [...p, field]);
    setAddOpen(false);
  }

  // Pending chips: fields user added via "+ Add filter" but hasn't picked a
  // value for yet. Cleared when the chip's first value lands.
  const [pendingChips, setPendingChips] = useState<Array<keyof CanonicalFilterValue>>([]);
  const renderedFieldKeys = new Set<keyof CanonicalFilterValue>([
    ...activeFields.map((f) => f.key),
    ...pendingChips,
  ]);

  function clearClause(field: keyof CanonicalFilterValue) {
    onChange({
      ...value,
      [field]: [],
      [excludeKeyOf(field)]: [],
    } as CanonicalFilterValue);
    setPendingChips((p) => p.filter((x) => x !== field));
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 8, minHeight: 320 }}>
      {/* Fixed Project chip — Catalyst's CanonicalFilter is project-scoped. */}
      <ProjectChip
        selectedKeys={projectSelections}
        onSelectedKeysChange={onProjectSelectionsChange}
        projectNameMap={projectNameMap}
        projectMetaMap={projectMetaMap}
      />

      {ADVANCED_FIELDS.filter((f) => renderedFieldKeys.has(f.key)).map((f) => (
        <ClauseChip
          key={f.key}
          field={f.key}
          fieldLabel={f.label}
          value={value}
          onValueChange={onChange}
          statusOptions={statusOptions}
          assigneeOptions={assigneeOptions}
          labelOptions={labelOptions}
          workTypeOptions={workTypeOptions}
          priorityOptions={priorityOptions}
          severityOptions={severityOptions}
          scopeKey={scopeKey}
          onRemove={() => clearClause(f.key)}
          autoOpenValuePicker={pendingChips.includes(f.key)}
          onValuesFirstSet={() => setPendingChips((p) => p.filter((x) => x !== f.key))}
        />
      ))}

      <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
        <button
          ref={addBtnRef}
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          disabled={inactiveFields.length === 0}
          style={{
            height: 28,
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            border: `1px solid ${borderSubtle}`,
            borderRadius: 3,
            background: 'transparent',
            color: textSubtle,
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: inactiveFields.length === 0 ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (inactiveFields.length > 0) e.currentTarget.style.background = hoverNeutral;
          }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <TinyIcon><AddIcon label="" size="small" /></TinyIcon>
          Add filter
        </button>
        {addOpen && (
          <AddFilterMenu
            anchorRef={addBtnRef}
            options={inactiveFields}
            onSelect={(k) => activateField(k)}
            onClose={() => setAddOpen(false)}
          />
        )}
      </div>

      <div style={{ flex: 1 }} />
    </div>
  );
}

function ProjectChip({
  selectedKeys,
  onSelectedKeysChange,
  projectNameMap,
  projectMetaMap,
}: {
  selectedKeys: string[];
  onSelectedKeysChange: (next: string[]) => void;
  projectNameMap: Record<string, string>;
  projectMetaMap: Record<string, { name: string; avatarUrl: string | null; color: string | null }>;
}) {
  const [hover, setHover] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [operator, setOperator] = useState<'=' | '!='>('=');
  const anchorRef = useRef<HTMLDivElement>(null);
  const opAnchorRef = useRef<HTMLButtonElement>(null);
  const borderSubtle = token('color.border', 'var(--ds-border)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');
  const surface = token('elevation.surface', 'var(--ds-surface)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const blue = token('color.text.selected', 'var(--ds-link)');
  const isActive = popOpen || opOpen;
  // Mid pill + right segment only render when the user has selections OR
  // explicitly touched the operator (non-default). Clearing resets both.
  const hasContent = selectedKeys.length > 0 || operator !== '=';

  function toggleProject(k: string) {
    onSelectedKeysChange(
      selectedKeys.includes(k) ? selectedKeys.filter((x) => x !== k) : [...selectedKeys, k]
    );
  }

  return (
    <div
      ref={anchorRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { setOpOpen(false); setPopOpen(true); }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        position: 'relative',
        gap: 8,
        height: 40,
        padding: '0 10px 0 14px',
        minWidth: 400,
        border: `1px solid ${isActive ? token('color.border.selected', 'var(--ds-link)') : borderSubtle}`,
        borderRadius: 3,
        background: isActive ? token('color.background.selected', 'var(--ds-background-selected)') : hover ? hoverNeutral : surface,
        fontSize: 'var(--ds-font-size-300)',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: isActive ? blue : textPrimary, fontWeight: 600 }}>Project</span>

      {hasContent && (
        <button
          ref={opAnchorRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPopOpen(false);
            setOpOpen((v) => !v);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 28,
            padding: '0 6px 0 10px',
            fontSize: 'var(--ds-font-size-400)',
            fontFamily: 'inherit',
            fontWeight: 500,
            border: `1px solid ${borderSubtle}`,
            borderRadius: 3,
            background: surface,
            color: textPrimary,
            cursor: 'pointer',
          }}
        >
          {operator}
          <ChevronDownIcon label="" size="small" />
        </button>
      )}

      {hasContent && (
        <FirstAndMore
          values={selectedKeys}
          resolveLabel={(k) => projectNameMap[k] || k}
          activeColor={isActive ? blue : undefined}
        />
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? blue : textSubtle, marginLeft: 'auto' }}>
        <ChevronDownIcon label="" size="small" />
      </span>

      {opOpen && (
        <OperatorMenu
          current={operator}
          anchorRef={opAnchorRef}
          onSelect={(op) => { setOperator(op); setOpOpen(false); }}
          onClose={() => setOpOpen(false)}
        />
      )}
      {popOpen && (
        <ProjectPickerPopover
          anchorRef={anchorRef}
          operator={operator}
          onSetOperator={setOperator}
          selectedKeys={selectedKeys}
          onToggle={toggleProject}
          onClearSelection={() => { onSelectedKeysChange([]); setOperator('='); }}
          onClose={() => setPopOpen(false)}
          projectMetaMap={projectMetaMap}
        />
      )}
    </div>
  );
}

function ProjectAvatar({
  avatarUrl,
  color,
  name,
}: {
  avatarUrl: string | null;
  color: string | null;
  name: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: 3,
        background: color || 'var(--ds-link)',
        color: 'var(--ds-text-inverse)',
        fontSize: 'var(--ds-font-size-50)',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

function FirstAndMore({
  values,
  resolveLabel,
  activeColor,
}: {
  values: string[];
  resolveLabel: (id: string) => string;
  activeColor?: string;
}) {
  if (values.length === 0) return null;
  const first = resolveLabel(values[0]);
  const extra = values.length - 1;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{
        color: activeColor || token('color.text', 'var(--ds-text)'),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 180,
      }}>
        {first}
      </span>
      {extra > 0 && (
        <span style={{
          padding: '0 6px',
          minWidth: 22,
          height: 18,
          borderRadius: 3,
          background: token('color.background.accent.blue.subtle', 'var(--ds-background-information-bold)'),
          color: token('color.text', 'var(--ds-text)'),
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

function ProjectPickerPopover({
  anchorRef,
  operator,
  onSetOperator,
  selectedKeys,
  onToggle,
  onClearSelection,
  onClose,
  projectMetaMap,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  operator: '=' | '!=';
  onSetOperator: (op: '=' | '!=') => void;
  selectedKeys: string[];
  onToggle: (k: string) => void;
  onClearSelection: () => void;
  onClose: () => void;
  projectMetaMap: Record<string, { name: string; avatarUrl: string | null; color: string | null }>;
}) {
  const [headerOpOpen, setHeaderOpOpen] = useState(false);
  const headerOpRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  // Build the row list from the parent-owned meta map so name + avatar
  // come from a single source of truth.
  const rows = useMemo(() => Object.keys(projectMetaMap)
    .map((k) => ({ key: k, name: projectMetaMap[k].name, avatarUrl: projectMetaMap[k].avatarUrl, color: projectMetaMap[k].color }))
    .sort((a, b) => a.name.localeCompare(b.name)),
    [projectMetaMap],
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      // Sub-menus + sibling popovers live in document.body via createPortal.
      // Their DOM isn't inside this popover's ref, so a click on them would
      // close us. Treat any click on another canonical-filter portal as
      // "still inside" — the canonical filter owns those portals.
      const tgt = e.target as Element | null;
      if (tgt?.closest?.('[data-canonical-filter-popup="true"]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, anchorRef]);

  if (!anchorRef.current) return null;
  const rect = anchorRef.current.getBoundingClientRect();
  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.key.toLowerCase().includes(q)) : rows;
  const borderSubtle = token('color.border', 'var(--ds-border)');

  return createPortal(
    <div
      ref={ref}
      role="dialog" data-canonical-filter-popup="true"
      aria-label="Project picker"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 360,
        maxHeight: 420,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        border: `1px solid ${borderSubtle}`,
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-raised)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ padding: 8, borderBottom: `1px solid ${borderSubtle}` }}>
        <button
          ref={headerOpRef}
          type="button"
          onClick={() => setHeaderOpOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: token('color.background.neutral', 'var(--ds-background-neutral)'),
            border: 0,
            borderRadius: 3,
            color: token('color.text', 'var(--ds-text)'),
            fontSize: 'var(--ds-font-size-300)',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span>Project {operator === '=' ? '= (equals)' : '!= (not equals)'}</span>
          <ChevronDownIcon label="" size="small" />
        </button>
      </div>
      {headerOpOpen && (
        <OperatorMenu
          current={operator}
          anchorRef={headerOpRef}
          onSelect={(op) => { onSetOperator(op); setHeaderOpOpen(false); }}
          onClose={() => setHeaderOpOpen(false)}
        />
      )}
      <div style={{ padding: 8 }}>
        <FilterSearchInput
          inputRef={searchInputRef}
          value={search}
          onChange={setSearch}
          placeholder="Search projects"
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
            No matches
          </div>
        ) : filtered.map((r) => (
          <OptionRow
            key={r.key}
            label={r.name}
            checked={selectedKeys.includes(r.key)}
            onClick={() => onToggle(r.key)}
            icon={<ProjectAvatar avatarUrl={r.avatarUrl} color={r.color} name={r.name} />}
          />
        ))}
      </div>
      <div
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          disabled={selectedKeys.length === 0}
          onClick={onClearSelection}
          style={{
            padding: 0,
            border: 0,
            background: 'transparent',
            // Always-gray text per spec — color does not flip blue when enabled.
            color: token('color.text.subtle', 'var(--ds-text-subtle)'),
            cursor: selectedKeys.length > 0 ? 'pointer' : 'not-allowed',
            opacity: selectedKeys.length > 0 ? 1 : 0.6,
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          Clear selection
        </button>
      </div>
    </div>,
    document.body,
  );
}

function ClauseChip({
  field,
  fieldLabel,
  value,
  onValueChange,
  statusOptions,
  assigneeOptions,
  labelOptions,
  workTypeOptions,
  priorityOptions,
  severityOptions,
  scopeKey,
  onRemove,
  autoOpenValuePicker,
  onValuesFirstSet,
}: {
  field: keyof CanonicalFilterValue;
  fieldLabel: string;
  value: CanonicalFilterValue;
  onValueChange: (next: CanonicalFilterValue) => void;
  statusOptions: CanonicalStatusOption[];
  assigneeOptions: CanonicalAssigneeOption[];
  labelOptions: string[];
  workTypeOptions: CanonicalWorkTypeOption[];
  priorityOptions: CanonicalPriorityOption[];
  severityOptions: CanonicalSeverityOption[];
  scopeKey?: string;
  onRemove: () => void;
  autoOpenValuePicker?: boolean;
  onValuesFirstSet?: () => void;
}) {
  const exKey = excludeKeyOf(field);
  const includeVals = value[field] as string[];
  const excludeVals = value[exKey] as string[];
  const operator: '=' | '!=' = excludeVals.length > 0 && includeVals.length === 0 ? '!=' : '=';

  const [opOpen, setOpOpen] = useState(false);
  const [valOpen, setValOpen] = useState(false);
  const opAnchorRef = useRef<HTMLButtonElement>(null);
  const valAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-open value picker when chip was just added (and has no values yet).
  useEffect(() => {
    if (autoOpenValuePicker && includeVals.length === 0 && excludeVals.length === 0) {
      setValOpen(true);
    }
  }, [autoOpenValuePicker, includeVals.length, excludeVals.length]);

  // Once any value lands, notify parent so the pending-chip flag clears.
  useEffect(() => {
    if (includeVals.length > 0 || excludeVals.length > 0) {
      onValuesFirstSet?.();
    }
  }, [includeVals.length, excludeVals.length, onValuesFirstSet]);

  function setOperator(next: '=' | '!=') {
    setOpOpen(false);
    // Swap the array — preserve selected values across operator change.
    if (next === operator) return;
    const current = includeVals.length ? includeVals : excludeVals;
    onValueChange({
      ...value,
      [field]: next === '=' ? current : [],
      [exKey]: next === '!=' ? current : [],
    } as CanonicalFilterValue);
  }

  function toggleValue(id: string) {
    const target = operator === '=' ? field : exKey;
    const list = value[target] as string[];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    onValueChange({ ...value, [target]: next } as CanonicalFilterValue);
  }

  function clearValues() {
    onValueChange({ ...value, [field]: [], [exKey]: [] } as CanonicalFilterValue);
  }

  const borderSubtle = token('color.border', 'var(--ds-border)');
  const blueBorder = token('color.border.selected', 'var(--ds-link)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');
  const surface = token('elevation.surface', 'var(--ds-surface)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const [hover, setHover] = useState(false);
  const isActive = valOpen || opOpen;
  const activeValues = operator === '=' ? includeVals : excludeVals;
  // Display-name resolver per field type.
  const resolveLabel = (id: string): string => {
    if (id === NO_PARENT_SENTINEL) return 'No parent';
    switch (field) {
      case 'status':   return statusOptions.find((s) => s.value === id)?.label ?? id;
      case 'assignee': return assigneeOptions.find((a) => a.id === id)?.label ?? id;
      case 'workType': return workTypeOptions.find((w) => w.id === id)?.label ?? id;
      case 'priority': return priorityOptions.find((p) => p.id === id)?.label ?? id;
      case 'severity': return severityOptions.find((s) => s.id === id)?.label ?? id;
      default:         return id;
    }
  };

  // Background: white idle, gray on hover, blue-tinted when active.
  let chipBg: string = surface;
  if (isActive) chipBg = token('color.background.selected', 'var(--ds-background-selected, var(--ds-background-information))');
  else if (hover) chipBg = hoverNeutral;

  return (
    <div
      ref={valAnchorRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { setOpOpen(false); setValOpen(true); }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        position: 'relative',
        gap: 8,
        height: 40,
        padding: '0 10px 0 14px',
        minWidth: 400,
        border: `1px solid ${isActive ? blueBorder : borderSubtle}`,
        background: chipBg,
        borderRadius: 3,
        fontSize: 'var(--ds-font-size-300)',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {/* LEFT — field label (bold) */}
      <span style={{ color: textPrimary, fontWeight: 600 }}>{fieldLabel}</span>

      {/* MIDDLE — operator pill with its own inset border */}
      <button
        ref={opAnchorRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          // Mid pill is mutually exclusive with value picker — close it.
          setValOpen(false);
          setOpOpen((v) => !v);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 28,
          padding: '0 6px 0 10px',
          fontSize: 'var(--ds-font-size-400)',
          fontFamily: 'inherit',
          fontWeight: 500,
          border: `1px solid ${borderSubtle}`,
          borderRadius: 3,
          background: surface,
          color: textPrimary,
          cursor: 'pointer',
        }}
      >
        {operator}
        <ChevronDownIcon label="" size="small" />
      </button>

      {/* RIGHT — first value + "+N" badge for remaining */}
      <FirstAndMore values={activeValues} resolveLabel={resolveLabel} />

      {/* Trailing chevron — indicates the chip opens a dropdown */}
      <span style={{ display: 'inline-flex', alignItems: 'center', color: textSubtle, marginLeft: 'auto' }}>
        <ChevronDownIcon label="" size="small" />
      </span>

      {/* Remove (×) — visible on hover only */}
      {hover && (
        <span
          role="button"
          aria-label="Remove clause"
          title="Remove clause"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            display: 'inline-flex', alignItems: 'center',
            color: textSubtle, padding: 0, borderRadius: 3,
            marginLeft: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden focusable="false">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      )}

      {opOpen && (
        <OperatorMenu
          current={operator}
          anchorRef={opAnchorRef}
          onSelect={setOperator}
          onClose={() => setOpOpen(false)}
        />
      )}

      {valOpen && (
        <ValuePickerPopover
          anchorRef={valAnchorRef}
          field={field}
          fieldLabel={fieldLabel}
          operator={operator}
          onSetOperator={setOperator}
          selected={operator === '=' ? includeVals : excludeVals}
          onToggle={toggleValue}
          onClear={clearValues}
          onClose={() => setValOpen(false)}
          statusOptions={statusOptions}
          assigneeOptions={assigneeOptions}
          labelOptions={labelOptions}
          workTypeOptions={workTypeOptions}
          priorityOptions={priorityOptions}
          severityOptions={severityOptions}
          scopeKey={scopeKey}
        />
      )}
    </div>
  );
}

function OperatorMenu({
  current,
  anchorRef,
  onSelect,
  onClose,
}: {
  current: '=' | '!=';
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (op: '=' | '!=') => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      // Sub-menus + sibling popovers live in document.body via createPortal.
      // Their DOM isn't inside this popover's ref, so a click on them would
      // close us. Treat any click on another canonical-filter portal as
      // "still inside" — the canonical filter owns those portals.
      const tgt = e.target as Element | null;
      if (tgt?.closest?.('[data-canonical-filter-popup="true"]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, anchorRef]);

  if (!anchorRef.current) return null;
  const rect = anchorRef.current.getBoundingClientRect();
  return createPortal(
    <div
      ref={ref}
      role="menu" data-canonical-filter-popup="true"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: 160,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-raised)',
        padding: '4px 0',
        zIndex: 10000,
        fontFamily: 'inherit',
      }}
    >
      <EllipsisMenuItem label="= (equals)" enabled onClick={() => { onSelect('='); }} />
      <EllipsisMenuItem label="!= (not equals)" enabled onClick={() => { onSelect('!='); }} />
    </div>,
    document.body,
  );
}

function AddFilterMenu({
  anchorRef,
  options,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  options: Array<{ key: keyof CanonicalFilterValue; label: string }>;
  onSelect: (k: keyof CanonicalFilterValue) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, anchorRef]);
  if (!anchorRef.current) return null;
  const rect = anchorRef.current.getBoundingClientRect();
  return createPortal(
    <div
      ref={ref}
      role="menu" data-canonical-filter-popup="true"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: 180,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-raised)',
        padding: '4px 0',
        zIndex: 10001,
        fontFamily: 'inherit',
      }}
    >
      {options.length === 0 ? (
        <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
          All fields already added
        </div>
      ) : options.map((o) => (
        <EllipsisMenuItem
          key={o.key}
          label={o.label}
          enabled
          onClick={() => onSelect(o.key)}
        />
      ))}
    </div>,
    document.body,
  );
}

function ValuePickerPopover({
  anchorRef,
  field,
  fieldLabel,
  operator,
  onSetOperator,
  selected,
  onToggle,
  onClear,
  onClose,
  statusOptions,
  assigneeOptions,
  labelOptions,
  workTypeOptions,
  priorityOptions,
  severityOptions,
  scopeKey,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  field: keyof CanonicalFilterValue;
  fieldLabel: string;
  operator: '=' | '!=';
  onSetOperator: (op: '=' | '!=') => void;
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  statusOptions: CanonicalStatusOption[];
  assigneeOptions: CanonicalAssigneeOption[];
  labelOptions: string[];
  workTypeOptions: CanonicalWorkTypeOption[];
  priorityOptions: CanonicalPriorityOption[];
  severityOptions: CanonicalSeverityOption[];
  scopeKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headerOpRef = useRef<HTMLButtonElement>(null);
  const [headerOpOpen, setHeaderOpOpen] = useState(false);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      // Sub-menus + sibling popovers live in document.body via createPortal.
      // Their DOM isn't inside this popover's ref, so a click on them would
      // close us. Treat any click on another canonical-filter portal as
      // "still inside" — the canonical filter owns those portals.
      const tgt = e.target as Element | null;
      if (tgt?.closest?.('[data-canonical-filter-popup="true"]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, anchorRef]);

  if (!anchorRef.current) return null;
  const rect = anchorRef.current.getBoundingClientRect();

  // Header dropdown ("Field = (equals)") for parity with the screenshot.
  const opLabel = operator === '=' ? '= (equals)' : '!= (not equals)';

  // Routes to the existing FieldEditor for value list rendering.
  const fieldKeyAsBasic = field === 'parentExclude' ? 'parent'
    : field === 'assigneeExclude' ? 'assignee'
    : field === 'statusExclude' ? 'status'
    : field === 'labelsExclude' ? 'labels'
    : field === 'workTypeExclude' ? 'workType'
    : field === 'priorityExclude' ? 'priority'
    : field === 'severityExclude' ? 'severity'
    : field;

  return createPortal(
    <div
      ref={ref}
      role="dialog" data-canonical-filter-popup="true"
      aria-label={`${fieldLabel} values`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 320,
        maxHeight: 420,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-raised)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ padding: 8, borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}` }}>
        <button
          ref={headerOpRef}
          type="button"
          onClick={() => setHeaderOpOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: token('color.background.neutral', 'var(--ds-background-neutral)'),
            border: 0,
            borderRadius: 3,
            color: token('color.text', 'var(--ds-text)'),
            fontSize: 'var(--ds-font-size-300)',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span>{fieldLabel} {opLabel}</span>
          <ChevronDownIcon label="" size="small" />
        </button>
      </div>
      {headerOpOpen && (
        <OperatorMenu
          current={operator}
          anchorRef={headerOpRef}
          onSelect={(op) => { onSetOperator(op); setHeaderOpOpen(false); }}
          onClose={() => setHeaderOpOpen(false)}
        />
      )}
      <FieldEditor
        fieldKey={fieldKeyAsBasic as keyof CanonicalFilterValue}
        fieldLabel={fieldLabel}
        selected={selected}
        onToggle={onToggle}
        onClearField={onClear}
        statusOptions={statusOptions}
        assigneeOptions={assigneeOptions}
        labelOptions={labelOptions}
        workTypeOptions={workTypeOptions}
        priorityOptions={priorityOptions}
        severityOptions={severityOptions}
        scopeType={undefined}
        scopeKey={scopeKey}
      />
    </div>,
    document.body,
  );
}

/* ───── JQL tab body ─────
 * Two-layer editor (textarea on top of <pre> highlight overlay) — same trick
 * react-syntax-highlighter-style editors use to keep the native textarea
 * caret + selection behavior while painting tokens behind. Lightweight
 * regex tokenizer; we do not validate JQL grammatically here — only color.
 * Validity is reported by `translate()` at run-time. */
const JQL_KEYWORDS = /\b(AND|OR|NOT|ORDER\s+BY|ASC|DESC|IN|IS|EMPTY|NULL|WAS|CHANGED|BY|ON|AFTER|BEFORE|DURING|FROM|TO)\b/gi;
const JQL_FIELDS = /\b(project|parent|issuetype|status|assignee|reporter|priority|created|updated|duedate|labels|fixVersion|sprint|resolution)\b/gi;
const JQL_FUNCS = /\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/g;
const JQL_STRINGS = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
const JQL_NUMBERS = /\b\d+\b/g;
const JQL_OPS = /(<=|>=|!=|=|<|>|~)/g;

interface HighlightSpan {
  start: number;
  end: number;
  color: string;
}

function tokenizeForHighlight(src: string): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  const push = (re: RegExp, color: string) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, color });
    }
  };
  // Order matters: strings first (so keywords inside strings aren't recolored).
  push(JQL_STRINGS, 'var(--ds-background-discovery-bold)');   // purple
  push(JQL_NUMBERS, 'var(--ds-text-danger)');   // orange
  push(JQL_KEYWORDS, 'var(--ds-link)');  // blue
  push(JQL_FIELDS, 'var(--ds-link)');    // blue (same as keywords — Jira parity)
  push(JQL_FUNCS, 'var(--ds-chart-teal-bolder)');     // teal
  push(JQL_OPS, 'var(--ds-text-subtlest)');       // gray
  // Resolve overlaps — keep the FIRST span (by index) that covers a position.
  spans.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));
  const merged: HighlightSpan[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    if (s.start > cursor) merged.push({ start: cursor, end: s.start, color: '' });
    merged.push(s);
    cursor = s.end;
  }
  if (cursor < src.length) merged.push({ start: cursor, end: src.length, color: '' });
  return merged;
}

function JqlTabBody({
  value,
  onChange,
  scopeKey,
}: {
  value: CanonicalFilterValue;
  onChange: (next: CanonicalFilterValue) => void;
  scopeKey?: string;
}) {
  // Seed from the currently-active canonical value so toggling Basic → JQL
  // shows the equivalent query string. Suffix uses `rank` (Jira's named
  // alias for the Rank custom field) instead of the tenant-specific
  // `cf[10019]` id — readable, portable across Jira instances, and matches
  // what a Catalyst user would naturally type. ORDER BY → table sort
  // application is a future phase; for now this is a cosmetic seed.
  const ORDER_SUFFIX = ' ORDER BY rank ASC';
  const canonicalJql = canonicalFilterValueToJql(value, { projectKey: scopeKey });
  const initial =
    (canonicalJql || (scopeKey ? `project = "${scopeKey}"` : ''))
    + ORDER_SUFFIX;
  const [text, setText] = useState<string>(initial);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Keep the highlight overlay scroll-synced to the textarea.
  function onScroll() {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  function run() {
    setLoading(true);
    setErrMsg(null);
    try {
      const parsed = jqlToCanonicalFilterValue(text);
      onChange(parsed);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Invalid JQL');
    } finally {
      // Short timeout so the loader is visible on instant in-memory parses.
      setTimeout(() => setLoading(false), 120);
    }
  }

  const blueBorder = token('color.border.selected', 'var(--ds-link)');
  const borderInput = token('color.border.input', 'var(--ds-text-disabled)');
  const borderSubtle = token('color.border', 'var(--ds-border)');
  const surface = token('elevation.surface', 'var(--ds-surface)');
  const textPrimary = token('color.text', 'var(--ds-text)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');

  const editorHeight = expanded ? 320 : 140;
  const spans = tokenizeForHighlight(text);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, minHeight: 320 }}>
      <div
        style={{
          position: 'relative',
          border: `1px solid ${focused ? blueBorder : borderInput}`,
          borderRadius: 6,
          background: surface,
          boxShadow: focused ? `0 0 0 1px ${blueBorder}` : 'none',
          height: editorHeight,
          transition: 'height 0.15s ease',
        }}
      >
        {/* Highlight overlay */}
        <pre
          ref={preRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            margin: 0,
            padding: '8px 84px 10px 12px',
            fontFamily: '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
            fontSize: 'var(--ds-font-size-300)',
            lineHeight: 1.5,
            color: textPrimary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {spans.map((s, i) => (
            <span key={i} style={{ color: s.color || textPrimary }}>
              {text.slice(s.start, s.end)}
            </span>
          ))}
          {'\n'}
        </pre>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onScroll={onScroll}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              run();
            }
          }}
          spellCheck={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: '8px 84px 10px 12px',
            border: 0,
            outline: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: textPrimary,
            fontFamily: '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
            fontSize: 'var(--ds-font-size-300)',
            lineHeight: 1.5,
            resize: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'auto',
          }}
        />
        {/* Top-right action bar */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Tooltip content={expanded ? 'Collapse editor' : 'Expand editor'} position="top">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse editor' : 'Expand editor'}
              style={{
                width: 24, height: 24, padding: 0, background: 'transparent',
                border: 0, borderRadius: 3, cursor: 'pointer',
                color: textSubtle,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {expanded ? <FullscreenExitIcon label="" size="small" /> : <FullscreenEnterIcon label="" size="small" />}
            </button>
          </Tooltip>
          <Tooltip content="JQL help" position="top">
            <button
              type="button"
              aria-label="JQL help"
              style={{
                width: 24, height: 24, padding: 0, background: 'transparent',
                border: 0, borderRadius: 3, cursor: 'pointer',
                color: textSubtle,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <QuestionIcon label="" size="small" />
            </button>
          </Tooltip>
          <Tooltip content="Run query" position="top">
            <button
              type="button"
              onClick={run}
              disabled={loading}
              aria-label="Run query"
              style={{
                width: 28, height: 28, padding: 0,
                background: surface,
                border: `1px solid ${borderSubtle}`,
                borderRadius: 3,
                cursor: loading ? 'progress' : 'pointer',
                color: textSubtle,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {loading ? <Spinner size="small" /> : <SearchIcon label="" size="small" />}
            </button>
          </Tooltip>
        </div>
      </div>
      <div
        style={{
          marginTop: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--ds-font-size-200)',
          color: textSubtle,
        }}
      >
        <span style={{ color: errMsg ? token('color.text.danger', 'var(--ds-text-danger)') : textSubtle }}>
          {errMsg || ''}
        </span>
        <span>
          <strong style={{ fontWeight: 700, color: textPrimary }}>Enter</strong> to search&nbsp;&nbsp;
          <strong style={{ fontWeight: 700, color: textPrimary }}>Shift+Enter</strong> to add a new line
        </span>
      </div>
    </div>
  );
}

/* ───── FieldEditor (right pane) ───── */

interface FieldEditorProps {
  fieldKey: keyof CanonicalFilterValue;
  fieldLabel: string;
  selected: string[];
  onToggle: (id: string) => void;
  onClearField: () => void;
  statusOptions: CanonicalStatusOption[];
  assigneeOptions: CanonicalAssigneeOption[];
  labelOptions: string[];
  workTypeOptions: CanonicalWorkTypeOption[];
  priorityOptions: CanonicalPriorityOption[];
  severityOptions: CanonicalSeverityOption[];
  scopeType?: string;
  scopeKey?: string;
}

interface Opt {
  id: string;
  /** Used for search-matching and for the visible row when displayNode unset. */
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  /** Optional custom render in place of the plain label text (status pills). */
  displayNode?: React.ReactNode;
}

function FieldEditor(props: FieldEditorProps) {
  const { fieldKey, fieldLabel, selected, onToggle, onClearField } = props;
  const [search, setSearch] = useState('');

  if (fieldKey === 'parent') {
    return (
      <ParentEditor
        fieldLabel={fieldLabel}
        selected={selected}
        onToggle={onToggle}
        onClearField={onClearField}
        scopeKey={props.scopeKey}
      />
    );
  }

  let options: Opt[] = [];
  if (fieldKey === 'status') {
    options = props.statusOptions.map((s) => ({
      id: s.value,
      label: s.label,
      displayNode: <StatusLozenge status={s.label} size="sm" />,
    }));
  } else if (fieldKey === 'assignee') {
    options = props.assigneeOptions.map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.avatarUrl ? (
        <img src={a.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <span style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: 'var(--ds-background-neutral)',
          border: '1px solid var(--ds-border)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, color: 'var(--ds-text-subtle)',
          userSelect: 'none',
        }}>
          {a.label.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
        </span>
      ),
    }));
  } else if (fieldKey === 'labels') {
    options = props.labelOptions.map((l) => ({ id: l, label: l }));
  } else if (fieldKey === 'workType') {
    options = props.workTypeOptions.map((w) => ({ id: w.id, label: w.label, icon: w.icon }));
  } else if (fieldKey === 'priority') {
    options = props.priorityOptions.map((p) => ({ id: p.id, label: p.label, icon: priorityIcon(p.id) }));
  } else if (fieldKey === 'severity') {
    options = props.severityOptions.map((s) => ({ id: s.id, label: s.label, icon: severityIcon(s.id) }));
  }

  const q = search.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <EditorShell
      placeholder={`Search ${fieldLabel.toLowerCase()}`}
      search={search}
      setSearch={setSearch}
      countShown={filtered.length}
      total={options.length}
      selected={selected}
      onClearField={onClearField}
    >
      {filtered.length === 0 ? (
        <div style={{ padding: 12, fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
          No matches
        </div>
      ) : (
        filtered.map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.label}
            sublabel={opt.sublabel}
            icon={opt.icon}
            displayNode={opt.displayNode}
            checked={selected.includes(opt.id)}
            onClick={() => onToggle(opt.id)}
          />
        ))
      )}
    </EditorShell>
  );
}

function ParentEditor({
  fieldLabel,
  selected,
  onToggle,
  onClearField,
  scopeKey,
}: {
  fieldLabel: string;
  selected: string[];
  onToggle: (id: string) => void;
  onClearField: () => void;
  scopeKey?: string;
}) {
  const PAGE = 50;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rows, setRows] = useState<Array<{ key: string; summary: string }>>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setRows([]);
    setOffset(0);
    setReachedEnd(false);
  }, [debouncedSearch, scopeKey]);

  useEffect(() => {
    if (!scopeKey) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('ph_issues')
        .select('issue_key, summary', { count: 'exact' })
        .eq('project_key', scopeKey)
        .order('issue_key', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (debouncedSearch) {
        q = q.or(`issue_key.ilike.%${debouncedSearch}%,summary.ilike.%${debouncedSearch}%`);
      }
      const { data, count, error } = await q;
      if (cancelled) return;
      setLoading(false);
      if (error || !data) return;
      const incoming = (data as Array<{ issue_key: string; summary: string }>).map((r) => ({
        key: r.issue_key,
        summary: r.summary || '',
      }));
      setRows((prev) => (offset === 0 ? incoming : [...prev, ...incoming]));
      if (typeof count === 'number') setTotal(count);
      if (incoming.length < PAGE) setReachedEnd(true);
    })();
    return () => { cancelled = true; };
  }, [scopeKey, offset, debouncedSearch]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const t = e.currentTarget;
    if (loading || reachedEnd) return;
    if (t.scrollHeight - t.scrollTop - t.clientHeight < 80) {
      setOffset(rows.length);
    }
  }

  // +1 accounts for the "No parent" sentinel row.
  const shownPlusSentinel = rows.length + 1;
  const totalPlusSentinel = total + 1;

  return (
    <EditorShell
      placeholder={`Search ${fieldLabel.toLowerCase()}`}
      search={search}
      setSearch={setSearch}
      countShown={shownPlusSentinel}
      total={totalPlusSentinel}
      selected={selected}
      onClearField={onClearField}
      scrollRef={scrollRef}
      onScroll={onScroll}
    >
      <OptionRow
        label="No parent"
        checked={selected.includes(NO_PARENT_SENTINEL)}
        onClick={() => onToggle(NO_PARENT_SENTINEL)}
      />
      {rows.map((r) => (
        <OptionRow
          key={r.key}
          label={r.summary || r.key}
          sublabel={r.key}
          checked={selected.includes(r.key)}
          onClick={() => onToggle(r.key)}
        />
      ))}
      {loading && (
        <div style={{ padding: 8, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
          Loading…
        </div>
      )}
    </EditorShell>
  );
}

function EditorShell({
  placeholder,
  search,
  setSearch,
  countShown,
  total,
  selected,
  onClearField,
  scrollRef,
  onScroll,
  children,
}: {
  placeholder: string;
  search: string;
  setSearch: (v: string) => void;
  countShown: number;
  total: number;
  selected: string[];
  onClearField: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  const borderSubtle = token('color.border', 'var(--ds-border)');
  const blue = token('color.text.selected', 'var(--ds-link)');
  const textDisabled = token('color.text.disabled', 'var(--ds-text-disabled)');
  const textSubtle = token('color.text.subtle', 'var(--ds-text-subtle)');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: 12, borderBottom: `1px solid ${borderSubtle}` }}>
        <FilterSearchInput
          inputRef={inputRef}
          value={search}
          onChange={setSearch}
          placeholder={placeholder}
        />
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '4px 0', minHeight: 0 }}
      >
        {children}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderTop: `1px solid ${borderSubtle}`,
        }}
      >
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onClearField}
          style={{
            padding: 0,
            border: 0,
            background: 'transparent',
            color: selected.length > 0 ? blue : textDisabled,
            cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: textSubtle }}>
          {countShown} of {total}
        </span>
      </div>
    </div>
  );
}

function FilterSearchInput({
  inputRef,
  value,
  onChange,
  placeholder,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const blueBorder = token('color.border.selected', 'var(--ds-link)');
  const borderInput = token('color.border.input', 'var(--ds-text-disabled)');
  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          pointerEvents: 'none',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        }}
      >
        <SearchIcon label="" />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: 32,
          padding: '0 8px 0 32px',
          border: `1px solid ${focused ? blueBorder : borderInput}`,
          borderRadius: 3,
          outline: 'none',
          fontSize: 'var(--ds-font-size-300)',
          fontFamily: 'inherit',
          color: token('color.text', 'var(--ds-text)'),
          background: token('elevation.surface', 'var(--ds-surface)'),
          boxShadow: focused ? `0 0 0 1px ${blueBorder}` : 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function OptionRow({
  label,
  sublabel,
  icon,
  displayNode,
  checked,
  onClick,
}: {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  displayNode?: React.ReactNode;
  checked: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
  const blue = token('color.background.selected.bold', 'var(--ds-link)');
  const borderInput = token('color.border.input', 'var(--ds-text-disabled)');
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        cursor: 'pointer',
        background: hover ? hoverNeutral : 'transparent',
        fontSize: 'var(--ds-font-size-300)',
        color: token('color.text', 'var(--ds-text)'),
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: 3,
          border: checked ? `1px solid ${blue}` : `2px solid ${borderInput}`,
          background: checked ? blue : 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden focusable="false">
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="var(--ds-surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        {displayNode ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>{displayNode}</span>
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        )}
        {sublabel && (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sublabel}
          </span>
        )}
      </span>
    </div>
  );
}

// ─── AssigneeAvatarStack ──────────────────────────────────────────────────────
// Renders up to `max` stacked mini-avatars for selected assignees, then "+N".
// Used in the Filter trigger button to give visual feedback on active assignee
// selections without opening the drawer.

function AssigneeAvatarStack({
  selectedIds,
  options,
  max = 3,
}: {
  selectedIds: string[];
  options: CanonicalAssigneeOption[];
  max?: number;
}) {
  const optMap = useMemo(() => {
    const m = new Map<string, CanonicalAssigneeOption>();
    options.forEach((o) => m.set(o.id, o));
    return m;
  }, [options]);

  const selected = useMemo(
    () => selectedIds.map((id) => optMap.get(id)).filter((o): o is CanonicalAssigneeOption => !!o),
    [selectedIds, optMap],
  );

  const visible = selected.slice(0, max);
  const overflow = selected.length - visible.length;

  if (visible.length === 0) return null;

  const SIZE = 18;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 4,
        flexShrink: 0,
      }}
      aria-label={`${selected.length} assignee${selected.length > 1 ? 's' : ''} selected`}
    >
      {visible.map((opt, i) => (
        <span
          key={opt.id}
          title={opt.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            border: '1.5px solid var(--ds-surface)',
            marginLeft: i === 0 ? 0 : -(SIZE / 3),
            flexShrink: 0,
            overflow: 'hidden',
            background: 'var(--ds-background-neutral)',
            zIndex: visible.length - i,
            position: 'relative',
          }}
        >
          {opt.avatarUrl ? (
            <img
              src={opt.avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ fontSize: 7 /* ads-scanner:ignore-line */, fontWeight: 700, color: 'var(--ds-text-subtle)', userSelect: 'none', lineHeight: 1 }}>
              {opt.label.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: SIZE,
            padding: '0 4px',
            borderRadius: SIZE / 2,
            border: '1.5px solid var(--ds-surface)',
            marginLeft: -(SIZE / 3),
            background: 'var(--ds-background-neutral)',
            fontSize: 8, /* ads-scanner:ignore-line */
            fontWeight: 700,
            color: 'var(--ds-text-subtle)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 0,
            userSelect: 'none',
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
