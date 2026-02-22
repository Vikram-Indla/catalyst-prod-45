import React from 'react';

export type R360View = 'tentacle' | 'chronology' | 'list' | 'constellation';
export type RoleFilter = 'all' | 'assigned' | 'reported';

interface ToolbarProps {
  activeView: R360View;
  onViewChange: (v: R360View) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (r: RoleFilter) => void;
  onAiClick: () => void;
  groupBy: string;
  onGroupByChange: (g: string) => void;
}

const views: { key: R360View; label: string }[] = [
  { key: 'tentacle', label: '360° View' },
  { key: 'chronology', label: 'Chronology' },
  { key: 'list', label: 'List' },
  { key: 'constellation', label: 'Constellation' },
];

const roles: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'reported', label: 'Reported' },
];

const Toolbar: React.FC<ToolbarProps> = ({
  activeView, onViewChange, roleFilter, onRoleFilterChange,
  onAiClick, groupBy, onGroupByChange,
}) => {
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 12, fontWeight: active ? 600 : 500,
    color: active ? '#2563EB' : '#64748B',
    background: active ? '#FFFFFF' : 'transparent',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
    transition: 'all 150ms',
  });

  const filterBtnStyle: React.CSSProperties = {
    padding: '5px 12px', fontSize: 11.5, fontWeight: 500,
    color: '#475569', background: '#FFFFFF',
    border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
  };

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

      <button style={filterBtnStyle} aria-label="Release filter">Release: R2026.1</button>
      <button style={filterBtnStyle} aria-label="Project filter">Project: All</button>
      <button style={filterBtnStyle} aria-label="Hub filter">Hub: All</button>
      <button
        style={filterBtnStyle}
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
