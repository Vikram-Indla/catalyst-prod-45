/**
 * Ideas Board Page — /product/ideas/board
 * Kanban by STATUS. Cards sorted by impact_total DESC.
 * 5 columns: SUBMITTED, UNDER REVIEW, APPROVED, CONVERTED, REJECTED
 * ALL data from useIdeasHub() — ZERO hardcoded.
 */
import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, Sparkles, ArrowUpRight } from 'lucide-react';
import { useIdeasHub, useUpdateIdea, type IdeaRow } from '@/hooks/useIdeasHub';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IdeaDrawer from './ideation/IdeaDrawer';
import { CreateInitiativeDrawer, type ConversionSource } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { QUARTER_BADGE, STATUS_LOZENGE_COLORS } from './ideation/ideation-data';

const BOARD_COLUMNS = [
  { status: 'Submitted', label: 'SUBMITTED', headerColor: '#64748B', countBg: '#E2E8F0' },
  { status: 'Under Review', label: 'UNDER REVIEW', headerColor: '#64748B', countBg: '#E2E8F0' },
  { status: 'Approved', label: 'APPROVED', headerColor: '#64748B', countBg: '#E2E8F0' },
  { status: 'Converted to Initiative', label: 'CONVERTED', headerColor: '#11853D', countBg: '#D1FAE5' },
  { status: 'Rejected', label: 'REJECTED', headerColor: '#64748B', countBg: '#E2E8F0' },
];

export default function IdeasBoardPage() {
  const [search, setSearch] = useState('');
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

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Board</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Visual kanban grouped by status</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => toast.info('Intelligence will be available in the next release.')} style={{ background: '#FFFFFF', color: '#2563EB', border: '1px solid #2563EB', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={14} /> Intelligence</button>
            <button onClick={() => toast.info('Export will be available in the next release.')} style={{ background: '#FFFFFF', color: '#334155', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={14} /> Export</button>
            <button onClick={() => toast.info('New Idea creation coming soon')} style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> New Idea</button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..."
            style={{ width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '10px', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', fontSize: '13px', color: '#0F172A', outline: 'none' }}
          />
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {isLoading ? (
          <div style={{ padding: '40px', color: '#94A3B8' }}>Loading...</div>
        ) : (
          BOARD_COLUMNS.map(col => {
            const colIdeas = ideas.filter(i => i.status === col.status).sort((a, b) => b.impact_total - a.impact_total);
            const isConvertedCol = col.status === 'Converted to Initiative';
            return (
              <div key={col.status} style={{ minWidth: '260px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '0 4px', height: 36 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: col.headerColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                  <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: col.countBg, borderRadius: '10px', padding: '0 6px', height: 18, display: 'inline-flex', alignItems: 'center', color: isConvertedCol ? '#11853D' : '#64748B' }}>{colIdeas.length}</span>
                </div>
                {colIdeas.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', border: '1px dashed #E2E8F0', borderRadius: '8px' }}>No ideas</div>
                )}
                {colIdeas.map(idea => (
                  <BoardCard key={idea.idea_key} idea={idea} isConverted={isConvertedCol} onClick={() => setDrawerKey(idea.idea_key)} />
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

function BoardCard({ idea, isConverted, onClick }: { idea: IdeaRow; isConverted: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '6px',
      padding: '12px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.15s',
      borderLeft: isConverted ? '3px solid #16A34A' : undefined,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{idea.idea_key}</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {idea.roadmap_quarter && (
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 4px', borderRadius: 3, fontSize: '10px', fontWeight: 700, background: QUARTER_BADGE[idea.roadmap_quarter]?.bg, color: QUARTER_BADGE[idea.roadmap_quarter]?.text }}>{idea.roadmap_quarter}</span>
          )}
          <span style={{ fontSize: '9px', fontWeight: 800, background: '#F1F5F9', color: '#334155', padding: '1px 5px', borderRadius: '3px', border: '1px solid #E2E8F0', fontFamily: "'JetBrains Mono', monospace" }}>{idea.priority || 'P2'}</span>
        </div>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px', lineHeight: 1.35 }}>{idea.title}</div>
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>{idea.idea_type || 'Feature'}</span>
        {idea.theme && <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 600, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.theme}</span>}
      </div>
      <div style={{ borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>IMPACT {idea.impact_total.toFixed(2)}</span>
        {idea.assigned_to_name && <span style={{ fontSize: '11px', color: '#64748B' }}>{idea.assigned_to_name.split(' ')[0]}</span>}
      </div>
      {isConverted && idea.linked_initiative_key && (
        <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#11853D', fontFamily: "'JetBrains Mono', monospace" }}>
          → {idea.linked_initiative_key}
        </div>
      )}
    </div>
  );
}
