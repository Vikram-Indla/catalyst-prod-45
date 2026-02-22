import React, { useState, useRef, useEffect } from 'react';

export type R360View = 'tentacle' | 'chronology' | 'list';
export type RoleFilter = 'all' | 'assigned' | 'reported';

interface ToolbarProps {
  activeView: R360View;
  onViewChange: (v: R360View) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (r: RoleFilter) => void;
  onAiClick: () => void;
  groupBy: string;
  onGroupByChange: (g: string) => void;
  // Dynamic filter options derived from work items
  releaseOptions?: string[];
  projectOptions?: { key: string; name: string }[];
  selectedRelease?: string;
  onReleaseChange?: (r: string) => void;
  selectedProject?: string;
  onProjectChange?: (p: string) => void;
}

const views: { key: R360View; label: string }[] = [
  { key: 'tentacle', label: '360° View' },
  { key: 'chronology', label: 'Chronology' },
  { key: 'list', label: 'List' },
];

const roles: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'reported', label: 'Reported' },
];

/* ── tiny dropdown ── */
function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string;
  options: { key: string; label: string }[];
  onChange: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayLabel = options.find(o => o.key === value)?.label || value;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '5px 12px', fontSize: 11.5, fontWeight: 500,
          color: '#475569', background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
        aria-label={`${label} filter`}
      >
        {label}: {displayLabel}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 200,
          minWidth: 180, maxHeight: 240, overflowY: 'auto',
          padding: 4,
        }}>
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 10px', fontSize: 12, fontWeight: value === o.key ? 600 : 400,
                color: value === o.key ? '#2563EB' : '#334155',
                background: value === o.key ? '#EFF6FF' : 'transparent',
                border: 'none', borderRadius: 4, cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeView, onViewChange, roleFilter, onRoleFilterChange,
  onAiClick, groupBy, onGroupByChange,
  releaseOptions = [], projectOptions = [],
  selectedRelease = 'all', onReleaseChange,
  selectedProject = 'all', onProjectChange,
}) => {
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 12, fontWeight: active ? 600 : 500,
    color: active ? '#2563EB' : '#64748B',
    background: active ? '#FFFFFF' : 'transparent',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
    transition: 'all 150ms',
  });

  const releaseDropdownOptions = [
    { key: 'all', label: 'All' },
    ...releaseOptions.map(r => ({ key: r, label: r })),
  ];

  const projectDropdownOptions = [
    { key: 'all', label: 'All' },
    ...projectOptions.map(p => ({ key: p.key, label: p.name })),
  ];

  return (
    <div
      role="navigation"
      aria-label="Resource 360 toolbar"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 20px', background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 48, zIndex: 80,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* View Tabs */}
      <div role="tablist" aria-label="View tabs" style={{
        display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2,
      }}>
        {views.map(v => (
          <button
            key={v.key}
            role="tab"
            aria-selected={activeView === v.key}
            aria-label={`${v.label} view`}
            style={tabStyle(activeView === v.key)}
            onClick={() => onViewChange(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, background: '#E2E8F0' }} />

      {/* Dynamic Filters */}
      <FilterDropdown
        label="Release"
        value={selectedRelease}
        options={releaseDropdownOptions}
        onChange={onReleaseChange || (() => {})}
      />
      <FilterDropdown
        label="Project"
        value={selectedProject}
        options={projectDropdownOptions}
        onChange={onProjectChange || (() => {})}
      />
      <button
        style={{
          padding: '5px 12px', fontSize: 11.5, fontWeight: 500,
          color: '#475569', background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
        }}
        aria-label="Hub filter"
      >
        Hub: ProjectHub
      </button>
      <button
        style={{
          padding: '5px 12px', fontSize: 11.5, fontWeight: 500,
          color: '#475569', background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
        }}
        aria-label="Group by toggle"
        onClick={() => onGroupByChange(groupBy === 'status' ? 'hub' : 'status')}
      >
        Group: {groupBy === 'status' ? 'Status' : 'Hub'}
      </button>

      <div style={{ width: 1, height: 24, background: '#E2E8F0' }} />

      {/* Role Toggle */}
      <div role="tablist" aria-label="Role filter" style={{
        display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 2, gap: 1,
      }}>
        {roles.map(r => (
          <button
            key={r.key}
            role="tab"
            aria-selected={roleFilter === r.key}
            aria-label={`${r.label} role filter`}
            style={tabStyle(roleFilter === r.key)}
            onClick={() => onRoleFilterChange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* AI Intelligence Button */}
      <button
        onClick={onAiClick}
        aria-label="Open AI Intelligence overlay"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: '#FFFFFF', border: 'none', borderRadius: 8,
          padding: '7px 16px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800 }}>✦</span>
        AI Intelligence
      </button>
    </div>
  );
};

export default Toolbar;
