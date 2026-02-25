/**
 * ResourceListingPage — Master resource listing, entry point for Resource Hub
 * Route: /project-hub/resources
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  { key: 'actions', label: 'ACTIONS', width: 120, center: true },
];

/* ── Helpers ── */
const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
};

const hashColor = (name: string) => {
  const colors = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#059669'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/* ── Action Icons (SVG) ── */
const RadarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const BoardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="15" rx="1" />
  </svg>
);

/* ── Component ── */
export default function ResourceListingPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources-listing'],
    queryFn: async () => {
      // Fetch resource_inventory with lookups
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, rid, name, role_name, profile_id, department_id, assignment_id, vendor_id, vendor_name, department_name, location_id')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;

      // Fetch lookups + profiles for avatars in parallel
      const profileIds = (data || []).map((r: any) => r.profile_id).filter(Boolean);
      const [{ data: depts }, { data: assignments }, { data: locations }, { data: profiles }] = await Promise.all([
        supabase.from('capacity_departments').select('id, name'),
        supabase.from('resource_assignments').select('id, name'),
        supabase.from('resource_locations').select('id, name'),
        profileIds.length > 0
          ? supabase.from('profiles').select('id, avatar_url').in('id', profileIds)
          : Promise.resolve({ data: [] }),
      ]);

      const deptMap = new Map((depts || []).map((d: any) => [d.id, d.name]));
      const assignMap = new Map((assignments || []).map((a: any) => [a.id, a.name]));
      const locMap = new Map((locations || []).map((l: any) => [l.id, l.name]));
      const avatarMap = new Map((profiles || []).map((p: any) => [p.id, p.avatar_url]));

      return ((data || []) as any[]).map((r: any): Resource => ({
        id: r.id,
        rid: r.rid,
        full_name: r.name,
        job_role: r.role_name,
        location_type: locMap.get(r.location_id) || null,
        dept_name: deptMap.get(r.department_id) || r.department_name || null,
        assignment_name: assignMap.get(r.assignment_id) || null,
        vendor_name: r.vendor_name || null,
        avatar_url: r.profile_id ? (avatarMap.get(r.profile_id) || null) : null,
      }));
    },
  });

  // Department counts
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach(r => {
      const d = r.dept_name || 'Unknown';
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const deptNames = useMemo(() => Object.keys(deptCounts).sort(), [deptCounts]);

  // Filter
  const filtered = useMemo(() => {
    let list = resources;
    if (deptFilter !== 'All') {
      list = list.filter(r => r.dept_name === deptFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.job_role || '').toLowerCase().includes(q) ||
        (r.dept_name || '').toLowerCase().includes(q) ||
        (r.assignment_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [resources, deptFilter, search]);

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

      {/* Search + Dept Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <PillButton active={deptFilter === 'All'} onClick={() => setDeptFilter('All')} label={`All`} />
          {deptNames.map(d => (
            <PillButton key={d} active={deptFilter === d} onClick={() => setDeptFilter(d)} label={`${d} (${deptCounts[d]})`} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        border: '1.5px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden',
        background: '#FFFFFF',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'actions' && handleSort(col.key as SortKey)}
                  style={{
                    background: '#F1F5F9', padding: '0 16px', height: '40px',
                    fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em', color: '#475569',
                    borderBottom: '2px solid #B0B8C4',
                    cursor: col.key !== 'actions' ? 'pointer' : 'default',
                    textAlign: col.center ? 'center' : 'left',
                    minWidth: col.minWidth, width: col.width,
                    userSelect: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {col.key !== 'actions' && sortKey === col.key && (
                    <span style={{ marginLeft: '4px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {COLUMNS.map(col => (
                    <td key={col.key} style={{ padding: '12px 16px', height: '52px' }}>
                      <div style={{
                        height: '16px', borderRadius: '4px',
                        background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'r360shimmer 1.5s infinite',
                        width: col.key === 'actions' ? '80px' : '60%',
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ opacity: 0.4, fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>No resources found</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Try adjusting your search or filters</div>
                </td>
              </tr>
            ) : sorted.map(r => (
              <tr
                key={r.rid}
                style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                onClick={() => navTo(r.id, 'ring')}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {/* RESOURCE */}
                <td style={{ padding: '8px 16px', height: '52px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt={r.full_name}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          objectFit: 'cover', flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: hashColor(r.full_name), color: '#FFF',
                      display: r.avatar_url ? 'none' : 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {getInitials(r.full_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{r.full_name}</div>
                      <div style={{ fontSize: '10.5px', fontWeight: 400, color: '#475569' }}>RID: {r.rid}</div>
                    </div>
                  </div>
                </td>
                {/* DEPARTMENT */}
                <td style={{ padding: '8px 16px', height: '52px' }}>
                  {r.dept_name ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: '#F1F5F9', borderRadius: '4px', padding: '3px 9px',
                      fontSize: '11px', fontWeight: 600, color: '#334155',
                    }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: DEPT_COLORS[r.dept_name] || '#94A3B8',
                      }} />
                      {r.dept_name}
                    </span>
                  ) : <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>}
                </td>
                {/* JOB ROLE */}
                <td style={{ padding: '8px 16px', height: '52px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  {r.job_role || '—'}
                </td>
                {/* ASSIGNMENT */}
                <td style={{ padding: '8px 16px', height: '52px', fontSize: '12px', fontWeight: 400, color: '#374151' }}>
                  {r.assignment_name || '—'}
                </td>
                {/* LOCATION */}
                <td style={{ padding: '8px 16px', height: '52px' }}>
                  {r.location_type ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: r.location_type === 'Onsite' ? '#059669' : '#D97706',
                      }} />
                      <span style={{ color: r.location_type === 'Onsite' ? '#059669' : '#D97706' }}>
                        {r.location_type}
                      </span>
                    </span>
                  ) : <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>}
                </td>
                {/* VENDOR */}
                <td style={{ padding: '8px 16px', height: '52px', fontSize: '12px', fontWeight: 400, color: '#374151' }}>
                  {r.vendor_name || '—'}
                </td>
                {/* ACTIONS */}
                <td style={{ padding: '8px 16px', height: '52px', textAlign: 'center' }}>
                  <TooltipProvider delayDuration={200}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <ActionButton tooltip="360° View" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navTo(r.id, 'ring'); }}>
                        <RadarIcon />
                      </ActionButton>
                      <ActionButton tooltip="Chronology" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navTo(r.id, 'chronology'); }}>
                        <ClockIcon />
                      </ActionButton>
                      <ActionButton tooltip="Board View" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navTo(r.id, 'board'); }}>
                        <BoardIcon />
                      </ActionButton>
                    </div>
                  </TooltipProvider>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        background: active ? '#EFF6FF' : '#F1F5F9',
        border: `1px solid ${active ? '#2563EB' : '#E2E8F0'}`,
        color: active ? '#2563EB' : '#374151',
        borderRadius: '16px', padding: '5px 14px',
        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({ tooltip, onClick, children }: { tooltip: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          style={{
            width: '32px', height: '32px', borderRadius: '6px',
            border: '1.5px solid #E2E8F0', background: '#FFFFFF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#475569', padding: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#2563EB';
            e.currentTarget.style.background = '#EFF6FF';
            e.currentTarget.style.color = '#2563EB';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.color = '#475569';
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-[#0F172A] text-white text-xs px-2 py-1 rounded">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
