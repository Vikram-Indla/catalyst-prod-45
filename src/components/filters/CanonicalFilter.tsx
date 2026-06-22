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
import Tooltip from '@atlaskit/tooltip';
import Lozenge from '@atlaskit/lozenge';

export type FilterTab = 'basic' | 'advanced' | 'jql';

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
}

export const emptyCanonicalFilterValue: CanonicalFilterValue = {
  parent: [],
  assignee: [],
  status: [],
  labels: [],
  workType: [],
};

export function countCanonicalActiveFields(v: CanonicalFilterValue): number {
  let n = 0;
  if (v.parent.length) n++;
  if (v.assignee.length) n++;
  if (v.status.length) n++;
  if (v.labels.length) n++;
  if (v.workType.length) n++;
  return n;
}

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
  /** Persistence scope — used for rail prefs AND parent query scoping. */
  scopeType?: string;
  scopeKey?: string;
}

const BASIC_FIELDS = ['Parent', 'Assignee', 'Status', 'Labels', 'Work type'];

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
  workTypeOptions = [],
  scopeType,
  scopeKey,
}: CanonicalFilterProps) {
  const scopeReady = !!(scopeType && scopeKey);
  // Uncontrolled fallback so component still works without value/onChange.
  const [innerValue, setInnerValue] = useState<CanonicalFilterValue>(emptyCanonicalFilterValue);
  const effValue = value ?? innerValue;
  const setEff = useCallback((next: CanonicalFilterValue) => {
    if (onChange) onChange(next);
    else setInnerValue(next);
  }, [onChange]);
  const activeFieldCount = countCanonicalActiveFields(effValue);
  const onClearAll = useCallback(() => setEff(emptyCanonicalFilterValue), [setEff]);
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
      default: return null;
    }
  }
  function countFor(label: string): number {
    const k = fieldKeyFor(label);
    return k ? effValue[k].length : 0;
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

  const blue = token('color.text.selected', '#0C66E4');
  const blueBg = token('color.background.selected', '#E9F2FF');
  const blueBorder = token('color.border.selected', '#0C66E4');
  const borderSubtle = token('color.border', '#DFE1E6');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  const surface = token('elevation.surface', '#FFFFFF');
  const surfaceOverlay = token('elevation.surface.overlay', '#FFFFFF');
  const textPrimary = token('color.text', '#292A2E');
  const textSubtle = token('color.text.subtle', '#505258');
  const textDisabled = token('color.text.disabled', '#8993A4');

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
          gap: 6,
          height: 32,
          padding: '0 10px',
          borderRadius: 3,
          border: `1px solid ${open ? blueBorder : borderSubtle}`,
          background: open ? blueBg : surface,
          color: open ? blue : textPrimary,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <FilterIcon label="" />
        <span>Filter</span>
        {activeFieldCount > 0 && (
          <span
            style={{
              marginLeft: 4,
              padding: '0 6px',
              minWidth: 22,
              height: 18,
              borderRadius: 3,
              background: token('color.background.accent.blue.subtle', '#579DFF'),
              color: token('color.text', '#292A2E'),
              fontSize: 11,
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
            width: 720,
            maxHeight: 'min(560px, calc(100vh - 96px))',
            background: surfaceOverlay,
            border: `1px solid ${borderSubtle}`,
            borderRadius: 6,
            boxShadow: '0 8px 28px rgba(9,30,66,0.20)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'inherit',
            overflow: 'hidden',
          }}
        >
          {/* Header — tabs strap + saved-filters dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: 3,
                border: `1px solid ${borderSubtle}`,
                borderRadius: 6,
                background: surface,
              }}
            >
              {(['basic', 'advanced', 'jql'] as FilterTab[]).map((t) => {
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
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'inherit',
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
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 32,
                    right: 0,
                    width: 320,
                    maxHeight: 420,
                    background: surfaceOverlay,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: 6,
                    boxShadow: '0 8px 28px rgba(9,30,66,0.20)',
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

          {/* Body — left rail + right editor */}
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
                  gap: 2,
                  overflowY: 'auto',
                }}
              >
                {pinnedFields.map((f) => (
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
                {unpinnedFields.length > 0 && (
                  <div style={{ height: 1, background: borderSubtle, margin: '6px 0' }} />
                )}
                {unpinnedFields.map((f) => (
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
                <button
                  type="button"
                  style={{
                    marginTop: 6,
                    height: 32,
                    padding: '0 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: 3,
                    background: surface,
                    color: textSubtle,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = hoverNeutral; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = surface; }}
                >
                  <AddIcon label="" />
                  Add field
                </button>
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
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!selectedField ? (
                <div style={{ padding: '16px 16px', color: textSubtle, fontSize: 14 }}>
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
                    assigneeOptions={assigneeOptions}
                    labelOptions={labelOptions}
                    workTypeOptions={workTypeOptions}
                    scopeType={scopeType}
                    scopeKey={scopeKey}
                  />
                );
              })()}
            </div>
          </div>

          <div style={{ height: 1, background: borderSubtle }} />

          {/* Footer — feedback + kbd hint */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: 12,
              color: textSubtle,
            }}
          >
            <FeedbackButton />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Press</span>
              <Kbd>Shift</Kbd>
              <span>+</span>
              <Kbd>F</Kbd>
              <span>to open and close</span>
            </div>
          </div>
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
              role="menu"
              style={{
                position: 'fixed',
                top: ellipsisPos.top,
                left: ellipsisPos.left,
                minWidth: 180,
                background: token('elevation.surface.overlay', '#FFFFFF'),
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: 6,
                boxShadow: '0 8px 28px rgba(9,30,66,0.25)',
                padding: '4px 0',
                zIndex: 10000,
                fontFamily: 'inherit',
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
              <div style={{ height: 1, background: token('color.border', '#DFE1E6'), margin: '4px 0' }} />
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
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  const textPrimary = token('color.text', '#292A2E');
  const textDisabled = token('color.text.disabled', '#8993A4');
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
        fontSize: 13,
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
  const blue = token('color.text.selected', '#0C66E4');
  const blueBg = token('color.background.selected', '#E9F2FF');
  const blueBorder = token('color.border.selected', '#0C66E4');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  const textPrimary = token('color.text', '#292A2E');

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
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'inherit',
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
  const blue = token('color.text.selected', '#0C66E4');
  const blueBg = token('color.background.selected', '#E9F2FF');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  const textPrimary = token('color.text', '#292A2E');
  const textSubtle = token('color.text.subtle', '#505258');

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
        gap: 2,
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
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          borderRadius: 3,
          background,
          color: active || hover ? blue : textPrimary,
          outline: isDragOver ? `2px solid ${token('color.border.selected', '#0C66E4')}` : 'none',
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
              background: token('color.background.selected.bold', '#0C66E4'),
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
              background: token('color.background.accent.blue.subtle', '#579DFF'),
              color: token('color.text', '#292A2E'),
              fontSize: 11,
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
                style={{ ...iconBtnStyle(), color: token('color.text', '#292A2E') }}
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
  const blueBorder = token('color.border.selected', '#0C66E4');
  const borderInput = token('color.border.input', '#8993A4');

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
          color: token('color.text.subtle', '#505258'),
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
          fontSize: 13,
          fontFamily: 'inherit',
          color: token('color.text', '#292A2E'),
          background: token('elevation.surface', '#FFFFFF'),
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
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 700,
          color: token('color.text.subtle', '#505258'),
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <div
          style={{
            padding: '6px 12px',
            fontSize: 12,
            color: token('color.text.subtlest', '#6B6E76'),
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
  const blue = token('color.text.selected', '#0C66E4');
  const blueBg = token('color.background.selected', '#E9F2FF');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  const textPrimary = token('color.text', '#292A2E');

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
        fontSize: 13,
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
            background: token('color.background.selected.bold', '#0C66E4'),
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
            color: token('color.text.subtle', '#505258'),
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
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        background: hover ? hoverNeutral : 'transparent',
        border: 0,
        cursor: 'pointer',
        color: 'inherit',
        fontSize: 12,
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
        background: token('color.background.neutral', '#F1F2F4'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 3,
        fontSize: 11,
        fontFamily: 'inherit',
        fontWeight: 600,
        color: token('color.text', '#292A2E'),
      }}
    >
      {children}
    </span>
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
      displayNode: <Lozenge appearance={s.appearance as any}>{s.label}</Lozenge>,
    }));
  } else if (fieldKey === 'assignee') {
    options = props.assigneeOptions.map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.avatarUrl ? (
        <img src={a.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
      ) : undefined,
    }));
  } else if (fieldKey === 'labels') {
    options = props.labelOptions.map((l) => ({ id: l, label: l }));
  } else if (fieldKey === 'workType') {
    options = props.workTypeOptions.map((w) => ({ id: w.id, label: w.label, icon: w.icon }));
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
        <div style={{ padding: 12, fontSize: 13, color: token('color.text.subtlest', '#6B6E76') }}>
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
        <div style={{ padding: 8, fontSize: 12, color: token('color.text.subtlest', '#6B6E76') }}>
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
  const borderSubtle = token('color.border', '#DFE1E6');
  const blue = token('color.text.selected', '#0C66E4');
  const textDisabled = token('color.text.disabled', '#8993A4');
  const textSubtle = token('color.text.subtle', '#505258');
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
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
        <span style={{ fontSize: 12, color: textSubtle }}>
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
  const blueBorder = token('color.border.selected', '#0C66E4');
  const borderInput = token('color.border.input', '#8993A4');
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
          color: token('color.text.subtle', '#505258'),
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
          fontSize: 13,
          fontFamily: 'inherit',
          color: token('color.text', '#292A2E'),
          background: token('elevation.surface', '#FFFFFF'),
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
  const hoverNeutral = token('color.background.neutral.subtle.hovered', '#F1F2F4');
  const blue = token('color.background.selected.bold', '#0C66E4');
  const borderInput = token('color.border.input', '#8993A4');
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
        padding: '6px 12px',
        cursor: 'pointer',
        background: hover ? hoverNeutral : 'transparent',
        fontSize: 13,
        color: token('color.text', '#292A2E'),
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
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <span style={{ fontSize: 11, color: token('color.text.subtle', '#505258'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sublabel}
          </span>
        )}
      </span>
    </div>
  );
}
