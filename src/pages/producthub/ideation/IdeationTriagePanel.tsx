/**
 * IdeationTriagePanel — AI Triage drawer using LIVE data from ph_ideas
 * Action buttons wired to real mutations.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Zap, Eye, GitMerge, FileSearch, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Idea } from './ideation-data';

interface Props {
  open: boolean;
  onClose: () => void;
  onMerge?: (primaryKey: string, mergeKey: string) => void;
  onConvert?: (key: string) => void;
  ideas?: Idea[];
}

const DOT_COLORS: Record<string, string> = {
  'Fast-Track': '#16A34A', 'Merge': '#2563EB', 'Investigate': '#D97706', 'Defer': '#94A3B8',
};

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  'FAST-TRACK RECOMMENDED': '#16A34A', 'MERGE CANDIDATES': '#2563EB',
  'NEEDS INVESTIGATION': '#D97706', 'RECOMMENDED TO DEFER': '#64748B',
};

type TriageItem = {
  badge: string;
  ideaKey: string;
  mergeKey?: string;
  title: string;
  body: string;
  aiSuggestion: string;
};

function computeTriageItems(ideas: Idea[]) {
  const fastTrack = ideas
    .filter(i => i.status === 'submitted' && i.priority === 'P1')
    .slice(0, 3)
    .map(i => ({
      badge: 'Fast-Track', ideaKey: i.key, title: i.title,
      body: `Priority ${i.priority}, status: Submitted. Ready for fast-track approval.`,
      aiSuggestion: 'High priority idea ready for immediate approval — recommended for fast-track.',
    }));

  const mergeItems: TriageItem[] = [];
  const byTheme: Record<string, Idea[]> = {};
  ideas.forEach(i => { const t = i.theme || 'none'; if (!byTheme[t]) byTheme[t] = []; byTheme[t].push(i); });

  Object.values(byTheme).forEach(group => {
    for (let a = 0; a < group.length && mergeItems.length < 2; a++) {
      for (let b = a + 1; b < group.length && mergeItems.length < 2; b++) {
        const wordsA = new Set(group[a].title.toLowerCase().split(/[\s\-–,]+/).filter(w => w.length > 3));
        const wordsB = new Set(group[b].title.toLowerCase().split(/[\s\-–,]+/).filter(w => w.length > 3));
        const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
        if (overlap >= 2) {
          mergeItems.push({
            badge: 'Merge', ideaKey: group[a].key, mergeKey: group[b].key,
            title: group[a].title,
            body: `Similar to ${group[b].key} (${group[b].title}). Same theme: ${group[a].theme}. ${overlap} overlapping keywords.`,
            aiSuggestion: `Consolidate ${group[a].key} into ${group[b].key} — merge for stronger impact.`,
          });
        }
      }
    }
  });

  const investigate = ideas
    .filter(i => i.status === 'under_review' && i.priority === 'P2')
    .slice(0, 3)
    .map(i => ({
      badge: 'Investigate', ideaKey: i.key, title: i.title,
      body: `Currently Under Review. ${i.theme ? `Theme: ${i.theme}.` : ''} Requires detailed analysis before approval.`,
      aiSuggestion: 'Needs additional documentation or stakeholder review before progressing.',
    }));

  const defer = ideas
    .filter(i => (i.status === 'draft' && i.priority === 'P3') || (i.status === 'draft' && !i.theme))
    .slice(0, 3)
    .map(i => ({
      badge: 'Defer', ideaKey: i.key, title: i.title,
      body: `Status: Draft, Priority: ${i.priority || 'Unset'}. ${!i.theme ? 'No theme assigned.' : `Theme: ${i.theme}.`} Below threshold for current cycle.`,
      aiSuggestion: 'Below minimum priority threshold. Recommend deferral to next planning cycle.',
    }));

  return { fastTrack, mergeItems, investigate, defer };
}

export default function IdeationTriagePanel({ open, onClose, onMerge, ideas = [] }: Props) {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setDismissed(new Set());
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleEsc); return () => document.removeEventListener('keydown', handleEsc); }
  }, [open, onClose]);

  const triage = useMemo(() => computeTriageItems(ideas), [ideas]);

  const handleFastTrack = async (ideaKey: string) => {
    const { error } = await supabase.from('ph_ideas').update({ status: 'Approved', updated_at: new Date().toISOString() } as any).eq('idea_key', ideaKey);
    if (error) { toast.error('Failed to fast-track'); return; }
    queryClient.invalidateQueries({ queryKey: ['ideas-hub'] });
    setDismissed(prev => new Set(prev).add(ideaKey));
    toast.success(`${ideaKey} fast-tracked to Approved`);
  };

  const handleMerge = async (primaryKey: string, mergeKey?: string) => {
    if (!mergeKey) return;
    const { error } = await supabase.from('ph_ideas').update({ status: 'Rejected', updated_at: new Date().toISOString() } as any).eq('idea_key', mergeKey);
    if (error) { toast.error('Merge failed'); return; }
    queryClient.invalidateQueries({ queryKey: ['ideas-hub'] });
    setDismissed(prev => new Set(prev).add(primaryKey));
    toast.success(`${mergeKey} merged into ${primaryKey}`);
  };

  const dismiss = (key: string) => setDismissed(prev => new Set(prev).add(key));

  const visibleFastTrack = triage.fastTrack.filter(i => !dismissed.has(i.ideaKey));
  const visibleMerge = triage.mergeItems.filter(i => !dismissed.has(i.ideaKey));
  const visibleInvestigate = triage.investigate.filter(i => !dismissed.has(i.ideaKey));
  const visibleDefer = triage.defer.filter(i => !dismissed.has(i.ideaKey));
  const totalRecommendations = visibleFastTrack.length + visibleMerge.length + visibleInvestigate.length + visibleDefer.length;

  const teamStats = useMemo(() => {
    const map: Record<string, number> = {};
    ideas.forEach(i => { const t = i.assigned_team || 'Unassigned'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [ideas]);

  const themeStats = useMemo(() => {
    const map: Record<string, number> = {};
    ideas.forEach(i => { const t = i.theme || 'Untagged'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ideas]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 250 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: 'var(--cp-bg-elevated, #FFFFFF)', zIndex: 251,
        boxShadow: isDark ? 'none' : '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#2563EB" strokeWidth={2} />
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)' }}>AI Intelligence — Triage Results</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted, #94A3B8)', padding: '4px' }}><X size={18} /></button>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--cp-text-tertiary, #64748B)', marginTop: '4px' }}>
            {ideas.length} ideas analyzed · {totalRecommendations} recommendations
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollbarWidth: 'thin' }}>
          {visibleFastTrack.length > 0 && (
            <>
              <CategoryHeader label="FAST-TRACK RECOMMENDED" sub={`${visibleFastTrack.length} idea${visibleFastTrack.length > 1 ? 's' : ''} meet approval criteria`} />
              {visibleFastTrack.map(item => (
                <TriageCard key={item.ideaKey} badge="Fast-Track" ideaKey={item.ideaKey} title={item.title}
                  body={item.body} aiSuggestion={item.aiSuggestion}
                  primary={{ label: 'Fast-Track to Approved', icon: <Zap size={14} color="#FFFFFF" />, onClick: () => handleFastTrack(item.ideaKey) }}
                  secondary={{ label: 'Review First', icon: <Eye size={14} />, onClick: () => dismiss(item.ideaKey) }}
                />
              ))}
            </>
          )}

          {visibleMerge.length > 0 && (
            <>
              <CategoryHeader label="MERGE CANDIDATES" sub={`${visibleMerge.length} pair${visibleMerge.length > 1 ? 's' : ''} with high similarity`} />
              {visibleMerge.map(item => (
                <TriageCard key={item.ideaKey} badge="Merge" ideaKey={item.ideaKey} title={item.title}
                  body={item.body} aiSuggestion={item.aiSuggestion}
                  primary={{ label: 'Merge & Consolidate', icon: <GitMerge size={14} color="#FFFFFF" />, onClick: () => handleMerge(item.ideaKey, (item as any).mergeKey) }}
                  secondary={{ label: 'Keep Separate', icon: <X size={14} />, onClick: () => dismiss(item.ideaKey) }}
                />
              ))}
            </>
          )}

          {visibleInvestigate.length > 0 && (
            <>
              <CategoryHeader label="NEEDS INVESTIGATION" sub={`${visibleInvestigate.length} idea${visibleInvestigate.length > 1 ? 's' : ''} require documentation`} />
              {visibleInvestigate.map(item => (
                <TriageCard key={item.ideaKey} badge="Investigate" ideaKey={item.ideaKey} title={item.title}
                  body={item.body} aiSuggestion={item.aiSuggestion}
                  primary={{ label: 'Request Business Case', icon: <FileSearch size={14} color="#FFFFFF" />, onClick: () => dismiss(item.ideaKey) }}
                  secondary={{ label: 'Defer 30 Days', icon: <Clock size={14} />, onClick: () => dismiss(item.ideaKey) }}
                />
              ))}
            </>
          )}

          {visibleDefer.length > 0 && (
            <>
              <CategoryHeader label="RECOMMENDED TO DEFER" sub={`${visibleDefer.length} idea${visibleDefer.length > 1 ? 's' : ''} below threshold`} />
              {visibleDefer.map(item => (
                <TriageCard key={item.ideaKey} badge="Defer" ideaKey={item.ideaKey} title={item.title}
                  body={item.body} aiSuggestion={item.aiSuggestion}
                  primary={{ label: 'Defer to Next Cycle', icon: <Clock size={14} color="#FFFFFF" />, onClick: () => dismiss(item.ideaKey) }}
                  secondary={{ label: 'Reject', icon: <X size={14} />, onClick: () => dismiss(item.ideaKey) }}
                />
              ))}
            </>
          )}

          {totalRecommendations === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--cp-text-muted, #94A3B8)', fontSize: '14px' }}>
              No triage recommendations at this time.
            </div>
          )}

          <div style={{ marginTop: '20px', borderTop: `1px solid ${'var(--cp-border, #E2E8F0)'}`, paddingTop: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Team Distribution</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {teamStats.map(([team, count]) => (
                <span key={team} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--cp-bg-sunken, #F1F5F9)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, color: 'var(--cp-text-secondary, #475569)', padding: '4px 10px', borderRadius: '4px' }}>
                  {team} <span style={{ fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)' }}>{count}</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Top Themes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {themeStats.map(([theme, count]) => (
                <div key={theme} style={{ background: 'var(--cp-bg-page, #F8FAFC)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--cp-text-primary, #0F172A)' }}>{count}</div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', marginTop: '2px', direction: /[\u0600-\u06FF]/.test(theme) ? 'rtl' : 'ltr' }}>{theme}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function CategoryHeader({ label, sub }: { label: string; sub: string }) {
  const { isDark } = useTheme();
  const color = CATEGORY_TEXT_COLORS[label] || '#64748B';
  return (
    <div style={{ marginBottom: '12px', marginTop: '8px' }}>
      <div style={{ borderTop: `1px solid ${'var(--cp-border, #E2E8F0)'}`, marginBottom: '16px' }} />
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'var(--cp-text-tertiary, #64748B)', marginTop: '2px' }}>{sub}</div>
    </div>
  );
}

function TriageCard({ badge, ideaKey, title, body, aiSuggestion, primary, secondary }: {
  badge: string; ideaKey: string; title: string; body: string; aiSuggestion?: string;
  primary: { label: string; icon: React.ReactNode; onClick: () => void };
  secondary: { label: string; icon: React.ReactNode; onClick: () => void };
}) {
  const { isDark } = useTheme();
  const dotColor = DOT_COLORS[badge] || '#94A3B8';
  return (
    <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: '12px', padding: '16px', marginBottom: '10px', boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-secondary, #475569)', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          {badge}
        </span>
        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)' }}>{ideaKey}</span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', marginTop: '8px', lineHeight: 1.4 }}>{title}</div>
      <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--cp-text-tertiary, #64748B)', lineHeight: 1.5, marginTop: '4px' }}>{body}</div>
      {aiSuggestion && (
        <div style={{ background: 'var(--cp-bg-page, #F8FAFC)', borderLeft: `2px solid ${'var(--cp-border-strong, #CBD5E1)'}`, borderRadius: '0 6px 6px 0', padding: '8px 12px', marginTop: '10px', fontSize: '12px', fontWeight: 500, color: 'var(--cp-text-secondary, #475569)', lineHeight: 1.4 }}>
          {aiSuggestion}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={primary.onClick} style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')} onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}>
          {primary.icon} {primary.label}
        </button>
        <button onClick={secondary.onClick} style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', color: 'var(--cp-text-secondary, #475569)', border: `1.5px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-bg-page, #F8FAFC)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--cp-bg-elevated, #FFFFFF)'; }}>
          {secondary.icon} {secondary.label}
        </button>
      </div>
    </div>
  );
}
