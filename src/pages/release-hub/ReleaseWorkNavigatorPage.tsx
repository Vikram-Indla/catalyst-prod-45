/**
 * ReleaseWorkNavigatorPage — /release-hub/releases-management/:releaseId/work
 *
 * Custom toolbar (Basic/JQL · Search · Space · Assignee · Type · Status ·
 * Fix versions chip) on top + CANONICAL BacklogPage table below (same
 * component mounted at /project-hub/BAU/backlog, /product-hub/INV/backlog,
 * /incident-hub/all-incidents, /testhub/my-work, /tasks/list).
 *
 * BacklogPage runs in `hideChrome` mode so its own project header + in-card
 * toolbar are suppressed and the only toolbar on screen is the one defined
 * in this file. State sync from toolbar → BacklogPage is purely URL-based:
 *   - Search box        → ?q=…
 *   - Filter chips      → composed JQL → ?jql=…
 * BacklogPage's existing search useState seed (line 1034) + the new
 * hideChrome sync effect (line 1035–1042) read ?q= live. BacklogPage's
 * existing urlJql effect (line 1208–1215) reads ?jql= and applies it via
 * jqlToJiraFilterValue → JiraFilterValue.
 *
 * Default state: fix-version chip pre-applied to the current release's
 * name. Clearing the chip drops the JQL fragment from the URL and the
 * table widens to every row in the release's project. Cross-project
 * listing is NOT supported here — BacklogPage is single-project by
 * design (CLAUDE.md ADOPT — don't reimplement).
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { ProjectAvatar } from '@/components/icons';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import SearchIcon from '@atlaskit/icon/glyph/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';

const BORDER = 'var(--ds-border)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';
const BLUE = 'var(--ds-border-selected)';
const BLUE_BG = 'var(--ds-background-selected)';
const BLUE_TEXT = 'var(--ds-text-selected)';

type FixVersionOp = 'eq' | 'neq';

interface FilterState {
  mode: 'basic' | 'jql';
  search: string;
  spaces: string[];
  assignees: string[];
  types: string[];
  statuses: string[];
  fixVersion: string | null;
  fixVersionOp: FixVersionOp;
  jql: string;
}

function decodeFilters(sp: URLSearchParams): FilterState {
  return {
    mode: (sp.get('mode') as 'basic' | 'jql') ?? 'basic',
    search: sp.get('q') ?? '',
    spaces: sp.get('spaces')?.split(',').filter(Boolean) ?? [],
    assignees: sp.get('assignees')?.split(',').filter(Boolean) ?? [],
    types: sp.get('types')?.split(',').filter(Boolean) ?? [],
    statuses: sp.get('statuses')?.split(',').filter(Boolean) ?? [],
    fixVersion: sp.get('fix') ?? null,
    fixVersionOp: (sp.get('fixOp') as FixVersionOp) ?? 'eq',
    jql: sp.get('jqlRaw') ?? '',
  };
}

// composeJql — translate the basic-mode filter chips into a single JQL
// string that BacklogPage's existing `?jql=` effect can apply.
function composeJql(state: FilterState): string {
  if (state.mode === 'jql') return state.jql;
  const parts: string[] = [];
  const quote = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  if (state.assignees.length) {
    const real = state.assignees.filter((a) => a !== '__UNASSIGNED__');
    if (real.length) parts.push(`assignee in (${real.map(quote).join(', ')})`);
  }
  if (state.types.length) parts.push(`issuetype in (${state.types.map(quote).join(', ')})`);
  if (state.statuses.length) parts.push(`status in (${state.statuses.map(quote).join(', ')})`);
  if (state.fixVersion) {
    parts.push(state.fixVersionOp === 'eq'
      ? `fixVersion = ${quote(state.fixVersion)}`
      : `fixVersion != ${quote(state.fixVersion)}`);
  }
  return parts.join(' AND ');
}

interface ReleaseContext {
  releaseName: string;
  projectKey: string;
  projectId: string;
  phProjectId: string;
}

async function loadReleaseContext(releaseId: string, table: string): Promise<ReleaseContext | null> {
  const { data: rel } = await (supabase as any)
    .from(table)
    .select('id, name, title, project_id')
    .eq('id', releaseId)
    .single();
  if (!rel) return null;
  const { data: phProj } = await supabase
    .from('ph_projects')
    .select('id, key')
    .eq('id', rel.project_id)
    .single();
  if (!phProj) return null;
  const { data: catProj } = await supabase
    .from('projects')
    .select('id')
    .eq('key', phProj.key)
    .single();
  if (!catProj) return null;
  return {
    releaseName: rel.name || rel.title || '',
    projectKey: phProj.key,
    projectId: catProj.id,
    phProjectId: phProj.id,
  };
}

const EMPTY_STATE: FilterState = {
  mode: 'basic',
  search: '',
  spaces: [],
  assignees: [],
  types: [],
  statuses: [],
  fixVersion: null,
  fixVersionOp: 'eq',
  jql: '',
};

interface ReleaseWorkNavigatorPageProps {
  /** 2026-06-26: entity-hub config. Defaults to RELEASE_CONFIG. Sprint surface
   *  mounts with SPRINT_CONFIG (table=ph_jira_sprints, linked-keys by sprint_name). */
  config?: EntityConfig;
  /** Override the URL :releaseId param (used by SprintWorkNavigatorPage's :sprintId). */
  entityIdOverride?: string;
}

export function ReleaseWorkNavigatorPage({
  config = RELEASE_CONFIG,
  entityIdOverride,
}: ReleaseWorkNavigatorPageProps = {}) {
  const params = useParams<{ releaseId?: string; sprintId?: string }>();
  const releaseId = entityIdOverride ?? params.releaseId ?? params.sprintId;
  const [searchParams, setSearchParams] = useSearchParams();
  // Chip state lives in React. URL is a downstream projection only —
  // this kills the race between "pre-fill fix from release" and
  // "compose JQL from current state" that ate the prior version.
  const [state, setState] = useState<FilterState>(() => decodeFilters(searchParams));

  const { data: ctx, isLoading: ctxLoading } = useQuery({
    queryKey: [config.queryKeyPrefix, 'work-nav-ctx', releaseId],
    queryFn: () => loadReleaseContext(releaseId!, config.table),
    enabled: !!releaseId,
    staleTime: 5 * 60_000,
  });

  // MIRROR WorkItemsSection's query EXACTLY (the release detail page's
  // Work items section is the source of truth — same hooks here so the
  // navigator shows the same item set). Path:
  // 1. `.contains('sprint_release', [{name: releaseName}])`
  // 2. If 0 rows, fall back to scanning 5000 rows with `sprint_release`
  //    non-null and filtering client-side (handles JSON shape variants).
  // See src/components/releases/detail/WorkItemsSection.tsx:146-173.
  const { data: releaseLinkedKeys, isFetching: linkedKeysFetching } = useQuery({
    queryKey: [config.queryKeyPrefix, 'work-nav-linked-keys', releaseId, ctx?.releaseName],
    enabled: !!releaseId && !!ctx?.releaseName,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const target = (ctx?.releaseName || '').trim();
      if (!target) return [];

      if (config.kind === 'sprint') {
        // Sprint link: ph_issues.sprint_release JSONB (canonical Jira source).
        // sprint_name text column is unreliable — jira-sync overwrites it
        // each cycle (proven 2026-06-26).
        const containsResult = await supabase
          .from('ph_issues')
          .select('issue_key')
          .contains('sprint_release', JSON.stringify([{ name: target }]))
          .limit(2000);
        if ((containsResult.data?.length ?? 0) > 0) {
          return (containsResult.data ?? []).map((r: any) => r.issue_key as string).filter(Boolean);
        }
        const fb = await supabase
          .from('ph_issues')
          .select('issue_key, sprint_release')
          .not('sprint_release', 'is', null)
          .limit(5000);
        if (!fb.data) return [];
        return fb.data
          .filter((row: any) => {
            const arr = row.sprint_release;
            return Array.isArray(arr) && arr.some((el: any) => el && el.name === target);
          })
          .map((r: any) => r.issue_key as string)
          .filter(Boolean);
      }

      // Release link: sprint_release JSONB contains entry with matching name.
      const containsResult = await supabase
        .from('ph_issues')
        .select('issue_key')
        .contains('sprint_release', JSON.stringify([{ name: target }]))
        .limit(2000);
      if ((containsResult.data?.length ?? 0) > 0) {
        return (containsResult.data ?? []).map((r: any) => r.issue_key as string).filter(Boolean);
      }
      const fb = await supabase
        .from('ph_issues')
        .select('issue_key, sprint_release')
        .not('sprint_release', 'is', null)
        .limit(5000);
      if (!fb.data) return [];
      return fb.data
        .filter((row: any) => {
          const arr = row.sprint_release;
          return Array.isArray(arr) && arr.some((el: any) => el && el.name === target);
        })
        .map((r: any) => r.issue_key as string)
        .filter(Boolean);
    },
  });

  // Pre-fill fix-version with current release name — once per release,
  // and only when the user hasn't explicitly cleared it. The ref tracks
  // both "already seeded" and the user's explicit clear gesture, so
  // re-renders don't re-inject the chip the user just removed.
  const seedHandledRef = useRef<string | null>(null);
  const userClearedFixRef = useRef<boolean>(false);
  useEffect(() => {
    if (!ctx?.releaseName || !releaseId) return;
    if (seedHandledRef.current === releaseId) return;
    seedHandledRef.current = releaseId;
    // Respect any URL-provided fix value; respect explicit jqlRaw; otherwise seed.
    if (state.fixVersion) return;
    if (state.jql) return;
    if (userClearedFixRef.current) return;
    setState((prev) => ({ ...prev, fixVersion: ctx.releaseName }));
  }, [releaseId, ctx?.releaseName, state.fixVersion, state.jql]);

  // Single-direction sync: state → URL. Writes ?q=, ?jql=, plus the chip
  // params for deep-linking. BacklogPage reads ?q= and ?jql= live.
  useEffect(() => {
    const jql = composeJql(state);
    const sp = new URLSearchParams();
    if (state.mode !== 'basic') sp.set('mode', state.mode);
    if (state.search) sp.set('q', state.search);
    if (state.spaces.length) sp.set('spaces', state.spaces.join(','));
    if (state.assignees.length) sp.set('assignees', state.assignees.join(','));
    if (state.types.length) sp.set('types', state.types.join(','));
    if (state.statuses.length) sp.set('statuses', state.statuses.join(','));
    if (state.fixVersion) sp.set('fix', state.fixVersion);
    if (state.fixVersionOp !== 'eq') sp.set('fixOp', state.fixVersionOp);
    if (state.jql) sp.set('jqlRaw', state.jql);
    if (jql) sp.set('jql', jql);
    setSearchParams(sp, { replace: true });
  }, [state, setSearchParams]);

  const updateState = useCallback((patch: Partial<FilterState>) => {
    // If the user explicitly cleared the fix chip, remember that so the
    // seed effect doesn't put it back on next render.
    if (Object.prototype.hasOwnProperty.call(patch, 'fixVersion') && patch.fixVersion === null) {
      userClearedFixRef.current = true;
    }
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Toolbar option sources — pulled from a lightweight ph_issues scope so
  // the chips show real values without depending on BacklogPage's hooks.
  const { data: allVersions = [] } = useQuery({
    queryKey: [config.queryKeyPrefix, 'work-nav-versions'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from(config.table)
        .select('id, name, title')
        .order('name');
      return ((data ?? []) as any[]).map((r) => (r.name || r.title || '') as string).filter(Boolean);
    },
    staleTime: 5 * 60_000,
  });

  const { data: spaceOptions = [] } = useQuery({
    queryKey: ['release-work-nav-spaces'],
    queryFn: async () => {
      const { data } = await supabase.from('ph_projects').select('key, name').order('name');
      return (data ?? []) as Array<{ key: string; name: string }>;
    },
    staleTime: 5 * 60_000,
  });

  const { data: chipOptions = { types: [], statuses: [], assignees: [], statusCategoryByStatus: new Map<string, string>() } } = useQuery({
    queryKey: ['release-work-nav-chip-opts', ctx?.projectKey],
    enabled: !!ctx?.projectKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_type, status, status_category, assignee_display_name')
        .eq('project_key', ctx!.projectKey)
        .is('deleted_at', null)
        .is('archived_at', null)
        .limit(2000);
      const types = new Set<string>();
      const statuses = new Set<string>();
      const assignees = new Set<string>();
      const statusCategoryByStatus = new Map<string, string>();
      (data ?? []).forEach((r: any) => {
        if (r.issue_type) types.add(r.issue_type);
        if (r.status) {
          statuses.add(r.status);
          if (r.status_category) statusCategoryByStatus.set(r.status, r.status_category);
        }
        if (r.assignee_display_name) assignees.add(r.assignee_display_name);
      });
      return {
        types: Array.from(types).sort(),
        statuses: Array.from(statuses).sort(),
        assignees: Array.from(assignees).sort(),
        statusCategoryByStatus,
      };
    },
  });

  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profileByName = useMemo(() => {
    const m = new Map<string, { name: string; avatarUrl: string | null | undefined }>();
    approvedProfiles.forEach((p) => {
      if (p.name) m.set(p.name, { name: p.name, avatarUrl: p.avatarUrl });
    });
    return m;
  }, [approvedProfiles]);

  const clearAll = () => {
    userClearedFixRef.current = true;
    setState(EMPTY_STATE);
  };

  const hasUserFilters =
    !!state.search.trim() ||
    state.spaces.length > 0 ||
    state.types.length > 0 ||
    state.statuses.length > 0 ||
    state.assignees.length > 0 ||
    !!state.fixVersion ||
    !!state.jql.trim();

  if (ctxLoading || !ctx) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 240 }}>
        <Spinner size="large" label={`Loading ${config.label.lowerSingular}`} />
      </div>
    );
  }

  // Custom toolbar JSX is rendered as BacklogPage's `customChromeBand` so
  // BacklogPage stays the sole flex child of CatalystShell's bounded
  // `<main>` slot — identical layout chain to `/project-hub/BAU/backlog`
  // (the canonical working scroll surface). Sibling-wrapper approaches
  // break JiraTable's internal-viewport scroll.
  const toolbar = (
    <div style={{ padding: '24px 32px 12px', display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0, background: 'var(--ds-surface)' }}>
      <h1 style={{ margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: TEXT }}>All work</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <TabToggle value={state.mode} onChange={(m) => updateState({ mode: m })} />
        {state.mode === 'basic' ? (
            <>
          <SearchPill value={state.search} onChange={(v) => updateState({ search: v })} />
          <MultiChip
            label="Space"
            value={state.spaces}
            options={spaceOptions.map((s) => ({ id: s.key, label: s.name || s.key }))}
            onChange={(v) => updateState({ spaces: v })}
            renderOption={(opt) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ProjectAvatar projectKey={opt.id} size={16} />
                <span>{opt.label}</span>
              </span>
            )}
          />
          <MultiChip
            label="Assignee"
            value={state.assignees}
            options={[
              { id: '__UNASSIGNED__', label: 'Unassigned' },
              ...chipOptions.assignees.map((o) => ({ id: o, label: o })),
            ]}
            onChange={(v) => updateState({ assignees: v })}
            renderOption={(opt) => {
              if (opt.id === '__UNASSIGNED__') {
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <CatalystAvatar size="small" />
                    <span>{opt.label}</span>
                  </span>
                );
              }
              const p = profileByName.get(opt.id);
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <CatalystAvatar size="small" name={opt.label} src={p?.avatarUrl || undefined} />
                  <span>{opt.label}</span>
                </span>
              );
            }}
          />
          <MultiChip
            label="Type"
            value={state.types}
            options={chipOptions.types.map((o) => ({ id: o, label: o }))}
            onChange={(v) => updateState({ types: v })}
            renderOption={(opt) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <JiraIssueTypeIcon type={opt.id as any} size={14} />
                <span>{opt.label}</span>
              </span>
            )}
          />
          <MultiChip
            label="Status"
            value={state.statuses}
            options={chipOptions.statuses.map((o) => ({ id: o, label: o }))}
            onChange={(v) => updateState({ statuses: v })}
            renderOption={(opt) => (
              <StatusLozengeDropdown
                status={opt.id}
                statusCategory={(chipOptions.statusCategoryByStatus.get(opt.id) as any) ?? null}
                interactive={false}
                size="sm"
              />
            )}
          />
          <FixVersionChip
            op={state.fixVersionOp}
            value={state.fixVersion}
            options={allVersions}
            onChange={(value, op) => updateState({ fixVersion: value, fixVersionOp: op })}
            onRemove={() => updateState({ fixVersion: null, fixVersionOp: 'eq' })}
          />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              value={state.jql}
              onChange={(e) => updateState({ jql: e.currentTarget.value })}
              placeholder='JQL — e.g. fixVersion = "Release 1.119"'
              style={{
                flex: 1, minWidth: 280, height: 32, padding: '0 10px',
                border: `1px solid ${BORDER}`, borderRadius: 3, fontSize: 'var(--ds-font-size-400)',
                background: 'var(--ds-surface)', color: TEXT, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        )}

        {hasUserFilters && (
          <button
            type="button"
            onClick={clearAll}
            style={{ all: 'unset', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', color: BLUE_TEXT, fontWeight: 500, padding: '0 8px' }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );

  // 2026-06-26: prevent initial-empty flash. When state.fixVersion is set
  // (pre-fill from seed effect) BUT releaseLinkedKeys hasn't resolved yet,
  // releaseLinkedKeys is undefined → previously we passed `[]` which made
  // BacklogPage filter to zero rows for one render. Now we wait for the
  // query to resolve before mounting BacklogPage with a restricted set.
  const linkedKeysReady = !state.fixVersion || (releaseLinkedKeys !== undefined && !linkedKeysFetching);
  if (!linkedKeysReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {toolbar}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size="large" label={`Loading ${config.label.lowerSingular} items`} />
        </div>
      </div>
    );
  }

  return (
    <BacklogPage
      projectId={ctx.projectId}
      projectKey={ctx.projectKey}
      hideChrome
      customChromeBand={toolbar}
      {...(state.fixVersion
        ? { restrictToIssueKeys: (releaseLinkedKeys ?? []) }
        : { allItems: true })}
    />
  );
}

// ── Tab toggle (Basic | JQL) ─────────────────────────────────────────────

function TabToggle({ value, onChange }: { value: 'basic' | 'jql'; onChange: (v: 'basic' | 'jql') => void }) {
  const itemStyle = (active: boolean): React.CSSProperties => ({
    all: 'unset', cursor: 'pointer', height: 22, padding: '0 10px',
    fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
    color: active ? BLUE_TEXT : TEXT,
    background: active ? BLUE_BG : 'transparent',
    border: `1px solid ${active ? BLUE : 'transparent'}`,
    borderRadius: 3,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
  });
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 32, padding: '0 4px',
        border: `1px solid ${BORDER}`, borderRadius: 4,
        background: 'var(--ds-surface)',
        boxSizing: 'border-box',
      }}
    >
      <button type="button" onClick={() => onChange('basic')} style={itemStyle(value === 'basic')}>Basic</button>
      <button type="button" onClick={() => onChange('jql')} style={itemStyle(value === 'jql')}>JQL</button>
    </div>
  );
}

function SearchPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
      border: `1px solid ${BORDER}`, borderRadius: 3, background: 'var(--ds-surface)',
      minWidth: 220,
    }}>
      <span style={{ color: SUBTLE, display: 'inline-flex' }}><SearchIcon label="" size="small" /></span>
      <input
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="Search work"
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--ds-font-size-400)', color: TEXT, fontFamily: 'inherit' }}
      />
    </div>
  );
}

function MultiChip({
  label, value, options, onChange, renderOption,
}: {
  label: string;
  value: string[];
  options: { id: string; label: string }[];
  onChange: (next: string[]) => void;
  renderOption?: (opt: { id: string; label: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const tRef = useRef<HTMLButtonElement>(null);
  const pRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open || !tRef.current) return;
    const update = () => {
      const r = tRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tRef.current?.contains(t)) return;
      if (pRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const active = value.length > 0;
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <>
      <button
        ref={tRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 32, padding: '0 10px', borderRadius: 3,
          border: `1px solid ${active ? BLUE : BORDER}`,
          background: active ? BLUE_BG : 'var(--ds-surface)',
          color: active ? BLUE_TEXT : TEXT, fontSize: 'var(--ds-font-size-400)', fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        <span>{label}</span>
        {active && (
          <span style={{
            minWidth: 20, height: 20, padding: '0 6px', borderRadius: 3,
            background: 'var(--ds-background-brand-bold)',
            color: 'var(--ds-text-inverse)',
            fontSize: 'var(--ds-font-size-100)', fontWeight: 700, lineHeight: '20px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', boxSizing: 'border-box',
          }}>
            {value.length}
          </span>
        )}
        <ChevronDownIcon label="" size="small" />
      </button>
      {open && pos && createPortal(
        <div
          ref={pRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999,
            minWidth: 260,
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '4px 0',
          }}
        >
          <div style={{ padding: '8px 8px 6px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 30, padding: '0 8px',
              border: `1px solid ${searchFocused ? BLUE : BORDER}`,
              borderRadius: 3,
              background: 'var(--ds-surface)',
              boxShadow: searchFocused ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
              transition: 'border-color 80ms ease, box-shadow 80ms ease',
            }}>
              <span style={{ color: SUBTLE, display: 'inline-flex' }}><SearchIcon label="" size="small" /></span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={`Search ${label.toLowerCase()}`}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--ds-font-size-400)', color: TEXT, fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 260 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: SUBTLEST }}>No matches</div>
            ) : filtered.map((opt) => {
              const checked = value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  style={{
                    all: 'unset', display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', boxSizing: 'border-box', padding: '4px 12px', cursor: 'pointer',
                    background: checked ? BLUE_BG : 'transparent',
                    color: checked ? BLUE_TEXT : TEXT, fontSize: 'var(--ds-font-size-400)',
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => {}} />
                  {renderOption ? renderOption(opt) : <span>{opt.label}</span>}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function FixVersionChip({
  op, value, options, onChange, onRemove,
}: {
  op: FixVersionOp;
  value: string | null;
  options: string[];
  onChange: (value: string | null, op: FixVersionOp) => void;
  onRemove: () => void;
}) {
  const [opOpen, setOpOpen] = useState(false);
  const [valOpen, setValOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [opPos, setOpPos] = useState<{ top: number; left: number } | null>(null);
  const [valPos, setValPos] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const opRef = useRef<HTMLButtonElement>(null);
  const valRef = useRef<HTMLDivElement>(null);
  const opMenuRef = useRef<HTMLDivElement>(null);
  const valMenuRef = useRef<HTMLDivElement>(null);
  const valSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (valOpen) {
      setQuery('');
      requestAnimationFrame(() => valSearchRef.current?.focus());
    }
  }, [valOpen]);

  useEffect(() => {
    if (!opOpen || !opRef.current) return;
    const update = () => {
      const r = opRef.current!.getBoundingClientRect();
      setOpPos({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [opOpen]);

  useEffect(() => {
    if (!valOpen || !valRef.current) return;
    const update = () => {
      const r = valRef.current!.getBoundingClientRect();
      setValPos({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [valOpen]);

  useEffect(() => {
    if (!opOpen && !valOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (chipRef.current?.contains(t)) return;
      if (opMenuRef.current?.contains(t)) return;
      if (valMenuRef.current?.contains(t)) return;
      setOpOpen(false);
      setValOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [opOpen, valOpen]);

  const active = !!value;
  const opSymbol = op === 'eq' ? '=' : '!=';
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const chipBg = active ? BLUE_BG : (hover ? 'var(--ds-background-neutral-subtle-hovered)' : 'var(--ds-surface)');
  const chipBorder = active ? BLUE : BORDER;
  const chipText = active ? BLUE_TEXT : TEXT;

  return (
    <>
      <div
        ref={chipRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 32, padding: '0 6px 0 10px', borderRadius: 3,
          border: `1px solid ${chipBorder}`, background: chipBg, color: chipText,
          fontSize: 'var(--ds-font-size-400)', fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontWeight: 600 }}>Fix versions</span>
        <button
          ref={opRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); setValOpen(false); setOpOpen((v) => !v); }}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 22, padding: '0 6px',
            border: `1px solid ${BORDER}`, borderRadius: 3,
            background: 'var(--ds-surface)', color: TEXT,
            fontSize: 'var(--ds-font-size-300)', fontWeight: 500,
          }}
        >
          {opSymbol}
          <ChevronDownIcon label="" size="small" />
        </button>
        <div
          ref={valRef}
          onClick={(e) => { e.stopPropagation(); setOpOpen(false); setValOpen((v) => !v); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        >
          <span>{value ?? 'Select version'}</span>
          <ChevronDownIcon label="" size="small" />
        </div>
        <button
          type="button"
          aria-label="Remove filter"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, color: chipText,
          }}
        >
          <CrossIcon label="" size="small" />
        </button>
      </div>
      {opOpen && opPos && createPortal(
        <div
          ref={opMenuRef}
          style={{
            position: 'fixed', top: opPos.top, left: opPos.left, zIndex: 99999,
            minWidth: 160,
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '4px 0',
          }}
        >
          {(['eq', 'neq'] as FixVersionOp[]).map((o) => {
            const checked = op === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(value, o); setOpOpen(false); }}
                style={{
                  all: 'unset', display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', boxSizing: 'border-box', padding: '4px 12px', cursor: 'pointer',
                  background: checked ? BLUE_BG : 'transparent',
                  color: checked ? BLUE_TEXT : TEXT, fontSize: 'var(--ds-font-size-400)',
                }}
              >
                <span style={{ width: 28 }}>{o === 'eq' ? '=' : '!='}</span>
                <span>{o === 'eq' ? 'is equal to' : 'is not equal to'}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
      {valOpen && valPos && createPortal(
        <div
          ref={valMenuRef}
          style={{
            position: 'fixed', top: valPos.top, left: valPos.left, zIndex: 99999,
            minWidth: 280, maxHeight: 360, overflowY: 'auto',
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '8px 0',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '0 8px 8px' }}>
            <input
              ref={valSearchRef}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search versions"
              style={{
                width: '100%', boxSizing: 'border-box', height: 30, padding: '0 8px',
                border: `1px solid ${searchFocused ? BLUE : BORDER}`, borderRadius: 3,
                fontSize: 'var(--ds-font-size-400)', outline: 'none', fontFamily: 'inherit',
                boxShadow: searchFocused ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
                transition: 'border-color 80ms ease, box-shadow 80ms ease',
              }}
            />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: SUBTLEST }}>No versions</div>
          ) : filtered.map((opt) => {
            const checked = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt, op); setValOpen(false); }}
                style={{
                  all: 'unset', display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', boxSizing: 'border-box', padding: '4px 12px', cursor: 'pointer',
                  background: checked ? BLUE_BG : 'transparent',
                  color: checked ? BLUE_TEXT : TEXT, fontSize: 'var(--ds-font-size-400)',
                }}
              >
                <span>{opt}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

export default ReleaseWorkNavigatorPage;
