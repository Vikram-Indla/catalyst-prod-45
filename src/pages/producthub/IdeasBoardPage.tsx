/**
 * Ideas Board Page — /product/ideas/board
 * Kanban by STATUS. Cards with dark mode support.
 */
import React, { useState } from 'react';
import { Search, Lightbulb, GripVertical } from 'lucide-react';
import { useIdeasHub, useUpdateIdea, type IdeaRow } from '@/hooks/useIdeasHub';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IdeaDrawer from './ideation/IdeaDrawer';
import { CreateInitiativeDrawer, type ConversionSource } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { QUARTER_BADGE } from './ideation/ideation-data';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

const BOARD_COLUMNS = [
  { status: 'Submitted', label: 'SUBMITTED', headerColor: '#64748B', countBg: '#E2E8F0', countText: '#64748B' },
  { status: 'Under Review', label: 'UNDER REVIEW', headerColor: '#64748B', countBg: '#E2E8F0', countText: '#64748B' },
  { status: 'Approved', label: 'APPROVED', headerColor: '#64748B', countBg: '#E2E8F0', countText: '#64748B' },
  { status: 'Converted to Initiative', label: 'CONVERTED', headerColor: '#16A34A', countBg: '#D1FAE5', countText: '#11853D' },
  { status: 'Rejected', label: 'REJECTED', headerColor: '#94A3B8', countBg: '#E2E8F0', countText: '#94A3B8' },
];

const FILTER_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Under Review', label: 'Under Review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Converted to Initiative', label: 'Converted' },
];

export default function IdeasBoardPage() {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<ConversionSource | null>(null);
  const queryClient = useQueryClient();

  const { data: ideas = [], isLoading } = useIdeasHub({ search: search || undefined });

  const handleConvertIdea = (idea: IdeaRow) => {
    setConversionSource({
      type: 'single',
      primaryIdea: {
        key: idea.idea_key, title: idea.title, description: idea.description || '',
        impact: idea.impact_total, votes: idea.vote_count, dept: idea.assigned_team || '', priority: idea.priority || 'P3',
      },
    });
    setConvertDrawerOpen(true);
  };

  const filteredColumns = statusFilter === 'all'
    ? BOARD_COLUMNS
    : BOARD_COLUMNS.filter(c => c.status === statusFilter);

  return (
    <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Board</h1>
            <p style={{ fontSize: '13px', color: dk.t3, margin: '4px 0 0' }}>Visual kanban grouped by status</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: dk.t3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..."
            style={{ width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '10px', background: isDark ? 'transparent' : '#FFFFFF', border: `1px solid ${dk.border}`, borderRadius: '6px', fontSize: '13px', color: dk.t1, outline: 'none' }}
          />
        </div>
        {FILTER_PILLS.map(pill => {
          const isActive = statusFilter === pill.key;
          return (
            <button key={pill.key} onClick={() => setStatusFilter(pill.key)} style={{
              background: isActive ? '#2563EB' : (isDark ? 'transparent' : '#FFFFFF'), color: isActive ? '#FFFFFF' : dk.t2,
              border: `1px solid ${isActive ? '#2563EB' : dk.border}`,
              borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
            }}>{pill.label}</button>
          );
        })}
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {isLoading ? (
          <div style={{ padding: '40px', color: dk.t3 }}>Loading...</div>
        ) : (
          filteredColumns.map(col => {
            const colIdeas = ideas.filter(i => i.status === col.status).sort((a, b) => b.impact_total - a.impact_total);
            const isConvertedCol = col.status === 'Converted to Initiative';
            return (
              <div key={col.status} style={{ minWidth: '260px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '0 4px', height: 50 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? dk.t3 : col.headerColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                  <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: isDark ? '#292929' : col.countBg, borderRadius: '12px', padding: '0 6px', height: 18, display: 'inline-flex', alignItems: 'center', color: isDark ? dk.t3 : col.countText }}>{colIdeas.length}</span>
                </div>
                {colIdeas.length === 0 && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', border: `1px dashed ${dk.border}`, borderRadius: '8px' }}>
                    <Lightbulb size={32} style={{ color: dk.t3, marginBottom: '8px', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '12px', color: dk.t3, margin: 0 }}>No ideas in this stage</p>
                  </div>
                )}
                {colIdeas.map(idea => (
                  <BoardCard key={idea.idea_key} idea={idea} isConverted={isConvertedCol} onClick={() => setDrawerKey(idea.idea_key)} isDark={isDark} dk={dk} />
                ))}
              </div>
            );
          })
        )}
      </div>

      {drawerKey && <IdeaDrawer ideaKey={drawerKey} onClose={() => setDrawerKey(null)} onConvert={handleConvertIdea} />}
      <CreateInitiativeDrawer
        open={convertDrawerOpen}
        onClose={() => { setConvertDrawerOpen(false); setConversionSource(null); }}
        conversionSource={conversionSource}
        onCreated={async (initiativeKey) => {
          if (conversionSource) {
            const idea = ideas.find(i => i.idea_key === conversionSource.primaryIdea.key);
            if (idea) {
              await supabase.from('ph_ideas').update({ status: 'Converted to Initiative', converted_at: new Date().toISOString() } as any).eq('id', idea.id);
              queryClient.invalidateQueries({ queryKey: ['ideas-hub'] });
              toast.success(`${conversionSource.primaryIdea.key} converted to ${initiativeKey}`);
            }
          }
        }}
      />
    </div>
  );
}

function BoardCard({ idea, isConverted, onClick, isDark, dk }: { idea: IdeaRow; isConverted: boolean; onClick: () => void; isDark: boolean; dk: typeof DK }) {
  return (
    <div onClick={onClick} style={{
      background: isDark ? '#0A0A0A' : '#FFFFFF',
      border: `1px solid ${isDark ? '#454545' : dk.border}`,
      borderLeft: isConverted ? '3px solid #16A34A' : `1px solid ${dk.border}`,
      borderRadius: '6px',
      padding: '12px', marginBottom: '8px', cursor: 'pointer',
      transition: 'box-shadow 150ms ease, transform 150ms ease',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
      position: 'relative',
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
      {/* Row 1: key + badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: dk.blueKey }}>{idea.idea_key}</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginRight: '18px' }}>
          {idea.roadmap_quarter && (
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 4px', borderRadius: 4, fontSize: '10px', fontWeight: 700, background: QUARTER_BADGE[idea.roadmap_quarter]?.bg, color: QUARTER_BADGE[idea.roadmap_quarter]?.text }}>{idea.roadmap_quarter}</span>
          )}
          <span style={{ fontSize: '9px', fontWeight: 800, background: isDark ? '#292929' : '#F1F5F9', color: dk.t2, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${dk.border}`, fontFamily: "'JetBrains Mono', monospace" }}>{idea.priority || 'P2'}</span>
        </div>
      </div>

      {/* Row 2: title */}
      <div style={{ fontSize: '13px', fontWeight: 500, color: dk.t1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px', lineHeight: 1.35 }}>{idea.title}</div>

      {/* Row 3: type + team chips */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <span style={{ background: isDark ? '#292929' : '#F1F5F9', color: dk.t2, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, border: isDark ? `1px solid ${dk.border}` : 'none' }}>{idea.idea_type || 'Feature'}</span>
        {idea.assigned_team && <span style={{ background: isDark ? '#292929' : '#F1F5F9', color: dk.t2, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, border: isDark ? `1px solid ${dk.border}` : 'none' }}>{idea.assigned_team}</span>}
      </div>

      {/* Row 4: impact */}
      <div style={{ fontSize: '11px', fontWeight: 700, color: dk.t3, fontFamily: "'JetBrains Mono', monospace" }}>
        IMPACT: {idea.impact_total.toFixed(2)}
      </div>

      {isConverted && idea.linked_initiative_key && (
        <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: dk.greenText, fontFamily: "'JetBrains Mono', monospace" }}>
          → {idea.linked_initiative_key}
        </div>
      )}
    </div>
  );
}
