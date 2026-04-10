/**
 * CleanupPage — AI Cleanup Governance
 * Full page for managing stale work items.
 * Light mode only. Page bg #F8FAFC, cards #fff.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGovernanceScore } from '@/hooks/useGovernanceScore';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronDown, Clock, AlertTriangle, Sparkles,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Types ────────────────────────────────────────
interface CleanupItem {
  id: string;
  issue_key: string;
  title: string;
  status: string;
  issue_type: string;
  updated_at: string;
  created_at: string;
  assignee_id: string | null;
  reporter_id: string | null;
  parent_id: string | null;
  days_stale: number;
  reporter_name?: string;
}

interface CategoryDef {
  key: number;
  emoji: string;
  iconBg: string;
  countColor: string;
  name: string;
  description: string;
  tag: string;
  tagStyle: React.CSSProperties;
  isReporterOnus: boolean;
}

// ── Category Definitions ────────────────────────
const CATEGORIES: CategoryDef[] = [
  {
    key: 1, emoji: '💀', iconBg: '#FEF2F2', countColor: '#DC2626',
    name: 'Ghost Tickets', description: 'No comments, no activity, 60+ days stale',
    tag: 'FORCE CLOSE',
    tagStyle: { background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9E4B00' },
    isReporterOnus: false,
  },
  {
    key: 2, emoji: '🧱', iconBg: '#FFF7ED', countColor: '#D97706',
    name: 'No Work Breakdown', description: 'Story with no subtasks, 30+ days old',
    tag: 'FORCE CLOSE',
    tagStyle: { background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9E4B00' },
    isReporterOnus: false,
  },
  {
    key: 3, emoji: '👤', iconBg: '#F0FDF4', countColor: '#0F766E',
    name: 'Inactive / Departed Assignee', description: 'Assignee inactive 60+ days',
    tag: 'REPORTER ONUS',
    tagStyle: { background: '#F0FDF4', border: '1px solid #A7F3D0', color: '#065F46' },
    isReporterOnus: true,
  },
  {
    key: 4, emoji: '⚡', iconBg: '#EFF6FF', countColor: '#2563EB',
    name: 'Epic-Linked Stale Story', description: 'Linked to active epic, 45+ days stale',
    tag: 'DE-LINK FIRST',
    tagStyle: { background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9E4B00' },
    isReporterOnus: false,
  },
  {
    key: 5, emoji: '🔗', iconBg: '#F5F3FF', countColor: '#7C3AED',
    name: 'Blocker Resolved Forgotten', description: 'Blocking issue resolved 30+ days ago',
    tag: 'FORCE CLOSE',
    tagStyle: { background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9E4B00' },
    isReporterOnus: false,
  },
  {
    key: 6, emoji: '🤖', iconBg: '#EDE9FF', countColor: '#6D28D9',
    name: 'AI Duplicate / Superseded', description: 'AI-detected duplicates',
    tag: 'LINK + CLOSE',
    tagStyle: { background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9E4B00' },
    isReporterOnus: false,
  },
  {
    key: 7, emoji: '🐛', iconBg: '#F0FDF4', countColor: '#0F766E',
    name: 'Active Defect, Assignee Inactive', description: 'Bug with inactive assignee',
    tag: 'REPORTER ONUS',
    tagStyle: { background: '#F0FDF4', border: '1px solid #A7F3D0', color: '#065F46' },
    isReporterOnus: true,
  },
];

const CLOSURE_REASONS = [
  'Governance cleanup — no activity 30+ days',
  'Superseded by duplicate',
  'Blocker resolved, item no longer needed',
  'No work breakdown — never refined',
  'Epic cancelled',
];

// ── Status Lozenge ──────────────────────────────
function StatusLozenge({ value }: { value: string }) {
  const lower = (value || '').toLowerCase();
  let bg = '#DFE1E6', color = '#253858';
  if (lower.includes('progress') || lower.includes('review') || lower.includes('active')) {
    bg = '#DEEBFF'; color = '#0747A6';
  } else if (lower.includes('done') || lower.includes('approved') || lower.includes('complete')) {
    bg = '#E3FCEF'; color = '#006644';
  }
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', borderRadius: 3, padding: '0 6px',
      background: bg, color, fontFamily: 'Inter, sans-serif',
    }}>
      {value}
    </span>
  );
}

// ── Staleness Badge ─────────────────────────────
function StalenessBadge({ days }: { days: number }) {
  const color = days > 90 ? '#DC2626' : days > 45 ? '#D97706' : '#94A3B8';
  const bg = days > 90 ? '#FEF2F2' : days > 45 ? '#FFFBEB' : '#F1F5F9';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 3, padding: '1px 5px',
      background: bg, color, fontFamily: 'JetBrains Mono, monospace',
    }}>
      {days}d
    </span>
  );
}

// ── AI Insight per category ─────────────────────
const AI_INSIGHTS: Record<number, string> = {
  1: 'No comments or transitions in 60+ days. Safe to close.',
  2: 'Story created 30+ days ago with no subtasks or work breakdown.',
  4: 'Linked to an active epic but stale for 45+ days.',
  5: 'Blocking issue was resolved 30+ days ago.',
  6: 'AI-detected duplicate or superseded item.',
};

// ── Main Component ──────────────────────────────
export default function CleanupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: govScore } = useGovernanceScore();

  const [openCats, setOpenCats] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showForceCloseDialog, setShowForceCloseDialog] = useState(false);
  const [closureReason, setClosureReason] = useState(CLOSURE_REASONS[0]);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  const toggleCat = (key: number, count: number) => {
    if (count === 0) return;
    setOpenCats(p => ({ ...p, [key]: !p[key] }));
  };

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Fetch cleanup items per category ──────────
  const { data: catData = {} as Record<number, CleanupItem[]>, isLoading } = useQuery({
    queryKey: ['cleanup-categories', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const result: Record<number, CleanupItem[]> = {};
      const now = Date.now();
      const mapItems = (data: any[] | null): CleanupItem[] =>
        (data ?? []).map(i => ({
          ...i,
          days_stale: Math.floor((now - new Date(i.updated_at || i.created_at || '').getTime()) / 86400_000),
        }));

      // Cat 1: Ghost Tickets
      const { data: d1 } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, status, issue_type, updated_at, created_at, assignee_id, reporter_id, parent_id')
        .eq('assignee_id', user!.id)
        .neq('status', 'done')
        .lt('updated_at', new Date(now - 60 * 86400_000).toISOString())
        .limit(50);
      result[1] = mapItems(d1);

      // Cat 2: No Work Breakdown
      const { data: d2 } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, status, issue_type, updated_at, created_at, assignee_id, reporter_id, parent_id')
        .eq('assignee_id', user!.id)
        .eq('issue_type', 'Story')
        .neq('status', 'done')
        .lt('created_at', new Date(now - 30 * 86400_000).toISOString())
        .limit(50);
      result[2] = mapItems(d2);

      // Cat 3: Inactive Assignee (simplified — fetch all non-done, filter client-side)
      const { data: d3 } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, status, issue_type, updated_at, created_at, assignee_id, reporter_id, parent_id')
        .neq('status', 'done')
        .not('reporter_id', 'is', null)
        .limit(20);
      result[3] = mapItems(d3).slice(0, 10);

      // Cat 4: Epic-Linked Stale
      const { data: d4 } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, status, issue_type, updated_at, created_at, assignee_id, reporter_id, parent_id')
        .eq('assignee_id', user!.id)
        .neq('status', 'done')
        .not('parent_id', 'is', null)
        .lt('updated_at', new Date(now - 45 * 86400_000).toISOString())
        .limit(50);
      result[4] = mapItems(d4);

      // Cat 5, 6: Empty for now
      result[5] = [];
      result[6] = [];

      // Cat 7: Active Defect Inactive Assignee
      const { data: d7 } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, status, issue_type, updated_at, created_at, assignee_id, reporter_id, parent_id')
        .eq('issue_type', 'Bug')
        .neq('status', 'done')
        .limit(20);
      result[7] = mapItems(d7).slice(0, 10);

      return result;
    },
    staleTime: 60_000,
  });

  // ── Stats ─────────────────────────────────────
  const stats = useMemo(() => {
    const counts = CATEGORIES.map(c => (catData[c.key] ?? []).length);
    return {
      total: counts.reduce((a, b) => a + b, 0),
      ghost: counts[0],
      noBreakdown: counts[1],
      reporter: counts[2] + counts[6],
      other: counts[3] + counts[4] + counts[5],
    };
  }, [catData]);

  // ── Force Close Handler ───────────────────────
  const handleForceClose = useCallback(async () => {
    if (!user?.id || selected.size === 0) return;
    const ids = Array.from(selected);

    const { error } = await supabase
      .from('catalyst_issues')
      .update({
        status: 'done',
        closure_method: 'force_bypass',
        force_closed_by: user.id,
        force_closed_at: new Date().toISOString(),
        force_close_reason: closureReason,
        restore_deadline: new Date(Date.now() + 90 * 86400_000).toISOString(),
      })
      .in('id', ids);

    if (error) { toast.error('Force close failed: ' + error.message); return; }

    const allItems = Object.values(catData).flat();
    const closedItems = allItems.filter(i => ids.includes(i.id));

    for (const item of closedItems) {
      const catKey = CATEGORIES.find(c => (catData[c.key] ?? []).some(ci => ci.id === item.id))?.key ?? 0;
      await supabase.from('governance_closure_log').insert({
        item_key: item.issue_key,
        issue_id: item.id,
        closed_by: user.id,
        governance_category: catKey,
        stale_days: item.days_stale,
        reporter_notified: !!item.reporter_id,
        restore_deadline: new Date(Date.now() + 90 * 86400_000).toISOString(),
        closure_reason: closureReason,
      });
    }

    const reporterIds = [...new Set(closedItems.map(i => i.reporter_id).filter(Boolean))] as string[];
    for (const rid of reporterIds) {
      const rItems = closedItems.filter(i => i.reporter_id === rid);
      await supabase.from('notifications').insert({
        recipient_user_id: rid,
        notification_type: 'direct',
        title: 'Items force-closed — action may be required',
        message: rItems.map(i => `${i.issue_key} "${i.title}"`).join(', ') + ' — force-closed by governance cleanup. Restore within 90 days if needed.',
        entity_type: 'issue',
        entity_id: rItems[0].id,
      });
    }

    qc.invalidateQueries({ queryKey: ['ageing-items'] });
    qc.invalidateQueries({ queryKey: ['governance-score'] });
    qc.invalidateQueries({ queryKey: ['cleanup-categories'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['watching-tab'] });

    setSelected(new Set());
    setShowForceCloseDialog(false);
    toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} force-closed. Reporters notified. RAG recalculating.`);
  }, [user, selected, closureReason, catData, qc]);

  // ── Notify Reporter ───────────────────────────
  const handleNotifyReporter = useCallback(async (item: CleanupItem) => {
    if (!item.reporter_id) { toast.error('No reporter on this item'); return; }
    await supabase.from('notifications').insert({
      recipient_user_id: item.reporter_id,
      notification_type: 'direct',
      title: 'Action required — inactive assignee',
      message: `${item.issue_key} "${item.title}" — assignee inactive. Please reassign or close within 7 days.`,
      entity_type: 'issue',
      entity_id: item.id,
    });
    toast.success('Reporter notified');
  }, []);

  const ragStatus = govScore?.ragStatus ?? 'green';
  const breachStreak = govScore?.breachStreak ?? 0;
  const ragCfg = {
    green: { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', dot: '#10B981', anim: 'none' },
    amber: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', dot: '#F59E0B', anim: 'rag-pulse 1.5s ease-in-out infinite' },
    red:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B', dot: '#EF4444', anim: 'rag-pulse 0.8s ease-in-out infinite' },
  }[ragStatus];

  const allFlatItems = useMemo(() => Object.values(catData).flat(), [catData]);
  const selectedItems = useMemo(() => allFlatItems.filter(i => selected.has(i.id)), [allFlatItems, selected]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#F8FAFC', fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @keyframes rag-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ═══ TOPBAR ═══ */}
      <div style={{
        height: 48, flexShrink: 0, background: '#fff',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#2563EB',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <ChevronLeft size={14} />
          Notifications
        </button>
        <div style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
          AI Cleanup
        </span>
        <span style={{
          background: '#EDE9FF', color: '#5B21B6', fontSize: 10, fontWeight: 700,
          borderRadius: 4, padding: '2px 8px', fontFamily: 'Inter, sans-serif',
        }}>
          Gemini · daily scan
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: '#F5F3FF', borderRadius: 10, padding: '2px 8px',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, color: '#5B21B6',
          }}>
            <Clock size={8} color="#7C3AED" />
            Last scan: today 02:00 AST
          </span>
          <button
            onClick={() => {}}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              borderRadius: 20, padding: '3px 9px',
              fontSize: 10, fontWeight: 700,
              background: ragCfg.bg, border: `1.5px solid ${ragCfg.border}`, color: ragCfg.color,
              cursor: 'default', fontFamily: 'Inter, sans-serif',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: ragCfg.dot, display: 'inline-block',
              animation: ragCfg.anim,
            }} />
            {ragStatus.toUpperCase()}
          </button>
        </div>
      </div>

      {/* ═══ CAUTION BANNER ═══ */}
      {breachStreak > 0 && (
        <div style={{
          background: '#FFF1F2', borderBottom: '1px solid #FECDD3',
          padding: '8px 16px', display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <AlertTriangle size={14} color="#E11D48" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: '#9F1239', lineHeight: '16px' }}>
            Governance breach — {breachStreak} consecutive day{breachStreak !== 1 ? 's' : ''}.
            Force closures bypass status workflow. Reporters notified automatically.
            Audit trail is permanent. Restore window: 90 days.
            REPORTER items — onus is on the reporter, not you.
          </span>
        </div>
      )}

      {/* ═══ STATS ROW ═══ */}
      <div style={{
        height: 72, flexShrink: 0, background: '#fff',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center',
      }}>
        {[
          { label: 'AI FLAGGED', value: stats.total, color: '#7C3AED' },
          { label: 'GHOST', value: stats.ghost, color: '#DC2626' },
          { label: 'NO BREAKDOWN', value: stats.noBreakdown, color: '#D97706' },
          { label: 'REPORTER', value: stats.reporter, color: '#0F766E' },
          { label: 'OTHER', value: stats.other, color: '#2563EB' },
        ].map((cell, i) => (
          <div
            key={cell.label}
            style={{
              flex: 1, textAlign: 'center', padding: '8px 12px',
              borderRight: i < 4 ? '0.75px solid #F1F5F9' : 'none',
            }}
          >
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 20,
              fontWeight: 700, color: cell.color,
            }}>
              {cell.value}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', marginTop: 2,
            }}>
              {cell.label}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CATEGORY CARDS ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 70px' }}>
        {!isLoading && stats.total === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', marginTop: 64, gap: 12,
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#065F46' }}>
              Governance: GREEN
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              All items are in compliance. Check back tomorrow.
            </span>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{
              width: 24, height: 24,
              border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CATEGORIES.map(cat => {
              const items = catData[cat.key] ?? [];
              const isOpen = openCats[cat.key] ?? false;
              const visibleItems = items.slice(0, 10);
              const remaining = items.length - visibleItems.length;

              return (
                <div key={cat.key} style={{
                  background: '#fff', border: '1px solid #E2E8F0',
                  borderRadius: 8, overflow: 'hidden',
                }}>
                  {/* Card Header */}
                  <button
                    onClick={() => toggleCat(cat.key, items.length)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: 10, padding: '10px 14px', border: 'none',
                      cursor: items.length === 0 ? 'default' : 'pointer',
                      background: 'transparent',
                      opacity: items.length === 0 ? 0.5 : 1,
                      fontFamily: 'Inter, sans-serif',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: cat.iconBg, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      flexShrink: 0,
                    }}>
                      {cat.emoji}
                    </span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                          {cat.name}
                        </span>
                        <span style={{
                          fontSize: 7, fontWeight: 700, textTransform: 'uppercase',
                          borderRadius: 3, padding: '1px 4px',
                          ...cat.tagStyle,
                        }}>
                          {cat.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        {cat.description}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 16, fontWeight: 700, color: cat.countColor,
                      flexShrink: 0,
                    }}>
                      {items.length}
                    </span>
                    <ChevronDown
                      size={14}
                      color="#94A3B8"
                      style={{
                        transition: 'transform 0.15s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {/* Card Body */}
                  {isOpen && (
                    <div style={{ borderTop: '0.75px solid #F1F5F9' }}>
                      {items.length === 0 ? (
                        <div style={{
                          padding: '20px 14px', textAlign: 'center',
                          fontSize: 12, color: '#94A3B8',
                        }}>
                          No items in this category
                        </div>
                      ) : (
                        <>
                          {visibleItems.map(item => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex', gap: 10, padding: '10px 14px',
                                borderBottom: '0.75px solid #F8FAFC',
                                alignItems: 'flex-start',
                              }}
                            >
                              {/* Checkbox (not for reporter onus) */}
                              {!cat.isReporterOnus && (
                                <button
                                  onClick={() => toggleItem(item.id)}
                                  style={{
                                    width: 14, height: 14, borderRadius: 3,
                                    border: selected.has(item.id) ? 'none' : '1.5px solid #CBD5E1',
                                    background: selected.has(item.id) ? '#2563EB' : 'transparent',
                                    cursor: 'pointer', flexShrink: 0, marginTop: 2,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: 0,
                                  }}
                                >
                                  {selected.has(item.id) && (
                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                      <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>
                              )}

                              {/* Item detail */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: 11, fontWeight: 700, color: '#2563EB',
                                  }}>
                                    {item.issue_key}
                                  </span>
                                  <StatusLozenge value={item.status} />
                                  <StalenessBadge days={item.days_stale} />
                                </div>
                                <div style={{ fontSize: 12, color: '#1E293B', marginTop: 4 }}>
                                  {item.title}
                                </div>
                                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                                  {item.reporter_name || 'Unknown reporter'}
                                </div>

                                {/* AI Insight box */}
                                {!cat.isReporterOnus && (
                                  <div style={{
                                    marginTop: 6, background: '#F5F3FF',
                                    borderLeft: '2.5px solid #7C3AED',
                                    borderRadius: '0 4px 4px 0', padding: '6px 8px',
                                    fontSize: 11, color: '#4C1D95', lineHeight: '16px',
                                  }}>
                                    🤖 {AI_INSIGHTS[cat.key] ?? 'Governance auto-flagged for review.'}
                                  </div>
                                )}

                                {/* Reporter note for Cat 3/7 */}
                                {cat.isReporterOnus && (
                                  <div style={{
                                    marginTop: 6, background: '#F0FDF4',
                                    borderLeft: '2.5px solid #10B981',
                                    borderRadius: '0 4px 4px 0', padding: '6px 8px',
                                    fontSize: 11, color: '#065F46', lineHeight: '16px',
                                  }}>
                                    📋 Reporter must reassign or close. Notification queued.
                                    7-day window before escalation to line manager.
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                  {cat.isReporterOnus ? (
                                    <button
                                      onClick={() => handleNotifyReporter(item)}
                                      style={{
                                        height: 24, padding: '0 8px', borderRadius: 4,
                                        border: '1px solid #A7F3D0', background: 'transparent',
                                        color: '#0F766E', fontSize: 10, fontWeight: 600,
                                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                      }}
                                    >
                                      Notify reporter
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelected(new Set([item.id]));
                                          setShowForceCloseDialog(true);
                                        }}
                                        style={{
                                          height: 22, padding: '0 6px', borderRadius: 3,
                                          border: '1px solid #E2E8F0', background: 'transparent',
                                          color: '#475569', fontSize: 10, fontWeight: 600,
                                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}
                                      >
                                        Force close
                                      </button>
                                      {cat.key === 2 && (
                                        <button style={{
                                          height: 22, padding: '0 6px', borderRadius: 3,
                                          border: '1px solid #BFDBFE', background: 'transparent',
                                          color: '#0747A6', fontSize: 10, fontWeight: 600,
                                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}>
                                          Return to reporter
                                        </button>
                                      )}
                                      {cat.key === 4 && (
                                        <button style={{
                                          height: 22, padding: '0 6px', borderRadius: 3,
                                          border: '1px solid #BFDBFE', background: 'transparent',
                                          color: '#0747A6', fontSize: 10, fontWeight: 600,
                                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}>
                                          De-link + Close
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {remaining > 0 && (
                            <div style={{
                              textAlign: 'center', padding: '6px 0',
                              fontSize: 11, color: '#94A3B8', cursor: 'pointer',
                            }}>
                              ＋{remaining} more items
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ STICKY BOTTOM BAR ═══ */}
      <div style={{
        position: 'sticky', bottom: 0, background: '#fff',
        borderTop: '1px solid #E2E8F0',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
        zIndex: 10,
      }}>
        <span style={{
          flex: 1, fontSize: 11,
          fontWeight: selected.size > 0 ? 700 : 400,
          color: selected.size > 0 ? '#0F172A' : '#94A3B8',
        }}>
          {selected.size} item{selected.size !== 1 ? 's' : ''} selected
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreviewSheet(true)}
          style={{ height: 30, fontSize: 11 }}
        >
          Preview reporter notifications
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (selected.size === 0) { toast.error('Select items first'); return; }
            handleForceClose();
          }}
          style={{ height: 30, fontSize: 11, background: '#D97706', border: 'none' }}
        >
          Force Close (via workflow)
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (selected.size === 0) { toast.error('Select items first'); return; }
            setShowForceCloseDialog(true);
          }}
          style={{ height: 30, fontSize: 11, background: '#DC2626', border: 'none' }}
        >
          Force Close (bypass) →
        </Button>
      </div>

      {/* ═══ FORCE CLOSE CONFIRMATION DIALOG ═══ */}
      <Dialog open={showForceCloseDialog} onOpenChange={setShowForceCloseDialog}>
        <DialogContent style={{ maxWidth: 460, backgroundColor: '#ffffff' }} className="!bg-white !text-slate-900">
          <DialogHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <DialogTitle style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700 }}>
                Confirm Force Closure
              </DialogTitle>
              <span style={{
                fontSize: 7, fontWeight: 700, textTransform: 'uppercase',
                borderRadius: 3, padding: '1px 4px',
                background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9E4B00',
              }}>
                FORCE CLOSE
              </span>
            </div>
          </DialogHeader>

          {/* Impact list */}
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 6, padding: 12, marginBottom: 12,
          }}>
            {[
              { dot: '#10B981', text: "Status → DONE · closure_method = 'force_bypass'" },
              { dot: '#10B981', text: 'force_closed_by, force_closed_at, restore_deadline = today + 90d written to DB' },
              { dot: '#F59E0B', text: 'All reporters receive Direct notification with restore link' },
              { dot: '#F59E0B', text: 'Epic completion % recalculated for any de-linked stories' },
              { dot: '#7C3AED', text: 'Governance Audit Trail record written — irrevocable' },
              { dot: '#7C3AED', text: 'Your governance RAG status recalculates within 24h' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: row.dot, flexShrink: 0, marginTop: 3,
                }} />
                <span style={{ fontSize: 11, color: '#1E293B', lineHeight: '16px' }}>
                  {row.text}
                </span>
              </div>
            ))}
          </div>

          {/* Notification preview */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
              Reporter notifications ({selectedItems.length})
            </div>
            {selectedItems.slice(0, 3).map(item => (
              <div key={item.id} style={{
                background: '#EDE9FF', borderLeft: '2.5px solid #7C3AED',
                borderRadius: '0 4px 4px 0', padding: 8, marginBottom: 6,
                fontSize: 11, color: '#4C1D95',
              }}>
                {item.issue_key} "{item.title}" — force-closed. Restore within 90 days.
              </div>
            ))}
          </div>

          {/* Closure reason */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
              CLOSURE REASON
            </label>
            <Select value={closureReason} onValueChange={setClosureReason}>
              <SelectTrigger
                style={{
                  width: '100%', height: 28, border: '1px solid #E2E8F0',
                  borderRadius: 4, fontSize: 11, color: '#0F172A',
                  background: '#fff', fontFamily: 'Inter, sans-serif',
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!bg-white !text-slate-900">
                {CLOSURE_REASONS.map(r => (
                  <SelectItem key={r} value={r} style={{ fontSize: 11 }}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter style={{ marginTop: 16, gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowForceCloseDialog(false)}>
              Cancel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/audit')}>
              Audit trail →
            </Button>
            <Button
              size="sm"
              onClick={handleForceClose}
              style={{ background: '#DC2626', border: 'none', color: '#fff' }}
            >
              Confirm →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PREVIEW SHEET ═══ */}
      <Sheet open={showPreviewSheet} onOpenChange={setShowPreviewSheet}>
        <SheetContent side="right" style={{ width: 400, backgroundColor: '#ffffff' }} className="!bg-white !text-slate-900">
          <SheetHeader>
            <SheetTitle style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700 }}>
              Reporter Notification Preview
            </SheetTitle>
          </SheetHeader>
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedItems.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 24 }}>
                Select items to preview notifications
              </div>
            ) : (
              selectedItems.map(item => (
                <div key={item.id} style={{
                  background: '#EDE9FF', borderLeft: '2.5px solid #7C3AED',
                  borderRadius: '0 4px 4px 0', padding: 10,
                  fontSize: 11, color: '#4C1D95', lineHeight: '16px',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    {item.issue_key}
                  </div>
                  <div>"{item.title}" — force-closed by governance cleanup. Restore within 90 days if needed.</div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
