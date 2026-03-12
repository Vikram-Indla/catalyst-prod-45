/**
 * Ideas Roadmap Page — /product/ideas/roadmap
 * Kanban by QUARTER with colored left borders.
 * Committed filter = Approved or Converted ideas.
 */
import React, { useState, useMemo } from 'react';
import { useIdeasHub, type IdeaRow } from '@/hooks/useIdeasHub';
import IdeaDrawer from './ideation/IdeaDrawer';
import { QUARTER_BADGE, STATUS_LOZENGE_COLORS } from './ideation/ideation-data';

const TEAMS = ['All Teams', 'Senaie BAU', 'Integration Team', 'Mobile App Team'];

const ROADMAP_COLS = [
  { key: null, label: 'NO QUARTER', borderColor: 'transparent', textColor: '#94A3B8' },
  { key: 'Q1', label: 'Q1 2026', borderColor: '#991B1B', textColor: '#991B1B' },
  { key: 'Q2', label: 'Q2 2026', borderColor: '#1E40AF', textColor: '#1E40AF' },
  { key: 'Q3', label: 'Q3 2026', borderColor: '#115E59', textColor: '#115E59' },
  { key: 'Q4', label: 'Q4 2026', borderColor: '#78350F', textColor: '#78350F' },
];

export default function IdeasRoadmapPage() {
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [committedOnly, setCommittedOnly] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const { data: ideas = [], isLoading } = useIdeasHub();

  const filtered = useMemo(() => {
    let result = ideas;
    if (teamFilter !== 'All Teams') result = result.filter(i => i.assigned_team === teamFilter);
    if (committedOnly) result = result.filter(i => i.status === 'Approved' || i.status === 'Converted to Initiative');
    return result;
  }, [ideas, teamFilter, committedOnly]);

  const pipelineCount = filtered.filter(i => i.roadmap_quarter).length;
  const convertedCount = filtered.filter(i => i.status === 'Converted to Initiative').length;

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Roadmap</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>FY 2026 delivery pipeline — quarter assignment drives placement</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pipelineCount}</strong> in pipeline ·{' '}
              <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#11853D' }}>{convertedCount}</strong> converted
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={committedOnly} onChange={e => setCommittedOnly(e.target.checked)} style={{ accentColor: '#2563EB' }} />
              Committed only
            </label>
          </div>
        </div>
      </div>

      {/* Team Filter */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {TEAMS.map(t => (
          <button key={t} onClick={() => setTeamFilter(t)} style={{
            background: teamFilter === t ? '#2563EB' : '#FFFFFF', color: teamFilter === t ? '#FFFFFF' : '#334155',
            border: `1px solid ${teamFilter === t ? '#2563EB' : 'rgba(15,23,42,0.12)'}`,
            borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {isLoading ? (
          <div style={{ padding: '40px', color: '#94A3B8' }}>Loading...</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', height: 36 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: col.textColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col.label}</span>
                  <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: '#F1F5F9', borderRadius: '100px', padding: '0 6px', height: 18, display: 'inline-flex', alignItems: 'center', color: '#64748B' }}>{colIdeas.length}</span>
                </div>
                {colIdeas.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', border: '1px dashed #E2E8F0', borderRadius: '8px' }}>No ideas</div>
                )}
                {colIdeas.map(idea => (
                  <RoadmapCard key={idea.idea_key} idea={idea} onClick={() => setDrawerKey(idea.idea_key)} />
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

function RoadmapCard({ idea, onClick }: { idea: IdeaRow; onClick: () => void }) {
  const isConverted = idea.status === 'Converted to Initiative';
  return (
    <div onClick={onClick} style={{
      background: '#FFFFFF',
      border: '1px solid rgba(15,23,42,0.12)',
      borderLeft: isConverted ? '3px solid #16A34A' : '1px solid rgba(15,23,42,0.12)',
      borderRadius: '6px',
      padding: '12px', marginBottom: '8px', cursor: 'pointer',
      transition: 'box-shadow 150ms ease, transform 150ms ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{idea.idea_key}</span>
        <span style={{ fontSize: '9px', fontWeight: 800, background: '#F1F5F9', color: '#334155', padding: '1px 5px', borderRadius: '3px', border: '1px solid #E2E8F0', fontFamily: "'JetBrains Mono', monospace" }}>{idea.priority || 'P2'}</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px', lineHeight: 1.35 }}>{idea.title}</div>
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {idea.assigned_team && <span style={{ background: '#F1F5F9', color: '#64748B', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 500 }}>{idea.assigned_team}</span>}
        {idea.theme && <span style={{ background: '#F1F5F9', color: '#64748B', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 500, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.theme}</span>}
      </div>
      <div style={{ borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: idea.impact_total > 0 ? '#334155' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>IMPACT {idea.impact_total.toFixed(2)}</span>
        {idea.is_committed && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#006644', background: '#E3FCEF', padding: '1px 6px', borderRadius: '3px' }}>COMMITTED</span>}
      </div>
      {isConverted && idea.linked_initiative_key && (
        <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#11853D', fontFamily: "'JetBrains Mono', monospace" }}>
          → {idea.linked_initiative_key} (Converted)
        </div>
      )}
    </div>
  );
}
