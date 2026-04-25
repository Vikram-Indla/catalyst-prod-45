import React from 'react';

interface RoadmapFiltersProps {
  teams: string[];
  activeTeam: string;
  onTeamChange: (t: string) => void;
  ideaCount: number;
}

export function RoadmapFilters({ teams, activeTeam, onTeamChange, ideaCount }: RoadmapFiltersProps) {
  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 24px', background: '#FAFBFC', borderBottom: '1px solid var(--divider)',
    }}>
      {teams.map(t => (
        <button
          key={t}
          onClick={() => onTeamChange(t)}
          style={{
            height: 24, padding: '0 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--cp-font-body)',
            background: activeTeam === t ? '#1E293B' : '#F1F5F9',
            color: activeTeam === t ? 'var(--bg-app)' : 'var(--fg-3)',
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={e => {
            if (activeTeam !== t) e.currentTarget.style.background = 'var(--bd-default, #E2E8F0)';
          }}
          onMouseLeave={e => {
            if (activeTeam !== t) e.currentTarget.style.background = '#F1F5F9';
          }}
        >
          {t}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-body)' }}>
        Showing {ideaCount} ideas
      </span>
    </div>
  );
}
