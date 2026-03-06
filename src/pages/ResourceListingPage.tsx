/**
 * ResourceListingPage — Master resource listing, entry point for Resource Hub
 * Route: /project-hub/resources
 * Executive Elevation: avatar pipeline, dynamic dept pills, filled action buttons, export dropdown
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
  { key: 'vendor_name', label: 'VENDOR' },
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
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('Delivery');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'core' | 'project' | 'temporary'>('all');



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

      const ridsWithAssigned = new Set((assignedRids || []).map((r: any) => r.resource_id));
      const jiraIdsWithContrib = new Set((contributedAccounts || []).map((r: any) => r.reporter_account_id).filter(Boolean));

      const deptMap = new Map((depts || []).map((d: any) => [d.id, d.name]));
      const assignMap = new Map((assignments || []).map((a: any) => [a.id, a.name]));
      const locMap = new Map((locations || []).map((l: any) => [l.id, l.name]));
      const avatarMap = new Map((profiles || []).map((p: any) => [p.id, p.avatar_url]));

      return ((data || []) as any[])
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

  // Department counts (dynamic from data)
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

  // Resource type counts (within current dept filter)
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

  // Filter
  const filtered = useMemo(() => {
    let list = deptFiltered;
    // Resource type filter
    if (resourceTypeFilter === 'core') list = list.filter(r => ['variable', 'permanent'].includes(r.resource_type || ''));
    else if (resourceTypeFilter === 'project') list = list.filter(r => r.resource_type === 'fixed');
    else if (resourceTypeFilter === 'temporary') list = list.filter(r => r.resource_type === 'freelance');
    // Search
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

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortKey] || '').toLowerCase();
      const bVal = (b[sortKey] || '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const navTo = (id: string, view: string) => {
    navigate(`/project-hub/resources/${id}?view=${view}`);
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Inter', sans-serif", height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Resources</h1>
        <span style={{
          fontSize: '12px', fontWeight: 700, color: '#475569',
          background: '#F1F5F9', borderRadius: '10px', padding: '3px 10px',
        }}>
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Toolbar: Search + Dept Pills + Intelligence + Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, or department…"
            style={{
              width: '100%', padding: '10px 14px 10px 40px',
              fontSize: '13.5px', fontWeight: 500,
              background: '#fff', border: '1.5px solid #B0B8C4',
              borderRadius: '8px', outline: 'none', color: '#0F172A',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#B0B8C4'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Department pills (dynamic) */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <PillButton active={deptFilter === 'All'} onClick={() => { setDeptFilter('All'); setResourceTypeFilter('all'); }}
            label={`All`} />
          {deptNames.map(d => (
            <PillButton key={d} active={deptFilter === d} onClick={() => { setDeptFilter(d); setResourceTypeFilter('all'); }}
              label={`${d} (${deptCounts[d]})`} />
          ))}

          <div style={{ width: 1, height: 24, background: '#E2E8F0', margin: '0 4px' }} />

           {/* Export dropdown */}
          <ExportWorkItems deptFilter={deptFilter} />
        </div>
      </div>

      {/* Resource Type Filter Pills */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 0 4px 0', alignItems: 'center' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#64748B',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginRight: 4, alignSelf: 'center',
        }}>
          Resource Type
        </span>
        {([
          { key: 'all' as const, label: 'All', accentColor: '#1E293B', tooltip: 'Show all resource types' },
          { key: 'core' as const, label: 'Core', accentColor: '#0D9488', tooltip: 'Variable + Permanent (org headcount)' },
          /* Exception: blue used here for "Project" filter — signals structured project engagement, NOT a +Create CTA */
          { key: 'project' as const, label: 'Project', accentColor: '#2563EB', tooltip: 'Fixed-term project resources' },
          { key: 'temporary' as const, label: 'Temporary', accentColor: '#64748B', tooltip: 'Freelance / time-bounded engagements' },
        ] as const).map(pill => {
          const isActive = resourceTypeFilter === pill.key;
          const count = resourceTypeCounts[pill.key];
          const showBadge = pill.key !== 'all' && count > 0;
          return (
            <button
              key={pill.key}
              title={pill.tooltip}
              onClick={() => setResourceTypeFilter(pill.key)}
              style={{
                height: 28, padding: '0 12px', borderRadius: 14,
                fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: isActive ? `1.5px solid ${pill.accentColor}` : '1px solid #E2E8F0',
                background: isActive ? '#FFFFFF' : '#F1F5F9',
                color: isActive ? pill.accentColor : '#475569',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#E2E8F0';
                  e.currentTarget.style.color = '#1E293B';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              {pill.label}
              {showBadge && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                  color: isActive ? undefined : '#64748B',
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
        border: '1.5px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden',
        background: '#FFFFFF',
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
                      background: '#FAFAFA', padding: '0 16px', height: '40px',
                      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
                      letterSpacing: '0.07em', color: '#475569',
                      borderBottom: '1px solid #e5e7eb',
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
                      <td key={col.key} style={{ padding: '12px 16px', height: '60px' }}>
                        <div style={{
                          height: '16px', borderRadius: '4px',
                          background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Search size={32} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>No resources match your search.</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Try adjusting your search or filters</div>
                  </td>
                </tr>
              ) : sorted.map(r => (
                <tr
                  key={r.rid}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', height: '60px' }}
                  onClick={() => navTo(r.id, 'ring')}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* RESOURCE */}
                  <td style={{ padding: '8px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ResourceAvatar name={r.full_name} avatarUrl={r.avatar_url} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: 600, color: '#111',
                          lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}>{r.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: 1 }}>RID: {r.rid}</div>
                      </div>
                    </div>
                  </td>
                  {/* DEPARTMENT */}
                  <td style={{ padding: '8px 16px' }}>
                    {r.dept_name ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', fontWeight: 500, color: '#374151',
                      }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: DEPT_COLORS[r.dept_name] || '#2563EB', flexShrink: 0,
                        }} />
                        {r.dept_name}
                      </span>
                    ) : <span style={{ fontSize: '13px', color: '#d1d5db' }}>—</span>}
                  </td>
                  {/* JOB ROLE */}
                  <td style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#111' }}>
                    {r.job_role || '—'}
                  </td>
                  {/* ASSIGNMENT */}
                  <td style={{
                    padding: '8px 16px', fontSize: '13px', color: '#4b5563',
                    maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.assignment_name || '—'}
                  </td>
                  {/* LOCATION */}
                  <td style={{ padding: '8px 16px' }}>
                    {r.location_type ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: r.location_type === 'Onsite' ? '#16a34a' : '#d97706',
                        }} />
                        <span style={{ color: r.location_type === 'Onsite' ? '#16a34a' : '#d97706' }}>
                          {r.location_type}
                        </span>
                      </span>
                    ) : <span style={{ fontSize: '13px', color: '#d1d5db' }}>—</span>}
                  </td>
                  {/* VENDOR */}
                  <td style={{ padding: '8px 16px', fontSize: '13px', color: '#374151' }}>
                    {r.vendor_name || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  {/* ACTIONS — 4 filled buttons */}
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <ActionBtn
                        tooltip="Open Intelligence"
                        bg="#7C3AED" bgHover="#6D28D9"
                        shadowColor="rgba(124,58,237,0.2)"
                        icon={<Zap size={16} strokeWidth={1.9} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project-hub/resources/${r.id}?view=ring&intel=true`);
                        }}
                      />
                      <ActionBtn
                        tooltip="Resource 360°"
                        bg="#1e293b" bgHover="#0f172a"
                        icon={<RotateCw size={16} strokeWidth={1.9} />}
                        onClick={(e) => { e.stopPropagation(); navTo(r.id, 'ring'); }}
                      />
                      <ActionBtn
                        tooltip="Chronology View"
                        bg="#2563eb" bgHover="#1d4ed8"
                        shadowColor="rgba(37,99,235,0.2)"
                        icon={<Clock size={16} strokeWidth={1.9} />}
                        onClick={(e) => { e.stopPropagation(); navTo(r.id, 'chronology'); }}
                      />
                      <ActionBtn
                        tooltip="Board View"
                        bg="#0d9488" bgHover="#0f766e"
                        shadowColor="rgba(13,148,136,0.2)"
                        icon={<LayoutGrid size={16} strokeWidth={1.9} />}
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

function PillButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${active ? '#111' : '#e5e7eb'}`,
        color: active ? '#111' : '#6b7280',
        borderRadius: '20px',
        padding: '8px 18px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color 150ms, color 150ms',
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
        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: hashColor(name), color: '#ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 600, flexShrink: 0,
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
              width: 34, height: 34, borderRadius: 7,
              border: `1.5px solid ${bg}`, background: 'transparent', color: bg,
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
        <TooltipContent
          side="top"
          style={{
            background: '#1e293b', color: '#f1f5f9',
            fontSize: '11px', borderRadius: '6px',
            padding: '4px 8px',
          }}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

