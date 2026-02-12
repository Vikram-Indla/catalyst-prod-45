/**
 * ReleasesPage — Releases derived from real Jira fix_versions in wh_issues
 * Route: /workhub/releases
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Loader2, FolderGit2, Milestone, ChevronDown, X, Search } from 'lucide-react';
import { useJiraReleases } from '@/hooks/workhub/useJiraReleases';
import type { JiraRelease } from '@/hooks/workhub/useJiraReleases';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { ReleaseCard } from './ReleaseCard';

type TabKey = 'All' | 'Active' | 'At Risk' | 'Planned' | 'Completed';

const TABS: TabKey[] = ['All', 'Active', 'At Risk', 'Planned', 'Completed'];

function deriveStatus(r: JiraRelease): string {
  if (r.totalItems > 0 && r.doneItems === r.totalItems) return 'Completed';
  if (r.blockedItems > 0) return 'At Risk';
  if (r.inProgressItems > 0 || r.inReviewItems > 0) return 'Active';
  return 'Planned';
}

/** Multi-select filter dropdown */
function MultiSelectFilter({ label, icon, options, selected, onChange }: {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid var(--wh-border, #e2e8f0)',
          background: selected.length > 0 ? '#eff6ff' : 'var(--wh-surface, #fff)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          color: selected.length > 0 ? '#2563eb' : 'var(--wh-text-secondary, #64748b)',
        }}
      >
        {icon}
        {label}
        {selected.length > 0 && (
          <span style={{
            background: '#2563eb', color: '#fff', borderRadius: 9999,
            fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
          }}>{selected.length}</span>
        )}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 9999,
          minWidth: 240, maxHeight: 320, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f8fafc', borderRadius: 6, padding: '4px 8px',
            }}>
              <Search size={13} color="#94a3b8" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                autoFocus
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 12, width: '100%', color: '#0f172a',
                }}
              />
            </div>
          </div>

          {/* Select All / Clear */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '6px 12px',
            borderBottom: '1px solid #f1f5f9', fontSize: 11, fontWeight: 600,
          }}>
            <button onClick={() => onChange([...options])}
              style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              Select All
            </button>
            <button onClick={() => onChange([])}
              style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              Clear
            </button>
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', maxHeight: 220, padding: '4px 0' }}>
            {filtered.map(opt => {
              const checked = selected.includes(opt);
              return (
                <label key={opt} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  cursor: 'pointer', fontSize: 12, color: '#0f172a',
                  background: checked ? '#f0f9ff' : 'transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      onChange(checked ? selected.filter(s => s !== opt) : [...selected, opt]);
                    }}
                    style={{ accentColor: '#2563eb' }}
                  />
                  {opt}
                </label>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReleasesPage() {
  const navigate = useNavigate();
  const { data: releases, isLoading, error, refetch } = useJiraReleases();
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);

  // Unique project keys + release names for filter options
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    (releases ?? []).forEach(r => r.projects.forEach(p => set.add(p)));
    return Array.from(set).sort();
  }, [releases]);

  const allReleaseNames = useMemo(() => {
    return (releases ?? []).map(r => r.versionName).sort();
  }, [releases]);

  // Apply all filters
  const filtered = useMemo(() => {
    if (!releases) return [];
    let list = releases;
    if (activeTab !== 'All') list = list.filter(r => deriveStatus(r) === activeTab);
    if (selectedProjects.length > 0) list = list.filter(r => r.projects.some(p => selectedProjects.includes(p)));
    if (selectedReleases.length > 0) list = list.filter(r => selectedReleases.includes(r.versionName));
    return list;
  }, [releases, activeTab, selectedProjects, selectedReleases]);

  const tabCounts = useMemo(() => {
    const all = releases ?? [];
    return {
      All: all.length,
      Active: all.filter(r => deriveStatus(r) === 'Active').length,
      'At Risk': all.filter(r => deriveStatus(r) === 'At Risk').length,
      Planned: all.filter(r => deriveStatus(r) === 'Planned').length,
      Completed: all.filter(r => deriveStatus(r) === 'Completed').length,
    };
  }, [releases]);

  const activeChips = [
    ...selectedProjects.map(p => ({ label: p, type: 'project' as const })),
    ...selectedReleases.map(r => ({ label: r, type: 'release' as const })),
  ];

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--wh-text-secondary, #64748b)',
      }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: 8, fontSize: 14 }}>Loading releases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12,
      }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load releases</p>
        <button onClick={() => refetch()} style={{
          padding: '8px 16px', borderRadius: 6, border: '1px solid var(--wh-border)',
          background: 'var(--wh-surface)', fontSize: 13, cursor: 'pointer',
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <CommandCenterHeader
        title="Releases"
        subtitle={`Jira fix versions — ${releases?.length ?? 0} releases`}
        onRefresh={() => refetch()}
      />

      {/* Content with padding */}
      <div className="flex flex-col flex-1 min-h-0 px-6 pb-4 overflow-y-auto">

      {/* Status Tabs + Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '6px 16px', borderRadius: 9999, border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: isActive ? 'var(--wh-primary, #2563eb)' : 'var(--wh-border-light, #f1f5f9)',
              color: isActive ? '#fff' : 'var(--wh-text-secondary, #64748b)',
              transition: 'background 150ms, color 150ms',
            }}>
              {tab} ({tabCounts[tab] ?? 0})
            </button>
          );
        })}

        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 4px' }} />

        <MultiSelectFilter
          label="Project"
          icon={<FolderGit2 size={14} />}
          options={allProjects}
          selected={selectedProjects}
          onChange={setSelectedProjects}
        />
        <MultiSelectFilter
          label="Release"
          icon={<Milestone size={14} />}
          options={allReleaseNames}
          selected={selectedReleases}
          onChange={setSelectedReleases}
        />
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {activeChips.map(chip => (
            <span key={`${chip.type}-${chip.label}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 9999,
              fontSize: 11, fontWeight: 600,
              background: chip.type === 'project' ? '#f0fdf4' : '#eff6ff',
              color: chip.type === 'project' ? '#15803d' : '#1d4ed8',
              border: `1px solid ${chip.type === 'project' ? '#bbf7d0' : '#bfdbfe'}`,
            }}>
              {chip.type === 'project' ? <FolderGit2 size={11} /> : <Milestone size={11} />}
              {chip.label}
              <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => {
                if (chip.type === 'project') setSelectedProjects(p => p.filter(v => v !== chip.label));
                else setSelectedReleases(r => r.filter(v => v !== chip.label));
              }} />
            </span>
          ))}
          <button onClick={() => { setSelectedProjects([]); setSelectedReleases([]); }}
            style={{ border: 'none', background: 'none', fontSize: 11, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
            Clear all
          </button>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 14,
        }}>
          No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}releases found
        </div>
      ) : (
        filtered.map(rel => (
          <ReleaseCard
            key={rel.versionName}
            release={rel}
            onClick={() => navigate(`/projecthub/releases/${encodeURIComponent(rel.versionName)}`)}
          />
        ))
      )}

      <style>{`
        .wh-release-card:hover {
          box-shadow: var(--wh-shadow-md) !important;
          border-color: var(--wh-border-hover, #cbd5e1) !important;
        }
        .wh-view-detail:hover { text-decoration: underline; }
      `}</style>
      </div>{/* end content wrapper */}
    </div>
  );
}
