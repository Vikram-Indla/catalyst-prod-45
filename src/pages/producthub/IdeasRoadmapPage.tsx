/**
 * Ideas Roadmap Page — /product/ideas/roadmap
 * Kanban by QUARTER with colored left borders + dark mode.
 */
import React, { useState, useMemo } from 'react';
import { useIdeasHub, type IdeaRow } from '@/hooks/useIdeasHub';
import IdeaDrawer from './ideation/IdeaDrawer';
import { QUARTER_BADGE, STATUS_LOZENGE_COLORS } from './ideation/ideation-data';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

const TEAMS = ['All Teams', 'Senaie BAU', 'Integration Team', 'Mobile App Team'];

const ROADMAP_COLS = [
  { key: null, label: 'NO QUARTER', borderColor: 'transparent', textColor: '#94A3B8' },
  { key: 'Q1', label: 'Q1 2026', borderColor: '#991B1B', textColor: '#991B1B' },
  { key: 'Q2', label: 'Q2 2026', borderColor: '#1E40AF', textColor: '#1E40AF' },
  { key: 'Q3', label: 'Q3 2026', borderColor: '#115E59', textColor: '#115E59' },
  { key: 'Q4', label: 'Q4 2026', borderColor: '#78350F', textColor: '#78350F' },
];

export default function IdeasRoadmapPage() {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [committedOnly, setCommittedOnly] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const { data: ideas = [], isLoading } = useIdeasHub();

  const filtered = useMemo(() => {
    let result = ideas;
    if (teamFilter !== 'All Teams') result = result.filter(i => i.assigned_team === teamFilter);
    if (committedOnly) result = result.filter(i => i.status === 'Approved' || i.status === 'Converted to Request');
    return result;
  }, [ideas, teamFilter, committedOnly]);

  const pipelineCount = filtered.filter(i => i.roadmap_quarter).length;
  const convertedCount = filtered.filter(i => i.status === 'Converted to Request').length;

  return (
    <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Roadmap</h1>
            <p style={{ fontSize: '13px', color: dk.t3, margin: '4px 0 0' }}>FY 2026 delivery pipeline — quarter assignment drives placement</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: dk.t2, fontWeight: 500 }}>
              <strong style={{ fontFamily: 'var(--cp-font-mono)' }}>{pipelineCount}</strong> in pipeline ·{' '}
              <strong style={{ fontFamily: 'var(--cp-font-mono)', color: dk.greenText }}>{convertedCount}</strong> converted
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: dk.t2, cursor: 'pointer' }}>
              <input type="checkbox" checked={committedOnly} onChange={e => setCommittedOnly(e.target.checked)} style={{ accentColor: '#2563EB' }} />
              Committed only
            </label>
          </div>
        </div>
      </div>

      {/* Team Filter */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {TEAMS.map(t => (
          <button key={t} onClick={() => setTeamFilter(t)} style={{
            background: teamFilter === t ? '#2563EB' : (isDark ? 'transparent' : '#FFFFFF'), color: teamFilter === t ? '#FFFFFF' : dk.t2,
            border: `1px solid ${teamFilter === t ? '#2563EB' : dk.border}`,
            borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {isLoading ? (
          <div style={{ padding: '40px', color: dk.t3 }}>Loading...</div>
        ) : (
          ROADMAP_COLS.map(col => {
            const colIdeas = filtered
              .filter(i => col.key === null ? !i.roadmap_quarter : i.roadmap_quarter === col.key)
              .sort((a, b) => b.impact_total - a.impact_total);
            return (
              <div key={col.label} style={{
                minWidth: '240px', flex: 1,
                borderLeft: col.key ? `3px solid ${col.borderColor}` : undefined,
                paddingLeft: col.key ? '12px' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', height: 50 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? dk.t3 : col.textColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col.label}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--cp-font-mono)', fontWeight: 700, background: isDark ? '#292929' : '#F1F5F9', borderRadius: '100px', padding: '0 6px', height: 18, display: 'inline-flex', alignItems: 'center', color: dk.t3 }}>{colIdeas.length}</span>
                </div>
                {colIdeas.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: dk.t3, fontSize: '12px', border: `1px dashed ${dk.border}`, borderRadius: '8px' }}>No ideas</div>
                )}
                {colIdeas.map(idea => (
                  <RoadmapCard key={idea.idea_key} idea={idea} onClick={() => setDrawerKey(idea.idea_key)} isDark={isDark} dk={dk} />
                ))}
              </div>
            );
          })
        )}
      </div>

      {drawerKey && <IdeaDrawer ideaKey={drawerKey} onClose={() => setDrawerKey(null)} />}
    </div>
  );
}

function RoadmapCard({ idea, onClick, isDark, dk }: { idea: IdeaRow; onClick: () => void; isDark: boolean; dk: typeof DK }) {
  const isConverted = idea.status === 'Converted to Request';
  return (
    <div onClick={onClick} style={{
      background: isDark ? '#0A0A0A' : '#FFFFFF',
      border: `1px solid ${isDark ? '#454545' : dk.border}`,
      borderLeft: isConverted ? '3px solid #16A34A' : `1px solid ${dk.border}`,
      borderRadius: '6px',
      padding: '12px', marginBottom: '8px', cursor: 'pointer',
      transition: 'box-shadow 150ms ease, transform 150ms ease',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
    }}
      onMouseEnter={e => {
        if (!isDark) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
        e.currentTarget.style.borderColor = isDark ? '#454545' : 'rgba(37,99,235,0.3)';
      }}
      onMouseLeave={e => {
        if (!isDark) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
          e.currentTarget.style.transform = 'none';
        }
        e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '11px', fontWeight: 600, color: dk.blueKey }}>{idea.idea_key}</span>
        <span style={{ fontSize: '9px', fontWeight: 800, background: isDark ? '#292929' : '#F1F5F9', color: dk.t2, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${dk.border}`, fontFamily: 'var(--cp-font-mono)' }}>{idea.priority || 'P2'}</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: dk.t1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px', lineHeight: 1.35 }}>{idea.title}</div>
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {idea.assigned_team && <span style={{ background: isDark ? '#292929' : '#F1F5F9', color: dk.t2, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, border: isDark ? `1px solid ${dk.border}` : 'none' }}>{idea.assigned_team}</span>}
        {idea.theme && <span style={{ background: isDark ? '#292929' : '#F1F5F9', color: dk.t2, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: isDark ? `1px solid ${dk.border}` : 'none' }}>{idea.theme}</span>}
      </div>
      <div style={{ borderTop: `1px solid ${dk.divider}`, paddingTop: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: idea.impact_total > 0 ? dk.t2 : dk.t3, fontFamily: 'var(--cp-font-mono)' }}>IMPACT {idea.impact_total.toFixed(2)}</span>
        {idea.is_committed && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#FFFFFF', background: isDark ? 'rgba(22,163,74,0.12)' : '#1B7F37', padding: '1px 6px', borderRadius: '4px' }}>COMMITTED</span>}
      </div>
      {isConverted && idea.linked_initiative_key && (
        <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: dk.greenText, fontFamily: 'var(--cp-font-mono)' }}>
          → {idea.linked_initiative_key} (Converted)
        </div>
      )}
    </div>
  );
}
