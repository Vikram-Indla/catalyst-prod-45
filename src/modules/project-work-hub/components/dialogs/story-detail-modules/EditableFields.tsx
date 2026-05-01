/**
 * EditableFields — EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker
 * Rebuilt to exact Jira parity — no pencil icons, Jira-native priority SVGs, 28px avatars, 14px names
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CircleUser } from 'lucide-react';
import Select, { CreatableSelect } from '@atlaskit/select';
import type { ProjectMember, ParentIssue } from './types';
import { PRIORITY_LIST } from './constants';
import { getAvatarColor } from './helpers';
import { resolveAvatarUrl } from '@/lib/avatars';

/** Atlassian-spec dropdown container styles */
const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 4, border: 'none',
  boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
  padding: '4px 0', zIndex: 9999,
};

/** Atlassian checkmark SVG */
const CheckmarkSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/** Jira-native priority SVG icons — exact parity */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 8l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 12l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  High: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 10l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Medium: (
    /* jira-compare S-23 (2026-04-28): Jira renders Medium as three
     * horizontal bars (≡), not two. Match Jira's medium_new.svg. */
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 4.5h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 8h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 11.5h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Low: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 6l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Lowest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 4l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ── Avatar helper — prioritises real image, falls back to face icon (GUARDRAIL) ──
   Exported so peer fields (Reporter etc.) can reuse the canonical fallback and
   we stop fragmenting into hand-rolled initials tiles vs CircleUser SVG tiles
   for the same user. See CLAUDE.md §19 + 2026-04-20 critique §P0-2. */
export function AvatarCircle({ userId, name, avatarUrl, size = 28 }: { userId: string; name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(userId), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <CircleUser size={size * 0.7} color="var(--ds-text-inverse, #FFFFFF)" strokeWidth={1.5} />
    </div>
  );
}

/* ── EditableAssignee ──────────────────────── */
/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep — §P0-7):
 *
 * Replaced the bespoke dropdown with `@atlaskit/select` (single, searchable)
 * matching the EditablePriority pattern. Benefits:
 *   - Keyboard semantics (arrow keys, Enter, Esc, type-to-filter) come
 *     from Atlaskit for free.
 *   - Consistent menu chrome with every other select in the drawer.
 *   - No more manual outside-click / focus dance / fixed-position math.
 *   - appearance="subtle" removes the field border in rest state so the
 *     row reads as plain editable text (matches Jira's Details sidebar).
 *
 * Option shape: `{ value: string | null; label: string; userId: string | null;
 * avatarUrl: string | null }`. `value === null` represents the "Unassigned"
 * row. `formatOptionLabel` renders avatar + name inline.
 */
type AssigneeOption = {
  value: string;
  label: string;
  userId: string | null; // null for Unassigned
  avatarUrl: string | null;
};
const UNASSIGNED_VALUE = '__unassigned__';

export function EditableAssignee({ issueId, issueKey, projectId, currentAssigneeId, currentAssigneeName, onUpdate }: {
  issueId: string; issueKey?: string; projectId: string; currentAssigneeId: string | null; currentAssigneeName: string | null; onUpdate: () => void;
}) {
  const { data: members = [] } = useQuery({
    queryKey: ['projectMembers-edit-local', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_members').select('user_id, role').eq('project_id', projectId);
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = data.map(d => d.user_id);
      // §19 chokepoint: select full_name only, resolve avatar locally.
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(d => {
        const full_name = profileMap.get(d.user_id)?.full_name ?? 'Unknown';
        return {
          user_id: d.user_id,
          full_name,
          avatar_url: resolveAvatarUrl(full_name),
          role: d.role,
        };
      }) as ProjectMember[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const updateData = {
        assignee_account_id: userId,
        assignee_display_name: userId ? (members.find(m => m.user_id === userId)?.full_name ?? null) : null,
      };
      const query = issueKey
        ? supabase.from('ph_issues').update(updateData as any).eq('issue_key', issueKey)
        : supabase.from('ph_issues').update(updateData as any).eq('id', issueId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => { onUpdate(); },
  });

  const options: AssigneeOption[] = useMemo(() => {
    const memberOptions: AssigneeOption[] = members.map(m => ({
      value: m.user_id,
      label: m.full_name,
      userId: m.user_id,
      avatarUrl: m.avatar_url ?? null,
    }));
    return [
      { value: UNASSIGNED_VALUE, label: 'Unassigned', userId: null, avatarUrl: null },
      ...memberOptions,
    ];
  }, [members]);

  /**
   * §19 chokepoint (2026-04-20): synchronous avatar resolution from
   * display name. Avoids direct profiles.avatar_url fetch (BANNED per
   * CLAUDE.md §19).
   */
  const selected: AssigneeOption = useMemo(() => {
    if (!currentAssigneeId) {
      return { value: UNASSIGNED_VALUE, label: 'Unassigned', userId: null, avatarUrl: null };
    }
    const matched = options.find(o => o.userId === currentAssigneeId);
    if (matched) return matched;
    // Fallback when members haven't loaded yet: render from props.
    return {
      value: currentAssigneeId,
      label: currentAssigneeName ?? 'Unknown',
      userId: currentAssigneeId,
      avatarUrl: currentAssigneeName ? resolveAvatarUrl(currentAssigneeName) : null,
    };
  }, [currentAssigneeId, currentAssigneeName, options]);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Select<AssigneeOption>
        inputId={`assignee-${issueKey ?? issueId}`}
        appearance="subtle"
        spacing="compact"
        isSearchable
        classNamePrefix="cv-assignee-select"
        placeholder="Unassigned"
        options={options}
        value={selected}
        onChange={(v) => {
          if (!v) return;
          const nextUserId = v.value === UNASSIGNED_VALUE ? null : v.userId;
          if (nextUserId === (currentAssigneeId ?? null)) return;
          updateMutation.mutate(nextUserId);
        }}
        formatOptionLabel={(opt: AssigneeOption) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {opt.value === UNASSIGNED_VALUE ? (
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                border: '1px dashed #C1C7D0', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, color: '#C1C7D0',
              }}>?</div>
            ) : (
              <AvatarCircle
                userId={opt.userId ?? opt.value}
                name={opt.label}
                avatarUrl={opt.avatarUrl}
                size={24}
              />
            )}
            <span style={{
              fontSize: 14,
              color: opt.value === UNASSIGNED_VALUE ? 'var(--ds-text-subtlest, #6B6E76)' : '#172B4D',
              fontWeight: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {opt.label}
            </span>
          </span>
        )}
      />
    </div>
  );
}

/* ── EditablePriority ──────────────────────── */
/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep):
 * replaced the bespoke dropdown with `@atlaskit/select` (single). Behaviour
 * preserved: optimistic-off (refetch via onUpdate), canonical priority SVGs
 * rendered inline via formatOptionLabel, no pencil icon, no coloured text.
 * Benefits over the old hand-rolled dropdown:
 *   - Keyboard semantics come from the Atlaskit select (arrow keys, Enter,
 *     Esc, type-to-filter).
 *   - Consistent menu chrome with every other Atlaskit select in the app.
 *   - No more manual outside-click handler / useEffect dance.
 *   - Appearance="subtle" removes the field border in the inactive state
 *     so the row reads as editable text (matches Jira's Details sidebar
 *     rendering).
 */
export function EditablePriority({ issueId, issueKey, currentPriority, onUpdate }: { issueId: string; issueKey?: string; currentPriority: string; onUpdate: () => void }) {
  const updateMutation = useMutation({
    mutationFn: async (priority: string) => {
      const query = issueKey
        ? supabase.from('ph_issues').update({ priority } as any).eq('issue_key', issueKey)
        : supabase.from('ph_issues').update({ priority } as any).eq('id', issueId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => onUpdate(),
  });

  const options = PRIORITY_LIST.map(p => ({ label: p, value: p }));
  const selected = options.find(o => o.value === currentPriority) ?? options[2]; // Medium fallback

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Select<{ label: string; value: string }>
        inputId={`priority-${issueKey ?? issueId}`}
        appearance="subtle"
        spacing="compact"
        isSearchable={false}
        classNamePrefix="cv-priority-select"
        options={options}
        value={selected}
        onChange={(v) => v && v.value !== currentPriority && updateMutation.mutate(v.value)}
        formatOptionLabel={(opt) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', flexShrink: 0 }}>
              {PRIORITY_SVG[opt.value] ?? PRIORITY_SVG.Medium}
            </span>
            <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>
              {opt.label}
            </span>
          </span>
        )}
      />
    </div>
  );
}

/* ── EditableLabels — Jira-parity: type + Enter to create, reuse existing ── */

const LABEL_COLORS = ['#4C9AFF', '#00B8D9', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#FF7452', '#57D9A3', '#FFC400', '#998DD9', '#79E2F2', '#FF8F73'];
function getLabelColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep — §P0-8):
 *
 * Replaced the bespoke search/create dropdown with `@atlaskit/select`
 * CreatableSelect (multi). Jira's label picker supports both type-to-search
 * and type-to-create, which maps directly to CreatableSelect's behaviour.
 * Existing labels across ph_issues are still pre-loaded so the suggestion
 * list stays populated, matching Jira's "Begin typing to find..." UX.
 *
 * Keeping `getLabelColor` so the Atlaskit MultiValue chips can inherit a
 * per-label hue — matches the legacy pill border colour — via `styles`.
 */
type LabelOption = { value: string; label: string };

export function EditableLabels({ issueId, issueKey, currentLabels, onUpdate }: { issueId: string; issueKey?: string; currentLabels: string[]; onUpdate: () => void }) {
  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => {
      const query = issueKey
        ? supabase.from('ph_issues').update({ labels: labels as any }).eq('issue_key', issueKey)
        : supabase.from('ph_issues').update({ labels: labels as any }).eq('id', issueId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => onUpdate(),
  });

  // Fetch all unique labels used across issues for reuse
  const { data: allLabels = [] } = useQuery({
    queryKey: ['ph-all-labels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('labels').is('deleted_at', null).not('labels', 'is', null);
      if (error) throw error;
      const labelSet = new Set<string>();
      (data ?? []).forEach(row => {
        if (Array.isArray(row.labels)) {
          (row.labels as string[]).forEach(l => { if (typeof l === 'string' && l.trim()) labelSet.add(l.trim()); });
        }
      });
      return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 30000,
  });

  const options: LabelOption[] = useMemo(
    () => allLabels.map(l => ({ value: l, label: l })),
    [allLabels],
  );
  const selected: LabelOption[] = currentLabels.map(l => ({ value: l, label: l }));

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <CreatableSelect<LabelOption, true>
        inputId={`labels-${issueKey ?? issueId}`}
        isMulti
        appearance="subtle"
        spacing="compact"
        classNamePrefix="cv-labels-select"
        placeholder="None"
        options={options}
        value={selected}
        onChange={(v) => {
          // @atlaskit/select's CreatableSelect yields both existing and
          // newly-created options with the same { value, label } shape.
          const next: string[] = (v ?? []).map((o) => String(o.value).trim()).filter(Boolean);
          // Dedupe (case-sensitive match) before persisting.
          const deduped: string[] = Array.from(new Set<string>(next));
          updateMutation.mutate(deduped);
        }}
        formatCreateLabel={(input) => `Create "${input}"`}
        noOptionsMessage={() => 'Type to create a label'}
        // Give each chip a per-label border colour (Jira-parity rainbow pill).
        styles={{
          multiValue: (base, state) => ({
            ...base,
            border: `1px solid ${getLabelColor((state.data as LabelOption).value)}`,
            background: 'var(--ds-text-inverse, #FFFFFF)',
            borderRadius: 3,
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#172B4D',
            fontSize: 12,
            fontWeight: 500,
          }),
        }}
      />
    </div>
  );
}

/* ── EditableStoryPoints — Jira-parity inline numeric picker ── */

const FIBONACCI_POINTS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21];

export function EditableStoryPoints({ issueId, currentPoints, onUpdate }: {
  issueId: string; currentPoints: number | null | undefined; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const updateMutation = useMutation({
    mutationFn: async (points: number | null) => {
      const { error } = await supabase.from('ph_issues').update({ story_points: points } as any).eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => { onUpdate(); setOpen(false); },
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        padding: '4px 6px', borderRadius: 4, transition: 'background .12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: 14, color: currentPoints != null ? '#172B4D' : '#97A0AF', fontWeight: 400 }}>
          {currentPoints != null ? currentPoints : 'None'}
        </span>
      </div>
      {open && (
        <div style={{ ...ATLASSIAN_DROPDOWN, position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 160, overflow: 'hidden' }}>
          {/* Clear option */}
          <div onClick={() => updateMutation.mutate(null)}
            style={{
              height: 36, padding: '0 12px', display: 'flex', alignItems: 'center',
              cursor: 'pointer', fontSize: 14, fontWeight: 400, color: '#6B778C',
              background: currentPoints == null ? '#DEEBFF' : 'transparent',
              borderBottom: '1px solid #F4F5F7',
            }}
            onMouseEnter={e => { if (currentPoints != null) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
            onMouseLeave={e => { if (currentPoints != null) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{ flex: 1 }}>None</span>
            {currentPoints == null && <CheckmarkSVG />}
          </div>
          {FIBONACCI_POINTS.map(p => (
            <div key={p} onClick={() => updateMutation.mutate(p)}
              style={{
                height: 36, padding: '0 12px', display: 'flex', alignItems: 'center',
                cursor: 'pointer', fontSize: 14, fontWeight: 400, color: '#172B4D',
                background: p === currentPoints ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (p !== currentPoints) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (p !== currentPoints) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ flex: 1 }}>{p}</span>
              {p === currentPoints && <CheckmarkSVG />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── EditableFixVersions — Jira-parity multi-select dropdown ── */

/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep — §P0-9):
 *
 * Replaced the bespoke multi-select dropdown with `@atlaskit/select` (multi,
 * grouped). Jira's fix-version picker renders Unreleased and Released as
 * separate groups with uppercase labels; Atlaskit's `options` prop accepts
 * `{ label, options }` shapes for this natively, so we get the exact chrome
 * for free. Optimistic-off: writes via mutation then refetches through
 * `onUpdate`. Chips in the control are the built-in MultiValue with the
 * subtle appearance, which matches Jira's small blue token chips.
 */
type FixVersionOption = { value: string; label: string };

export function EditableFixVersions({ issueId, currentFixVersions, projectKey, onUpdate }: {
  issueId: string; currentFixVersions: any | null; projectKey: string | null | undefined; onUpdate: () => void;
}) {
  // Parse current fix version names (legacy JSON shape: [{ name }, ...] or string[]).
  const fixVersionNames: string[] = useMemo(() => {
    if (!currentFixVersions) return [];
    if (Array.isArray(currentFixVersions)) {
      return currentFixVersions.map((v: any) => v?.name || v).filter(Boolean) as string[];
    }
    return [];
  }, [currentFixVersions]);

  // Fetch available versions from ph_versions
  const { data: versionsData } = useQuery({
    queryKey: ['ph-fix-versions', projectKey],
    queryFn: async () => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from('ph_versions' as any)
        .select('name, released, archived, release_date')
        .eq('project_key', projectKey)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as { name: string; released: boolean; archived: boolean; release_date: string | null }[];
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const versions = versionsData ?? [];

  const groupedOptions = useMemo(() => {
    const unreleased = versions.filter(v => !v.released && !v.archived).map(v => ({ value: v.name, label: v.name }));
    const released = versions.filter(v => v.released && !v.archived).map(v => ({ value: v.name, label: v.name }));
    const groups: { label: string; options: FixVersionOption[] }[] = [];
    if (unreleased.length) groups.push({ label: 'Unreleased', options: unreleased });
    if (released.length) groups.push({ label: 'Released', options: released });
    return groups;
  }, [versions]);

  const selected: FixVersionOption[] = fixVersionNames.map(n => ({ value: n, label: n }));

  const updateMutation = useMutation({
    mutationFn: async (names: string[]) => {
      const jsonValue = names.map(n => ({ name: n }));
      const { error } = await supabase.from('ph_issues').update({ fix_versions: jsonValue } as any).eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => onUpdate(),
  });

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Select<FixVersionOption, true>
        inputId={`fix-versions-${issueId}`}
        isMulti
        appearance="subtle"
        spacing="compact"
        classNamePrefix="cv-fixversions-select"
        placeholder="None"
        options={groupedOptions}
        value={selected}
        onChange={(v) => {
          const next = (v ?? []).map(o => o.value);
          updateMutation.mutate(next);
        }}
        noOptionsMessage={() => 'No versions found for this project'}
      />
    </div>
  );
}

/* ── ParentFieldPicker — Jira-parity rebuild ── */

/** Canonical epic icon — lightning bolt on purple rounded square (Jira parity) */
const EpicIconInline = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
    <rect fill="#6554C0" width="16" height="16" rx="2"/>
    <path fill="#FFF" d="M8.39 2L4.5 9h3.11v5L11.5 7H8.39V2z"/>
  </svg>
);

export function ParentFieldPicker({ storyKey, parentKey, projectKey, onParentChange, triggerOpen }: {
  storyKey: string; parentKey: string | null; projectKey: string;
  onParentChange: (newParentKey: string | null) => void;
  triggerOpen?: number; // increment to open externally
}) {
  const [open, setOpen] = useState(false);

  // Allow external trigger (e.g. from breadcrumb "Add parent")
  useEffect(() => {
    if (triggerOpen && triggerOpen > 0) setOpen(true);
  }, [triggerOpen]);
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: currentParent } = useQuery({
    queryKey: ['parentIssue', parentKey],
    queryFn: async () => {
      if (!parentKey) return null;
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', parentKey).is('deleted_at', null).single();
      if (error) return null;
      return data as ParentIssue;
    },
    enabled: !!parentKey,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['parentSearch', projectKey, search, showDone],
    queryFn: async () => {
      let query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey).eq('issue_type', 'Epic')
        .is('deleted_at', null).neq('issue_key', storyKey)
        .order('jira_updated_at', { ascending: false }).limit(20);
      if (!showDone) {
        query = query.neq('status_category', 'done');
      }
      if (search.trim()) {
        query = query.or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ParentIssue[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchInputRef.current?.focus(), 50); }, [open]);
  const handleSelect = (key: string | null) => { onParentChange(key); setOpen(false); setSearch(''); };

  const [hovered, setHovered] = useState(false);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      {/* Trigger — Jira click-to-edit style (no border when idle) */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        minHeight: 32, padding: '4px 8px',
        border: 'none',
        borderRadius: 3, cursor: 'pointer', background: 'transparent',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; setHovered(true); }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; setHovered(false); }}
      >
        {parentKey && currentParent ? (
          <>
            <EpicIconInline />
            <span style={{ flex: 1, fontSize: 14, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentParent.issue_key} {currentParent.summary}
            </span>
            {/* Clear button — hover only */}
            <button onClick={e => { e.stopPropagation(); handleSelect(null); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%', border: 'none',
              background: '#DFE1E6', cursor: 'pointer', color: '#42526E', flexShrink: 0,
              opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#C1C7D0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#DFE1E6')}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2" style={{ flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: 14, color: '#6B778C' }}>None</span>
          </>
        )}
      </div>

      {/* Dropdown — Jira parity with two-line rows, color dots, "Show done" checkbox */}
      {open && (() => {
        return (
          <div style={{
            ...ATLASSIAN_DROPDOWN, position: 'absolute', top: '100%', left: 0, marginTop: 4,
            width: Math.max(containerRef.current?.offsetWidth ?? 420, 420),
            maxHeight: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Search input */}
            <div style={{ padding: '8px 8px 4px' }}>
              <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search epics..."
                onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}
                style={{
                  width: '100%', height: 40, padding: '0 12px',
                  border: '2px solid #4C9AFF', borderRadius: 3,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#172B4D',
                }} />
            </div>

            {/* Show done checkbox */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #F4F5F7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#172B4D' }}>
                <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0052CC', cursor: 'pointer' }} />
                Show done work items
              </label>
            </div>

            {/* Results — Jira parity: epic icon + key on line 1, summary on line 2, NO color dots */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchResults.map(result => {
                const isActive = result.issue_key === parentKey;
                return (
                  <div key={result.id} onClick={() => handleSelect(result.issue_key)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      borderBottom: '1px solid #F4F5F7',
                      background: isActive ? '#DEEBFF' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? '#DEEBFF' : 'transparent'; }}
                  >
                    {/* Line 1: icon + key */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <EpicIconInline />
                      <span style={{ fontFamily: 'var(--cp-font-mono)', fontWeight: 600, color: '#6B778C', fontSize: 12 }}>{result.issue_key}</span>
                    </div>
                    {/* Line 2: summary */}
                    <div style={{ fontSize: 14, color: '#172B4D', paddingLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.summary}
                    </div>
                  </div>
                );
              })}
              {searchResults.length === 0 && search && (
                <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No epics found for "{search}"</div>
              )}
              {searchResults.length === 0 && !search && (
                <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No epics available</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
