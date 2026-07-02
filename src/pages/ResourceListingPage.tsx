/**
 * ResourceListingPage — Master resource listing, entry point for Resource Hub
 * Route: /project-hub/resources
 * ECLIPSE DARK MODE: Full dark mode support with ads-neutral palette
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import {
  Search, RotateCw, Clock, LayoutGrid, Zap,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from '@/lib/atlaskit-icons';
import { Tooltip } from '@/components/ads';
import { SectionMessage } from '@/components/ads/SectionMessage';
import ExportWorkItems from '@/components/resources/ExportWorkItems';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useIsDark } from '@/components/strategy/themes/useIsDark';

/* ── Types ── */
interface Resource {
  id: string;
  rid: string;
  full_name: string;
  job_role: string | null;
  location_type: string | null;
  dept_name: string | null;
  assignment_name: string | null;
  vendor_name: string | null;
  avatar_url: string | null;
  resource_type: string | null;
}

/* ── Constants ── */
const DEPT_COLORS: Record<string, string> = {
  Delivery: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  Product: 'var(--cp-purple-60, var(--ds-background-discovery-bold))',
  Governance: 'var(--cp-teal-60, var(--ds-chart-teal-bold))',
  Operations: 'var(--ds-text-warning, var(--cp-warning))',
  'Technical Support': 'var(--ds-text-danger, var(--cp-danger))',
  'Strategy & Planning': 'var(--ds-link)',
};

type SortKey = 'full_name' | 'dept_name' | 'job_role' | 'assignment_name' | 'location_type' | 'vendor_name';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey | 'actions'; label: string; minWidth?: number; width?: number; center?: boolean }[] = [
  { key: 'full_name', label: 'RESOURCE', minWidth: 260 },
  { key: 'dept_name', label: 'DEPARTMENT' },
  { key: 'job_role', label: 'JOB ROLE' },
  { key: 'assignment_name', label: 'ASSIGNMENT' },
  { key: 'location_type', label: 'LOCATION' },
  { key: 'actions', label: 'ACTIONS', width: 180, center: true },
];

/* ── Helpers ── */
const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
};
const AVATAR_COLORS = ['var(--ds-chart-blue-bold)', 'var(--ds-chart-green-bold)', 'var(--ds-chart-orange-bold)', 'var(--ds-background-discovery-bold)', 'var(--ds-chart-teal-bold)', 'var(--ds-chart-magenta-bold)', 'var(--ds-chart-purple-bold)', 'var(--ds-background-discovery)'];

const hashColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/* ── Dark mode token map ── */
function useTokens(dk: boolean) {
  return useMemo(() => ({
    pageBg:       dk ? 'var(--ds-surface)' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    surfaceBg:    dk ? 'var(--ds-surface)' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    elevatedBg:   dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    headerBg:     dk ? 'var(--ds-text)' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    hoverBg:      dk ? 'var(--ds-surface-overlay)' : 'var(--ds-surface-sunken)',
    border:       dk ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))',
    borderSubtle: dk ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-background-neutral-subtle)',
    borderInput:  dk ? 'var(--ds-border-bold)' : 'var(--ds-border)',
    borderFocus:  'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
    text1:        dk ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))',
    text2:        dk ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtle)',
    text3:        dk ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
    textMuted:    dk ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest)',
    textDim:      dk ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-border)',
    inputBg:      dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    badgeBg:      dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
    badgeText:    dk ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtle)',
    pillBg:       dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    pillBorder:   dk ? 'var(--ds-border-bold)' : 'var(--ds-border)',
    pillActiveBorder: dk ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text)',
    pillActiveText:   dk ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text)',
    pillInactiveText: dk ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest)',
    pillHoverBg:  dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
    pillHoverText: dk ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text)',
    typePillBg:       dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--ds-surface-sunken)',
    typePillActiveBg: dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    shimmerFrom:  dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
    shimmerMid:   dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))',
    tooltipBg:    dk ? 'var(--ds-surface-raised, var(--cp-ink-1))' : 'var(--ds-text)',
    tooltipText:  dk ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-surface-sunken)',
    divider:      dk ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))',
    focusShadow:  dk ? '0 0 0 3px var(--ds-background-information, rgba(37,99,235,.2))' : '0 0 0 3px var(--ds-background-information, rgba(37,99,235,.1))',
  }), [dk]);
}

const getRowsPerPage = () => {
  if (typeof window === 'undefined') return 16;

  return Math.min(20, Math.max(10, Math.floor((window.innerHeight - 380) / 36)));
};

/* ── Component ── */
export default function ResourceListingPage() {
  const navigate = useNavigate();
  const isDark = useIsDark();
  const t = useTokens(isDark);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('Delivery');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'core' | 'project' | 'temporary'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(() => getRowsPerPage());

  useEffect(() => {
    const handleResize = () => setPerPage(getRowsPerPage());

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: resources = [], isLoading, isPending, isError, error, refetch } = useQuery({
    queryKey: ['resources-listing', 'all-types-v1'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, rid, name, role_name, profile_id, department_id, assignment_id, vendor_id, vendor_name, department_name, location_id, jira_account_id, avatar_url, resource_type')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;

      const profileIds = (data || []).map((r: any) => r.profile_id).filter(Boolean);
      const [{ data: depts }, { data: assignments }, { data: locations }, { data: profiles }, { data: assignedRids }, { data: contributedAccounts }] = await Promise.all([
        supabase.from('capacity_departments').select('id, name'),
        supabase.from('resource_assignments').select('id, name'),
        supabase.from('resource_locations').select('id, name'),
        profileIds.length > 0
          ? supabase.from('profiles').select('id, avatar_url').in('id', profileIds)
          : Promise.resolve({ data: [] }),
        typedQuery('vw_wh_resource_360').select('resource_id'),
        typedQuery('ph_issues').select('reporter_account_id'),
      ]);

      const ridsWithAssigned = new Set((assignedRids || []).map((r: any) => r.resource_id));
      const jiraIdsWithContrib = new Set((contributedAccounts || []).map((r: any) => r.reporter_account_id).filter(Boolean));

      const deptMap = new Map((depts || []).map((d: any) => [d.id, d.name]));
      const assignMap = new Map((assignments || []).map((a: any) => [a.id, a.name]));
      const locMap = new Map((locations || []).map((l: any) => [l.id, l.name]));
      const avatarMap = new Map((profiles || []).map((p: any) => [p.id, p.avatar_url]));

      return ((data || []) as any[])
        .filter((r: any) => (r.role_name || '').trim().toLowerCase() !== 'management')
        .map((r: any): Resource => ({
          id: r.id,
          rid: r.rid,
          full_name: r.name,
          job_role: r.role_name,
          location_type: locMap.get(r.location_id) || null,
          dept_name: deptMap.get(r.department_id) || r.department_name || null,
          assignment_name: assignMap.get(r.assignment_id) || null,
          vendor_name: r.vendor_name || null,
          avatar_url: r.avatar_url || (r.profile_id ? (avatarMap.get(r.profile_id) || null) : null),
          resource_type: (r.resource_type || '').trim().toLowerCase() || null,
        }));
    },
  });

  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach(r => {
      const d = r.dept_name || 'Unknown';
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const deptNames = useMemo(() =>
    Object.entries(deptCounts).sort(([, a], [, b]) => b - a).map(([name]) => name),
    [deptCounts]
  );

  const deptFiltered = useMemo(() => {
    if (deptFilter === 'All') return resources;
    return resources.filter(r => r.dept_name === deptFilter);
  }, [resources, deptFilter]);

  const resourceTypeCounts = useMemo(() => {
    const counts = { all: deptFiltered.length, core: 0, project: 0, temporary: 0 };
    deptFiltered.forEach(r => {
      const rt = r.resource_type;
      if (rt === 'variable' || rt === 'permanent') counts.core++;
      else if (rt === 'fixed') counts.project++;
      else if (rt === 'freelance') counts.temporary++;
    });
    return counts;
  }, [deptFiltered]);

  const filtered = useMemo(() => {
    let list = deptFiltered;
    if (resourceTypeFilter === 'core') list = list.filter(r => ['variable', 'permanent'].includes(r.resource_type || ''));
    else if (resourceTypeFilter === 'project') list = list.filter(r => r.resource_type === 'fixed');
    else if (resourceTypeFilter === 'temporary') list = list.filter(r => r.resource_type === 'freelance');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.job_role || '').toLowerCase().includes(q) ||
        (r.dept_name || '').toLowerCase().includes(q) ||
        (r.assignment_name || '').toLowerCase().includes(q) ||
        (r.rid || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [deptFiltered, resourceTypeFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortKey] || '').toLowerCase();
      const bVal = (b[sortKey] || '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageData = sorted.slice((safePage - 1) * perPage, safePage * perPage);
  const startIdx = (safePage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, sorted.length);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const navTo = (id: string, view: string) => {
    navigate(`/project-hub/resources/${id}?view=${view}`);
  };

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.pageBg }}>
      {/* ═══ Canonical Header ═══ */}
      <CatalystPageHeader
        title="Resources"
        actions={<ExportWorkItems deptFilter={deptFilter} />}
      />

      <div style={{ padding: '0 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* ═══ Search + Department Pills ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {/* Search — 36px height, 4px radius */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '48%', transform: 'translateY(-50%)', color: t.text3 }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, role, or department..."
              style={{
                width: '100%', height: 36, padding: '0 12px 0 32px',
                fontSize: 'var(--ds-font-size-300)', fontWeight: 500,
                background: t.inputBg, border: `1px solid ${t.borderInput}`,
                borderRadius: '4px', outline: 'none', color: t.text1,
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = t.borderFocus; e.currentTarget.style.boxShadow = t.focusShadow; }}
              onBlur={e => { e.currentTarget.style.borderColor = t.borderInput; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Department pills — compact, 1px border, 3px radius */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
            <PillButton active={deptFilter === 'All'} onClick={() => { setDeptFilter('All'); setResourceTypeFilter('all'); setPage(1); }}
              label="All" tokens={t} />
            {deptNames.map(d => (
              <PillButton key={d} active={deptFilter === d} onClick={() => { setDeptFilter(d); setResourceTypeFilter('all'); setPage(1); }}
                label={`${d} (${deptCounts[d]})`} tokens={t} />
            ))}
          </div>
        </div>

        {/* ═══ Resource Type Filter — compact row ═══ */}
        <div style={{ display: 'flex', gap: 4, padding: '0 0 8px 0', alignItems: 'center' }}>
          <span style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: t.text3,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginRight: 4,
          }}>
            Resource Type
          </span>
          {([
            { key: 'all' as const, label: 'All' },
            { key: 'core' as const, label: 'Core' },
            { key: 'project' as const, label: 'Project' },
            { key: 'temporary' as const, label: 'Temporary' },
          ] as const).map(pill => {
            const isActive = resourceTypeFilter === pill.key;
            const count = resourceTypeCounts[pill.key];
            const showBadge = pill.key !== 'all' && count > 0;
            return (
              <button
                key={pill.key}
                onClick={() => { setResourceTypeFilter(pill.key); setPage(1); }}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 3,
                  fontSize: 'var(--ds-font-size-200)', fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                  transition: 'all 150ms ease',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  border: isActive ? `1.5px solid ${isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text)'}` : `1px solid ${t.pillBorder}`,
                  background: isActive ? t.typePillActiveBg : 'transparent',
                  color: isActive ? (isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text)') : t.text2,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = t.pillHoverBg;
                    e.currentTarget.style.color = t.pillHoverText;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = t.text2;
                  }
                }}
              >
                {pill.label}
                {showBadge && (
                  <span style={{
                    background: isActive ? ('var(--cp-border-subtle, var(--ds-shadow-raised, rgba(0,0,0,0.06)))') : t.badgeBg,
                    color: isActive ? 'inherit' : t.text3,
                    borderRadius: 3, padding: '0 5px',
                    fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ Table ═══ */}
        <div style={{
          border: `1px solid ${t.border}`, borderRadius: '6px', overflow: 'hidden',
          background: t.surfaceBg, flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ overflowX: 'auto', flex: 1, minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'actions' && handleSort(col.key as SortKey)}
                      style={{
                        background: t.headerBg, padding: '0 12px', height: '36px',
                        fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em', color: t.text2,
                        borderBottom: `0.75px solid ${t.border}`,
                        cursor: col.key !== 'actions' ? 'pointer' : 'default',
                        textAlign: col.center ? 'center' : 'left',
                        minWidth: col.minWidth, width: col.width,
                        userSelect: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {col.label}
                        {col.key !== 'actions' && sortKey === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp size={12} strokeWidth={2.5} />
                            : <ChevronDown size={12} strokeWidth={2.5} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* isError alone misses the persisted-cache case: hydrated data
                    keeps status 'success' while the background refetch fails and
                    only `error` is set. */}
                {isError || error ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px 24px' }}>
                      <div style={{ maxWidth: 720 }}>
                        <SectionMessage
                          appearance="error"
                          title="Couldn't load resources"
                          actions={[{ key: 'retry', text: 'Retry', onClick: () => refetch() }]}
                        >
                          {(error as Error)?.message ?? 'Unknown error loading resources.'}
                        </SectionMessage>
                      </div>
                    </td>
                  </tr>
                ) : isLoading || isPending ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '4px 12px', height: '36px', maxHeight: '36px' }}>
                          <div style={{
                            height: '12px', borderRadius: '3px',
                            background: `linear-gradient(90deg, ${t.shimmerFrom} 25%, ${t.shimmerMid} 50%, ${t.shimmerFrom} 75%)`,
                            backgroundSize: '200% 100%',
                            animation: 'r360shimmer 1.5s infinite',
                            width: col.key === 'actions' ? '100px' : '60%',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <Search size={32} style={{ color: t.textDim, margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: t.text1, marginBottom: '4px' }}>No resources match your search.</div>
                      <div style={{ fontSize: 'var(--ds-font-size-200)', color: t.text3 }}>Try adjusting your search or filters</div>
                    </td>
                  </tr>
                ) : pageData.map(r => (
                  <tr
                    key={r.rid}
                    className="r360-row"
                    style={{ borderBottom: `0.75px solid ${t.borderSubtle}`, cursor: 'pointer', height: '36px', maxHeight: '36px' }}
                    onClick={() => navTo(r.id, 'ring')}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.hoverBg; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* RESOURCE */}
                    <td style={{ padding: '4px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ResourceAvatar name={r.full_name} avatarUrl={r.avatar_url} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: t.text1,
                            lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: '220px',
                          }}>{r.full_name}</div>
                          <div style={{ fontSize: 'var(--ds-font-size-100)', color: t.textMuted, marginTop: 0 }}>RID: {r.rid}</div>
                        </div>
                      </div>
                    </td>
                    {/* DEPARTMENT */}
                    <td style={{ padding: '4px 12px' }}>
                      {r.dept_name ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: t.text2,
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: DEPT_COLORS[r.dept_name] || 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', flexShrink: 0,
                          }} />
                          {r.dept_name}
                        </span>
                      ) : <span style={{ fontSize: 'var(--ds-font-size-300)', color: t.textDim }}>—</span>}
                    </td>
                    {/* JOB ROLE */}
                    <td style={{ padding: '4px 12px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: t.text1 }}>
                      {r.job_role || '—'}
                    </td>
                    {/* ASSIGNMENT */}
                    <td style={{
                      padding: '4px 12px', fontSize: 'var(--ds-font-size-300)', color: t.text2,
                      maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.assignment_name || '—'}
                    </td>
                    {/* LOCATION — neutral text, no semantic colors */}
                    <td style={{ padding: '4px 12px' }}>
                      {r.location_type ? (
                        <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: t.text2 }}>
                          {r.location_type}
                        </span>
                      ) : <span style={{ fontSize: 'var(--ds-font-size-300)', color: t.textDim }}>—</span>}
                    </td>
                    {/* ACTIONS — opacity:0 hover reveal */}
                    <td style={{ padding: '4px 12px', textAlign: 'center' }}>
                      <div className="r360-actions" style={{ display: 'inline-flex', gap: '4px', opacity: 0, transition: 'opacity 150ms ease' }}>
                        <ActionBtn
                          tooltip="Open Intelligence"
                          bg="var(--cp-purple-60, var(--ds-background-discovery-bold))" bgHover="var(--ds-background-discovery-bold)"
                          shadowColor="var(--ds-background-discovery-bold, rgba(124,58,237,0.2))"
                          icon={<Zap size={13} strokeWidth={1.9} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/project-hub/resources/${r.id}?view=ring&intel=true`);
                          }}
                        />
                        <ActionBtn
                          tooltip="Resource 360°"
                          bg={'var(--cp-text-secondary, var(--ds-text))'} bgHover={'var(--cp-text-primary, var(--ds-text))'}
                          icon={<RotateCw size={13} strokeWidth={1.9} />}
                          onClick={(e) => { e.stopPropagation(); navTo(r.id, 'ring'); }}
                        />
                        <ActionBtn
                          tooltip="Chronology View"
                          bg="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))" bgHover="var(--ds-background-brand-bold-hovered)"
                          shadowColor="var(--ds-background-information, rgba(37,99,235,0.2))"
                          icon={<Clock size={13} strokeWidth={1.9} />}
                          onClick={(e) => { e.stopPropagation(); navTo(r.id, 'chronology'); }}
                        />
                        <ActionBtn
                          tooltip="Board View"
                          bg="var(--ds-chart-teal-bold)" bgHover="var(--ds-chart-teal-bolder)"
                          shadowColor="var(--ds-background-success, rgba(13,148,136,0.2))"
                          icon={<LayoutGrid size={13} strokeWidth={1.9} />}
                          onClick={(e) => { e.stopPropagation(); navTo(r.id, 'board'); }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px',
              borderTop: `0.75px solid ${t.border}`,
              fontSize: 'var(--ds-font-size-200)', color: t.text2,
            }}>
              <span>
                Showing {startIdx + 1}–{endIdx} of {sorted.length} resources
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    width: 28, height: 28, borderRadius: 4,
                    border: `1px solid ${t.border}`, background: 'transparent',
                    color: safePage === 1 ? t.textDim : t.text2,
                    cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--ds-font-size-200)',
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      width: 28, height: 28, borderRadius: 4,
                      border: `1px solid ${safePage === n ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : t.border}`,
                      background: safePage === n ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'transparent',
                      color: safePage === n ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-text-inverse))))' : t.text2,
                      fontWeight: safePage === n ? 600 : 400,
                      cursor: 'pointer', fontSize: 'var(--ds-font-size-200)',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{
                    width: 28, height: 28, borderRadius: 4,
                    border: `1px solid ${t.border}`, background: 'transparent',
                    color: safePage === totalPages ? t.textDim : t.text2,
                    cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--ds-font-size-200)',
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes r360shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .r360-row:hover .r360-actions {
          opacity: 1 !important;
        }
      `}</style>

    </div>
  );
}

/* ── Sub-components ── */

interface TokenMap {
  pillBg: string;
  pillBorder: string;
  pillActiveBorder: string;
  pillActiveText: string;
  pillInactiveText: string;
  pillHoverBg: string;
  pillHoverText: string;
}

function PillButton({ active, onClick, label, tokens }: { active: boolean; onClick: () => void; label: string; tokens: TokenMap }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? tokens.pillBg : 'transparent',
        border: `1px solid ${active ? tokens.pillActiveBorder : tokens.pillBorder}`,
        color: active ? tokens.pillActiveText : tokens.pillInactiveText,
        borderRadius: '3px',
        padding: '0 12px',
        height: 30,
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color 150ms, color 150ms, background 150ms',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = tokens.pillHoverBg;
          e.currentTarget.style.color = tokens.pillHoverText;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = tokens.pillInactiveText;
        }
      }}
    >
      {label}
    </button>
  );
}

function ResourceAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: hashColor(name), color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 'var(--ds-font-size-100)', fontWeight: 600, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

function ActionBtn({
  tooltip, bg, bgHover, shadowColor, icon, onClick,
}: {
  tooltip: string;
  bg: string;
  bgHover: string;
  shadowColor?: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Tooltip content={tooltip} position="top" delay={200}>
      <button
        onClick={onClick}
        aria-label={tooltip}
        title={tooltip}
        style={{
          width: 26, height: 26, borderRadius: 4,
          border: `1px solid ${bg}`, background: 'transparent', color: bg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
          transition: 'background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease, color 0.12s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = bg;
          e.currentTarget.style.color = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))';
          e.currentTarget.style.boxShadow = `0 2px 8px ${shadowColor || 'var(--ds-shadow-raised, rgba(0,0,0,0.12))'}`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = bg;
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
