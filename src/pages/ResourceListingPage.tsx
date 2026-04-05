/**
 * ResourceListingPage — Master resource listing, entry point for Resource Hub
 * Route: /project-hub/resources
 * NOCTURNE Warm Charcoal dark mode compliant
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, RotateCw, Clock, LayoutGrid, Zap,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ExportWorkItems from '@/components/resources/ExportWorkItems';
import { useTheme } from '@/hooks/useTheme';

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

/* ── Token hook ── */
function useTokens() {
  const { isDark } = useTheme();
  return useMemo(() => isDark ? {
    pageBg: '#1A1714',
    cardBg: '#1A1714',
    headerBg: '#232019',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.12)',
    divider: 'rgba(255,255,255,0.05)',
    t1: '#F5F3F0',
    t2: '#A09890',
    t3: '#6B6560',
    t4: 'rgba(245,243,240,0.30)',
    hover: 'rgba(255,255,255,0.04)',
    searchBg: '#232019',
    searchBorder: 'rgba(255,255,255,0.12)',
    searchFocusBorder: '#3B82F6',
    pillBg: '#232019',
    pillBgActive: 'transparent',
    pillBorder: 'rgba(255,255,255,0.10)',
    pillBorderActive: '#F5F3F0',
    pillText: '#A09890',
    pillTextActive: '#F5F3F0',
    pillHoverBg: '#2C2823',
    typePillBg: '#2C2823',
    typePillBgActive: 'transparent',
    typePillBorder: 'rgba(255,255,255,0.08)',
    typePillText: '#A09890',
    badgeBg: '#3A3530',
    badgeText: '#A09890',
    shimmerA: '#232019',
    shimmerB: '#2C2823',
    countBg: '#2C2823',
    countText: '#A09890',
    emptyIcon: '#6B6560',
    tooltipBg: '#2C2823',
    tooltipText: '#F5F3F0',
    isDark: true,
  } : {
    pageBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    headerBg: '#FAFAFA',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    divider: '#f3f4f6',
    t1: '#0F172A',
    t2: '#475569',
    t3: '#94A3B8',
    t4: '#CBD5E1',
    hover: 'rgba(15,23,42,0.04)',
    searchBg: '#FFFFFF',
    searchBorder: '#B0B8C4',
    searchFocusBorder: '#2563EB',
    pillBg: '#FFFFFF',
    pillBgActive: '#FFFFFF',
    pillBorder: '#e5e7eb',
    pillBorderActive: '#111',
    pillText: '#6b7280',
    pillTextActive: '#111',
    pillHoverBg: '#F1F5F9',
    typePillBg: '#F1F5F9',
    typePillBgActive: '#FFFFFF',
    typePillBorder: '#E2E8F0',
    typePillText: '#475569',
    badgeBg: '#E2E8F0',
    badgeText: '#64748B',
    shimmerA: '#F1F5F9',
    shimmerB: '#E2E8F0',
    countBg: '#F1F5F9',
    countText: '#475569',
    emptyIcon: '#D1D5DB',
    tooltipBg: '#1e293b',
    tooltipText: '#f1f5f9',
    isDark: false,
  }, [isDark]);
}

/* ── Constants ── */
const DEPT_COLORS: Record<string, string> = {
  Delivery: '#2563EB',
  Product: '#7C3AED',
  Governance: '#0D9488',
  Operations: '#D97706',
  'Technical Support': '#DC2626',
  'Strategy & Planning': '#0891B2',
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

const AVATAR_COLORS = ['#6b7a8d', '#7a8b6b', '#8b7a6b', '#6b6b8b', '#6b8b8b', '#8b6b7a', '#7a6b8b', '#6b8b7a'];

const hashColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};


/* ── Component ── */
export default function ResourceListingPage() {
  const navigate = useNavigate();
  const tk = useTokens();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('Delivery');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'core' | 'project' | 'temporary'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const { data: resources = [], isLoading } = useQuery({
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
        (supabase as any).from('vw_wh_resource_360').select('resource_id'),
        (supabase as any).from('ph_issues').select('reporter_account_id'),
      ]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = sorted.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const navTo = (id: string, view: string) => {
    navigate(`/project-hub/resources/${id}?view=${view}`);
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Inter', sans-serif", height: '100%', overflow: 'auto', background: tk.pageBg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: tk.t1, margin: 0 }}>Resources</h1>
        <span style={{
          fontSize: '12px', fontWeight: 700, color: tk.t2,
          background: tk.countBg, borderRadius: '10px', padding: '3px 10px',
        }}>
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: tk.t3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, or department…"
            style={{
              width: '100%', padding: '10px 14px 10px 40px',
              fontSize: '13.5px', fontWeight: 500,
              background: tk.searchBg, border: `1.5px solid ${tk.searchBorder}`,
              borderRadius: '8px', outline: 'none', color: tk.t1,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = tk.searchFocusBorder; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = tk.searchBorder; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Department pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <PillButton active={deptFilter === 'All'} onClick={() => { setDeptFilter('All'); setResourceTypeFilter('all'); }}
            label="All" tk={tk} />
          {deptNames.map(d => (
            <PillButton key={d} active={deptFilter === d} onClick={() => { setDeptFilter(d); setResourceTypeFilter('all'); }}
              label={`${d} (${deptCounts[d]})`} tk={tk} />
          ))}

          <div style={{ width: 1, height: 24, background: tk.border, margin: '0 4px' }} />
          <ExportWorkItems deptFilter={deptFilter} />
        </div>
      </div>

      {/* Resource Type Filter Pills */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 0 4px 0', alignItems: 'center' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: tk.t3,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginRight: 4, alignSelf: 'center',
        }}>
          Resource Type
        </span>
        {([
          { key: 'all' as const, label: 'All', accentColor: tk.isDark ? '#F5F3F0' : '#1E293B' },
          { key: 'core' as const, label: 'Core', accentColor: '#0D9488' },
          { key: 'project' as const, label: 'Project', accentColor: '#3B82F6' },
          { key: 'temporary' as const, label: 'Temporary', accentColor: tk.isDark ? '#A09890' : '#64748B' },
        ] as const).map(pill => {
          const isActive = resourceTypeFilter === pill.key;
          const count = resourceTypeCounts[pill.key];
          const showBadge = pill.key !== 'all' && count > 0;
          return (
            <button
              key={pill.key}
              onClick={() => setResourceTypeFilter(pill.key)}
              style={{
                height: 28, padding: '0 12px', borderRadius: 14,
                fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: isActive ? `1.5px solid ${pill.accentColor}` : `1px solid ${tk.typePillBorder}`,
                background: isActive ? tk.typePillBgActive : tk.typePillBg,
                color: isActive ? pill.accentColor : tk.typePillText,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = tk.pillHoverBg;
                  e.currentTarget.style.color = tk.t1;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = tk.typePillBg;
                  e.currentTarget.style.color = tk.typePillText;
                }
              }}
            >
              {pill.label}
              {showBadge && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.08)' : tk.badgeBg,
                  color: isActive ? 'inherit' : tk.badgeText,
                  borderRadius: 10, padding: '1px 6px',
                  fontSize: 11, fontWeight: 600, marginLeft: 4,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{
        border: `1px solid ${tk.border}`, borderRadius: '12px', overflow: 'hidden',
        background: tk.cardBg,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.key !== 'actions' && handleSort(col.key as SortKey)}
                    style={{
                      background: tk.headerBg, padding: '0 16px', height: '36px',
                      fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase' as const,
                      letterSpacing: '0.07em', color: tk.t3,
                      borderBottom: `0.75px solid ${tk.border}`,
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
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {COLUMNS.map(col => (
                      <td key={col.key} style={{ padding: '8px 16px', height: '36px' }}>
                        <div style={{
                          height: '14px', borderRadius: '4px',
                          background: `linear-gradient(90deg, ${tk.shimmerA} 25%, ${tk.shimmerB} 50%, ${tk.shimmerA} 75%)`,
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Search size={32} style={{ color: tk.emptyIcon, margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: tk.t1, marginBottom: '4px' }}>No resources match your search.</div>
                    <div style={{ fontSize: '12px', color: tk.t3 }}>Try adjusting your search or filters</div>
                  </td>
                </tr>
              ) : paginatedRows.map(r => (
                <tr
                  key={r.rid}
                  className="group"
                  style={{ borderBottom: `0.75px solid ${tk.divider}`, cursor: 'pointer', height: '36px', maxHeight: '36px' }}
                  onClick={() => navTo(r.id, 'ring')}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = tk.hover; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* RESOURCE */}
                  <td style={{ padding: '4px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ResourceAvatar name={r.full_name} avatarUrl={r.avatar_url} size={32} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 600, color: tk.t1,
                          lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}>{r.full_name}</div>
                        <div style={{ fontSize: '11px', color: tk.t3, marginTop: 1 }}>RID: {r.rid}</div>
                      </div>
                    </div>
                  </td>
                  {/* DEPARTMENT */}
                  <td style={{ padding: '4px 16px' }}>
                    {r.dept_name ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', fontWeight: 500, color: tk.t2,
                      }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: DEPT_COLORS[r.dept_name] || '#2563EB', flexShrink: 0,
                        }} />
                        {r.dept_name}
                      </span>
                    ) : <span style={{ fontSize: '13px', color: tk.t4 }}>—</span>}
                  </td>
                  {/* JOB ROLE */}
                  <td style={{ padding: '4px 16px', fontSize: '13px', fontWeight: 600, color: tk.t1 }}>
                    {r.job_role || '—'}
                  </td>
                  {/* ASSIGNMENT */}
                  <td style={{
                    padding: '4px 16px', fontSize: '13px', color: tk.t2,
                    maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.assignment_name || '—'}
                  </td>
                  {/* LOCATION */}
                  <td style={{ padding: '4px 16px' }}>
                    {r.location_type ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: r.location_type === 'Onsite' ? '#93C5FD' : '#86EFAC',
                        }} />
                        <span style={{ color: tk.t2 }}>
                          {r.location_type}
                        </span>
                      </span>
                    ) : <span style={{ fontSize: '13px', color: tk.t4 }}>—</span>}
                  </td>
                  {/* ACTIONS — hover reveal (FP-005) */}
                  <td style={{ padding: '4px 16px', textAlign: 'center' }}>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ display: 'inline-flex', gap: '6px' }}>
                      <ActionBtn
                        tooltip="Open Intelligence"
                        bg="#7C3AED" bgHover="#6D28D9"
                        shadowColor="rgba(124,58,237,0.2)"
                        icon={<Zap size={14} strokeWidth={1.9} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project-hub/resources/${r.id}?view=ring&intel=true`);
                        }}
                      />
                      <ActionBtn
                        tooltip="Resource 360°"
                        bg={tk.isDark ? '#A09890' : '#1e293b'} bgHover={tk.isDark ? '#F5F3F0' : '#0f172a'}
                        icon={<RotateCw size={14} strokeWidth={1.9} />}
                        onClick={(e) => { e.stopPropagation(); navTo(r.id, 'ring'); }}
                      />
                      <ActionBtn
                        tooltip="Chronology View"
                        bg="#2563eb" bgHover="#1d4ed8"
                        shadowColor="rgba(37,99,235,0.2)"
                        icon={<Clock size={14} strokeWidth={1.9} />}
                        onClick={(e) => { e.stopPropagation(); navTo(r.id, 'chronology'); }}
                      />
                      <ActionBtn
                        tooltip="Board View"
                        bg="#0d9488" bgHover="#0f766e"
                        shadowColor="rgba(13,148,136,0.2)"
                        icon={<LayoutGrid size={14} strokeWidth={1.9} />}
                        onClick={(e) => { e.stopPropagation(); navTo(r.id, 'board'); }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', fontSize: '13px', color: tk.t2,
        }}>
          <span>Showing {((safeCurrentPage - 1) * perPage) + 1}–{Math.min(safeCurrentPage * perPage, sorted.length)} of {sorted.length} resources</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{
                width: 32, height: 32, borderRadius: 6, border: `1px solid ${tk.border}`,
                background: 'transparent', color: safeCurrentPage <= 1 ? tk.t4 : tk.t2,
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '14px',
              }}
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  width: 32, height: 32, borderRadius: 6, fontSize: '13px', fontWeight: 600,
                  border: `1px solid ${p === safeCurrentPage ? '#3B82F6' : tk.border}`,
                  background: p === safeCurrentPage ? '#3B82F6' : 'transparent',
                  color: p === safeCurrentPage ? '#FFFFFF' : tk.t2,
                  cursor: 'pointer',
                }}
              >{p}</button>
            ))}
            <button
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{
                width: 32, height: 32, borderRadius: 6, border: `1px solid ${tk.border}`,
                background: 'transparent', color: safeCurrentPage >= totalPages ? tk.t4 : tk.t2,
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '14px',
              }}
            >›</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes r360shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function PillButton({ active, onClick, label, tk }: { active: boolean; onClick: () => void; label: string; tk: ReturnType<typeof useTokens> }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: tk.pillBg,
        border: `1.5px solid ${active ? tk.pillBorderActive : tk.pillBorder}`,
        color: active ? tk.pillTextActive : tk.pillText,
        borderRadius: '20px',
        padding: '6px 16px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color 150ms, color 150ms, background 150ms',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = tk.pillHoverBg;
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = tk.pillBg;
      }}
    >
      {label}
    </button>
  );
}

function ResourceAvatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: hashColor(name), color: '#ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 36 ? '11px' : '13px', fontWeight: 600, flexShrink: 0,
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
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            aria-label={tooltip}
            title={tooltip}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: `1px solid ${bg}`, background: 'transparent', color: bg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
              transition: 'background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease, color 0.12s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = bg;
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.boxShadow = `0 2px 8px ${shadowColor || 'rgba(0,0,0,0.12)'}`;
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
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[#2C2823] text-[#F5F3F0] text-[11px] rounded-md px-2 py-1">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
