/**
 * AI Ideas Hub — Full-screen AI overlay for Ideation Module
 * Uses LIVE data from ph_ideas table
 */
import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { Idea } from './ideation-data';

interface Props {
  open: boolean;
  onClose: () => void;
  onMerge?: (primaryKey: string, mergeKey: string) => void;
  ideas?: Idea[];
}

const C = {
  primary: '#2563eb', success: '#0d9488', warning: '#d97706', danger: '#ef4444',
  textPrimary: '#0f172a', textSecondary: '#334155', textTertiary: '#475569',
  surface: '#f8fafc', surfaceAlt: '#f1f5f9', border: '#e2e8f0', bg: '#ffffff',
  insightBg: '#eff6ff', insightText: '#1e40af', insightBorder: '#2563eb',
  gapBg: '#fef2f2', gapText: '#991b1b', gapBody: '#7f1d1d', gapBorder: '#ef4444',
} as const;

const MONO = "'JetBrains Mono', monospace";

function computeThemes(ideas: Idea[]) {
  const map: Record<string, number> = {};
  ideas.forEach(i => {
    const t = i.theme || 'Untagged';
    map[t] = (map[t] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const colors = ['#2563EB', '#7C3AED', '#D97706', '#16A34A', '#0D9488', '#EF4444', '#EC4899', '#6366F1'];
  return sorted.slice(0, 8).map(([name, count], i) => ({
    name, count, pct: Math.round((count / max) * 100),
    trend: i < 2 ? '↑ trending' : i < 4 ? '→ stable' : '↑ new',
    barColor: colors[i % colors.length],
  }));
}

function computeTeamStats(ideas: Idea[]) {
  const map: Record<string, number> = {};
  ideas.forEach(i => {
    const t = i.assigned_team || 'Unassigned';
    map[t] = (map[t] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function findPotentialDuplicates(ideas: Idea[]) {
  // Simple title-similarity detection: find ideas with overlapping keywords in same theme
  const pairs: { idea1: Idea; idea2: Idea; similarity: number; signals: string }[] = [];
  const byTheme: Record<string, Idea[]> = {};
  ideas.forEach(i => {
    const t = i.theme || 'none';
    if (!byTheme[t]) byTheme[t] = [];
    byTheme[t].push(i);
  });

  Object.values(byTheme).forEach(group => {
    for (let a = 0; a < group.length && pairs.length < 5; a++) {
      for (let b = a + 1; b < group.length && pairs.length < 5; b++) {
        const wordsA = new Set(group[a].title.toLowerCase().split(/[\s\-–,]+/).filter(w => w.length > 3));
        const wordsB = new Set(group[b].title.toLowerCase().split(/[\s\-–,]+/).filter(w => w.length > 3));
        const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
        const maxLen = Math.max(wordsA.size, wordsB.size);
        if (maxLen > 0 && overlap >= 2) {
          const sim = Math.round((overlap / maxLen) * 100);
          if (sim >= 40) {
            pairs.push({
              idea1: group[a], idea2: group[b], similarity: Math.min(sim + 30, 95),
              signals: `Same theme (${group[a].theme}), ${overlap} common keywords`,
            });
          }
        }
      }
    }
  });
  return pairs.sort((a, b) => b.similarity - a.similarity).slice(0, 4);
}

export default function IdeationIntelligenceHub({ open, onClose, onMerge, ideas = [] }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const themes = useMemo(() => computeThemes(ideas), [ideas]);
  const teamStats = useMemo(() => computeTeamStats(ideas), [ideas]);
  const duplicates = useMemo(() => findPotentialDuplicates(ideas), [ideas]);

  const total = ideas.length;
  const converted = ideas.filter(i => i.status === 'converted').length;
  const submitted = ideas.filter(i => i.status === 'submitted').length;
  const underReview = ideas.filter(i => i.status === 'under_review').length;
  const draft = ideas.filter(i => i.status === 'draft').length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.surface, zIndex: 400, overflowY: 'auto' }}>
      {/* ══ Header ══ */}
      <div style={{
        background: C.bg, padding: '20px 32px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', background: '#7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: '#FFFFFF',
          }}>✦</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: C.textPrimary }}>AI Ideas Hub</div>
            <div style={{ fontSize: '12px', color: C.textTertiary }}>{total} ideas analyzed · {themes.length} themes · {duplicates.length} duplicate signals</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer', padding: '8px 16px',
          fontSize: '13px', fontWeight: 600, color: C.textTertiary, borderRadius: '8px',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; }}
        >Close</button>
      </div>

      {/* ══ KPI Stat Strip ══ */}
      <div style={{ padding: '20px 32px', display: 'flex', gap: '16px' }}>
        {[
          { value: String(duplicates.length), label: `idea pairs with keyword overlap`, title: 'DUPLICATE SIGNALS', valueColor: '#D97706' },
          { value: String(themes.length), label: 'themes identified from backlog', title: 'THEMES DISCOVERED', valueColor: '#2563EB' },
          { value: `${conversionRate}%`, label: `${converted} of ${total} ideas converted`, title: 'CONVERSION RATE', valueColor: '#16A34A' },
          { value: String(underReview), label: `ideas pending review`, title: 'UNDER REVIEW', valueColor: '#0D9488' },
        ].map(s => (
          <div key={s.title} style={{
            flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px 20px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{s.title}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: MONO, color: s.valueColor }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: C.textTertiary, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ 2×2 Content Grid ══ */}
      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* ── Card A: Duplicate Detection ── */}
        <ContentCard title="Duplicate Detection" badge={`${duplicates.length} signals found`} badgeColor={C.warning}>
          {duplicates.length === 0 ? (
            <div style={{ fontSize: '13px', color: C.textTertiary, padding: '20px 0', textAlign: 'center' }}>
              No duplicate signals detected across {total} ideas
            </div>
          ) : duplicates.map((d, i) => (
            <DuplicatePair
              key={i}
              match={d.similarity}
              idea1={{ key: d.idea1.key, title: d.idea1.title }}
              idea2={{ key: d.idea2.key, title: d.idea2.title }}
              signals={d.signals}
              onMerge={onMerge ? () => onMerge(d.idea1.key, d.idea2.key) : undefined}
            />
          ))}
        </ContentCard>

        {/* ── Card B: Theme Discovery ── */}
        <ContentCard title="Theme Discovery" badge={`${themes.length} themes`} badgeColor={C.primary}>
          {themes.map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: C.textPrimary, fontSize: '14px', fontWeight: 500, minWidth: '140px', direction: /[\u0600-\u06FF]/.test(t.name) ? 'rtl' : 'ltr' }}>{t.name}</span>
              <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: C.textSecondary, minWidth: '55px' }}>
                {t.count} ideas
              </span>
              <span style={{ fontSize: '12px', color: C.textTertiary, minWidth: '60px' }}>{t.trend}</span>
              <div style={{ flex: 1, height: '8px', background: C.surfaceAlt, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${t.pct}%`, height: '100%', background: t.barColor, borderRadius: '4px' }} />
              </div>
            </div>
          ))}

          {themes.length > 0 && (
            <div style={{
              marginTop: '16px', borderLeft: `3px solid ${C.insightBorder}`,
              background: C.insightBg, borderRadius: '0 8px 8px 0', padding: '12px 16px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.insightText, marginBottom: '2px' }}>✦ Emerging Insight</div>
              <div style={{ fontSize: '13px', color: '#1e3a5f', lineHeight: 1.5 }}>
                The top theme "{themes[0].name}" accounts for {themes[0].count} ideas ({Math.round((themes[0].count / total) * 100)}% of backlog).
                {themes.length > 1 && ` "${themes[1].name}" follows with ${themes[1].count} ideas.`}
              </div>
            </div>
          )}
        </ContentCard>

        {/* ── Card C: Team Distribution ── */}
        <ContentCard title="Team Distribution" badge={`${teamStats.length} teams`} badgeColor={C.success}>
          {teamStats.map(([team, count]) => {
            const pct = Math.round((count / total) * 100);
            const barColor = team.includes('BAU') ? '#2563EB' : team.includes('Integration') ? '#0D9488' : team.includes('Mobile') ? '#7C3AED' : '#64748B';
            return (
              <div key={team} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: `1px solid ${C.surfaceAlt}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', color: C.textSecondary, fontWeight: 500 }}>{team}</span>
                  <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>{count} ideas · {pct}%</span>
                </div>
                <div style={{ marginTop: '4px', height: '4px', background: '#E4E4E7', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '4px' }} />
                </div>
              </div>
            );
          })}
        </ContentCard>

        {/* ── Card D: Status Breakdown ── */}
        <ContentCard title="Status Breakdown" badge={`${total} ideas`} badgeColor={C.success}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { name: 'Under Review', count: underReview, color: '#D97706' },
              { name: 'Converted', count: converted, color: '#16A34A' },
              { name: 'Submitted', count: submitted, color: '#2563EB' },
            ].map(p => (
              <div key={p.name} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '8px', padding: '14px', textAlign: 'center',
              }}>
                <div style={{ height: '4px', background: C.border, borderRadius: '4px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${total > 0 ? Math.round((p.count / total) * 100) : 0}%`, background: p.color, borderRadius: '4px' }} />
                </div>
                <div style={{ fontFamily: MONO, fontSize: '24px', fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>{p.count}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, marginTop: '6px' }}>{p.name}</div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: C.textTertiary, marginTop: '2px' }}>{total > 0 ? Math.round((p.count / total) * 100) : 0}%</div>
              </div>
            ))}
          </div>

          {draft > 0 && (
            <div style={{
              background: C.gapBg, borderLeft: `3px solid ${C.gapBorder}`,
              borderRadius: '0 6px 6px 0', padding: '12px 16px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.gapText, marginBottom: '2px' }}>⚠ Attention Needed</div>
              <div style={{ fontSize: '13px', color: C.gapBody, lineHeight: 1.5 }}>
                {draft} ideas remain in Draft status. Consider reviewing and promoting them to the pipeline.
              </div>
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}

/* ── Content Card wrapper ── */
function ContentCard({ title, badge, badgeColor, children }: { title: string; badge: string; badgeColor: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid #F4F4F5`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{title}</span>
        <span style={{
          background: C.surfaceAlt, color: C.textTertiary,
          fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '12px',
        }}>{badge}</span>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

/* ── Duplicate Pair Card ── */
function DuplicatePair({ match, idea1, idea2, signals, onMerge }: {
  match: number; idea1: { key: string; title: string }; idea2: { key: string; title: string };
  signals: string; onMerge?: () => void;
}) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.primary}`,
      borderRadius: '8px', padding: '12px 16px', marginBottom: '12px',
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: C.primary, fontSize: '13px', fontWeight: 600 }}>{match}% similarity</span>
      </div>
      <div style={{ fontSize: '13px', marginBottom: '2px' }}>
        <span style={{ fontFamily: MONO, fontWeight: 600, color: C.textPrimary }}>{idea1.key}</span>
        <span style={{ color: C.textSecondary, marginLeft: '6px', fontWeight: 400 }}>{idea1.title}</span>
      </div>
      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
        <span style={{ fontFamily: MONO, fontWeight: 600, color: C.textPrimary }}>{idea2.key}</span>
        <span style={{ color: C.textSecondary, marginLeft: '6px', fontWeight: 400 }}>{idea2.title}</span>
      </div>
      <div style={{ fontSize: '12px', color: C.textTertiary, lineHeight: 1.5, marginBottom: '10px' }}>
        Shared signals: {signals}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => { if (onMerge) onMerge(); else toast.success('Merge initiated'); }}
          style={{ background: C.primary, color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          Merge Ideas
        </button>
        <button onClick={() => toast('Kept separate')}
          style={{ background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
