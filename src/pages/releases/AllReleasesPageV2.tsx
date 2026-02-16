/**
 * ALL RELEASES PAGE V2 — ReleaseHub Complete Rebuild
 * Ring-fenced CSS (--rh-*), Health Engine, AI Insights, 3 views
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Plus, Sparkles, LayoutGrid, Clock, Table2,
  Download, Loader2, Package, RefreshCw, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useReleasesV2, type ReleaseV2, type ViewMode, type ReleaseFiltersV2, type ReleaseStatusV2, type ReleaseHealthLevel } from '@/hooks/releases/useReleasesV2';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exportReleasesToCSV } from '@/lib/releases/export-utils';
import styles from '@/styles/release-hub.module.css';

// Inline AI hook to avoid circular deps
function useReleaseAIInsightsInline(enabled: boolean) {
  return useQuery({
    queryKey: ['release-ai-insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('release-ai-insights', { method: 'POST', body: {} });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

// ─── Sub-components (inline for cohesion) ──────────────────

function HealthChip({ score, level }: { score: number; level: string }) {
  const cls = level === 'critical' ? styles.healthChipCritical
    : level === 'at_risk' ? styles.healthChipAtRisk
    : styles.healthChipHealthy;
  return (
    <span className={`${styles.healthChip} ${cls}`} role="img" aria-label={`Health score ${score}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    planned: { label: 'Planned', cls: styles.statusPlanned },
    planning: { label: 'Planning', cls: styles.statusPlanned },
    development: { label: 'Dev', cls: styles.statusDevelopment },
    staging: { label: 'Staging', cls: styles.statusStaging },
    testing: { label: 'Testing', cls: styles.statusTesting },
    uat: { label: 'UAT', cls: styles.statusUat },
    released: { label: 'Released', cls: styles.statusReleased },
    archived: { label: 'Archived', cls: styles.statusPlanned },
  };
  const cfg = map[status] || map.planned;
  return (
    <span className={`${styles.statusBadge} ${cfg.cls}`}>
      <span className={styles.statusDot} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const fillCls = value >= 80 ? styles.progressGreen
    : value >= 40 ? styles.progressBlue
    : styles.progressRed;
  return (
    <div>
      <div className={styles.progressBar} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${styles.progressFill} ${fillCls}`} style={{ width: `${value}%` }} />
      </div>
      <div className={styles.progressPct}>{value}%</div>
    </div>
  );
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── CARDS VIEW ───────────────────────────────────────────────
function CardsView({ releases, onNavigate }: { releases: ReleaseV2[]; onNavigate: (id: string) => void }) {
  return (
    <div className={styles.cardsGrid}>
      {releases.map(r => {
        const cardCls = r.health_level === 'critical' ? styles.cardCritical
          : r.health_level === 'at_risk' ? styles.cardAtRisk
          : styles.cardHealthy;
        return (
          <div key={r.id} className={`${styles.card} ${cardCls}`} onClick={() => onNavigate(r.id)}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.versionBadge}>{r.version}</span>
                <div className={styles.cardTitle} style={{ marginTop: 6 }}>{r.name}</div>
              </div>
              <HealthChip score={r.health_score} level={r.health_level} />
            </div>
            <ProgressBar value={r.progress} />
            <div className={styles.cardMeta}>
              <StatusBadge status={r.status} />
              <span className={styles.cardDateRange}>
                {formatShortDate(r.start_date)} — {formatShortDate(r.target_date)}
              </span>
              {r.days_until_target < 0 && r.status !== 'released' && (
                <span className={styles.overdueBadge}>{Math.abs(r.days_until_target)}d overdue</span>
              )}
            </div>
            <div className={styles.cardSeparator} />
            <div className={styles.cardStats}>
              <span className={styles.cardStat}>
                <span className={styles.cardStatValue}>{r.test_cases_passed}/{r.test_cases_total}</span> Tests
              </span>
              <span className={styles.cardStat}>
                <span className={styles.cardStatValue} style={r.defects_open > 0 ? { color: 'var(--rh-danger)' } : undefined}>
                  {r.defects_open}
                </span> Defects
              </span>
              <span className={styles.cardStat}>
                <span className={styles.cardStatValue}>{r.coverage_percent}%</span> Cov
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TABLE VIEW ───────────────────────────────────────────────
function TableView({ releases, onNavigate }: { releases: ReleaseV2[]; onNavigate: (id: string) => void }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.th} style={{ width: 240 }}>Release</th>
            <th className={styles.th} style={{ width: 110 }}>Status</th>
            <th className={styles.th} style={{ width: 160 }}>Dates</th>
            <th className={styles.th} style={{ width: 130 }}>Progress</th>
            <th className={styles.th} style={{ width: 110 }}>Tests</th>
            <th className={styles.th} style={{ width: 72 }}>Defects</th>
            <th className={styles.th} style={{ width: 110 }}>Coverage</th>
            <th className={styles.th} style={{ width: 72 }}>Health</th>
            <th className={styles.th} style={{ width: 72 }}>Days</th>
            <th className={styles.th} style={{ width: 110 }}>Owner</th>
          </tr>
        </thead>
        <tbody>
          {releases.map(r => (
            <tr key={r.id} className={styles.tr} onClick={() => onNavigate(r.id)}>
              <td className={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={styles.versionBadge}>{r.version}</span>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {r.name}
                  </span>
                </div>
              </td>
              <td className={styles.td}><StatusBadge status={r.status} /></td>
              <td className={styles.td}>
                <span className={styles.dateRange}>
                  {formatShortDate(r.start_date)} → {formatShortDate(r.target_date)}
                </span>
              </td>
              <td className={styles.td}><ProgressBar value={r.progress} /></td>
              <td className={styles.td}>
                <span className={`${styles.mono}`} style={{ fontSize: 12 }}>
                  {r.test_cases_passed}/{r.test_cases_total}
                </span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono} style={{ fontSize: 12, fontWeight: 600, color: r.defects_open > 0 ? 'var(--rh-danger)' : undefined }}>
                  {r.defects_open}
                </span>
              </td>
              <td className={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 48, height: 4, background: 'var(--rh-bg-muted)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${r.coverage_percent}%`, height: '100%', borderRadius: 2,
                      background: r.coverage_percent >= 61 ? 'var(--rh-teal)' : r.coverage_percent >= 31 ? 'var(--rh-warning)' : 'var(--rh-danger)',
                    }} />
                  </div>
                  <span className={styles.mono} style={{ fontSize: 12 }}>{r.coverage_percent}%</span>
                </div>
              </td>
              <td className={styles.td}>
                <HealthChip score={r.health_score} level={r.health_level} />
              </td>
              <td className={styles.td}>
                {r.status === 'released' ? (
                  <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, color: 'var(--rh-teal)' }}>Released</span>
                ) : (
                  <span className={styles.mono} style={{
                    fontSize: 12, fontWeight: 600,
                    color: r.days_until_target < 0 ? 'var(--rh-danger)' : r.days_until_target <= 7 ? 'var(--rh-warning)' : 'var(--rh-text-secondary)',
                  }}>
                    {r.days_until_target < 0 ? `${r.days_until_target}d` : `${r.days_until_target}d`}
                  </span>
                )}
              </td>
              <td className={styles.td}>
                <span style={{ fontSize: 13, color: 'var(--rh-text-secondary)' }}>
                  {r.owner_name || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── TIMELINE VIEW ──────────────────────────────────────────
function TimelineView({ releases, onNavigate }: { releases: ReleaseV2[]; onNavigate: (id: string) => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { label: d.toLocaleString('en-US', { month: 'short' }), start: d, end: new Date(year, i + 1, 0) };
  });
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31).getTime();
  const yearSpan = yearEnd - yearStart;

  const todayPct = ((now.getTime() - yearStart) / yearSpan) * 100;

  function getBarPos(r: ReleaseV2) {
    const s = r.start_date ? new Date(r.start_date).getTime() : now.getTime();
    const e = r.target_date ? new Date(r.target_date).getTime() : s + 30 * 86400000;
    const left = Math.max(0, ((s - yearStart) / yearSpan) * 100);
    const width = Math.max(2, ((e - s) / yearSpan) * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  }

  function barCls(r: ReleaseV2) {
    if (r.status === 'released') return styles.ganttBarDone;
    if (r.health_level === 'critical') return styles.ganttBarCrit;
    if (r.health_level === 'at_risk') return styles.ganttBarRisk;
    if (r.progress === 0) return styles.ganttBarPlan;
    return styles.ganttBarOk;
  }

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineGrid}>
        <div className={styles.timelineHeaderLabel}>Release</div>
        <div className={styles.timelineMonths}>
          {months.map(m => <div key={m.label} className={styles.timelineMonth}>{m.label}</div>)}
        </div>
        {releases.map(r => {
          const pos = getBarPos(r);
          return (
            <div key={r.id} className={styles.timelineRow}>
              <div className={styles.timelineRowLabel}>
                <span className={styles.versionBadge} style={{ fontSize: 10 }}>{r.version}</span>
                <span className={styles.timelineRowLabelText}>{r.name}</span>
              </div>
              <div className={styles.timelineBarsCell}>
                {/* Today line */}
                <div className={styles.todayLine} style={{ left: `${todayPct}%` }}>
                  <span className={styles.todayLabel}>Today</span>
                </div>
                <div
                  className={`${styles.ganttBar} ${barCls(r)}`}
                  style={{ left: pos.left, width: pos.width }}
                  onClick={() => onNavigate(r.id)}
                >
                  {r.progress > 0 && (
                    <div className={styles.ganttBarFill} style={{ width: `${r.progress}%` }} />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{r.progress}%</span>
                  <div className={styles.ganttTooltip}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span>|</span>
                    <span>{formatShortDate(r.start_date)} → {formatShortDate(r.target_date)}</span>
                    <span>|</span>
                    <span>Health: {r.health_score}</span>
                    {r.days_until_target < 0 && r.status !== 'released' && (
                      <span style={{ color: '#FCA5A5' }}> · {Math.abs(r.days_until_target)}d overdue</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI INSIGHTS PANEL ────────────────────────────────────────
function AIInsightsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: insights, isLoading, error } = useReleaseAIInsightsInline(isOpen);

  if (!isOpen) return null;

  return (
    <div className={styles.aiPanel}>
      <div className={styles.aiPanelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} style={{ color: 'var(--rh-ai-primary)' }} />
          <div>
            <div style={{ fontFamily: 'var(--rh-font-heading)', fontSize: 16, fontWeight: 700 }}>AI Release Intelligence</div>
            <div style={{ fontSize: 11, color: 'var(--rh-text-tertiary)' }}>
              Powered by Gemini · Real-time analysis
            </div>
          </div>
        </div>
        <button onClick={onClose} className={styles.btnOutlineSm}>✕ Close</button>
      </div>
      <div className={styles.aiPanelBody}>
        {isLoading ? (
          <div className={styles.loadingCenter}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Analyzing releases with AI...</span>
          </div>
        ) : error ? (
          <div style={{ padding: 16, color: 'var(--rh-danger)', fontSize: 13 }}>
            Failed to load insights. {(error as Error).message}
          </div>
        ) : insights ? (
          <>
            {insights.action_required?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rh-danger)', marginBottom: 8 }}>
                  🔴 Action Required
                </div>
                {insights.action_required.map((item: any, i: number) => (
                  <div key={i} className={`${styles.aiInsightCard} ${styles.aiInsightCardCritical}`}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--rh-text-secondary)', marginBottom: 4 }}>{item.description}</div>
                    {item.recommendation && (
                      <div style={{ fontSize: 11, color: 'var(--rh-primary)', fontWeight: 500 }}>💡 {item.recommendation}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {insights.items_to_watch?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rh-warning)', marginBottom: 8 }}>
                  🟡 Items to Watch
                </div>
                {insights.items_to_watch.map((item: any, i: number) => (
                  <div key={i} className={`${styles.aiInsightCard} ${styles.aiInsightCardWarning}`}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--rh-text-secondary)' }}>{item.description}</div>
                  </div>
                ))}
              </div>
            )}
            {insights.positive_signals?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rh-success)', marginBottom: 8 }}>
                  🟢 Positive Signals
                </div>
                {insights.positive_signals.map((item: any, i: number) => (
                  <div key={i} className={`${styles.aiInsightCard} ${styles.aiInsightCardPositive}`}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--rh-text-secondary)' }}>{item.description}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
      <div className={styles.aiPanelFooter}>
        <span style={{ fontSize: 11, color: 'var(--rh-text-muted)' }}>
          Last updated {insights?.generated_at ? new Date(insights.generated_at).toLocaleTimeString() : '—'}
        </span>
      </div>
    </div>
  );
}

// ─── NEW RELEASE MODAL ────────────────────────────────────────
function NewReleaseModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', version: '', status: 'planned', start_date: '', target_date: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.target_date) {
      toast.error('Name and Target Date are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('releases').insert({
        name: form.name,
        version: form.version || 'v1.0',
        status: form.status as any,
        start_date: form.start_date || null,
        target_date: form.target_date,
        description: form.description || null,
        health_score: 85,
        progress: 0,
      } as any);
      if (error) throw new Error(error.message);
      toast.success('Release created');
      onCreated();
      onClose();
      setForm({ name: '', version: '', status: 'planned', start_date: '', target_date: '', description: '' });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>New Release</div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Name *</label>
          <input className={styles.formInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Security Patch" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Version</label>
          <input className={styles.formInput} value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="e.g. v2.1.0" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <select className={styles.formSelect} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="planned">Planned</option>
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="testing">Testing</option>
            <option value="uat">UAT</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label className={styles.formLabel}>Start Date</label>
            <input className={styles.formInput} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label className={styles.formLabel}>Target Date *</label>
            <input className={styles.formInput} type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea className={styles.formTextarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." rows={3} />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Plus size={14} /> Create Release</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AllReleasesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatusV2[]>([]);
  const [healthFilter, setHealthFilter] = useState<ReleaseHealthLevel[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const filters: ReleaseFiltersV2 = useMemo(() => ({
    search, status: statusFilter, health: healthFilter,
  }), [search, statusFilter, healthFilter]);

  const { data: releases = [], isLoading, isError, error, refetch } = useReleasesV2(filters);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`rh-live-${crypto.randomUUID().slice(0, 6)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['releases-v2'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Keyboard: ⌘K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('rh-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/releasehub/command-center?releaseId=${id}`);
  }, [navigate]);

  // Summary counts
  const summary = useMemo(() => {
    const total = releases.length;
    const critical = releases.filter(r => r.health_level === 'critical').length;
    const atRisk = releases.filter(r => r.health_level === 'at_risk').length;
    const healthy = releases.filter(r => r.health_level === 'healthy').length;
    const overdue = releases.filter(r => r.days_until_target < 0 && r.status !== 'released').length;
    return { total, critical, atRisk, healthy, overdue };
  }, [releases]);

  // Filter chips
  const statusOptions: { value: ReleaseStatusV2; label: string }[] = [
    { value: 'planned', label: 'Planned' },
    { value: 'development', label: 'Dev' },
    { value: 'staging', label: 'Staging' },
    { value: 'testing', label: 'Testing' },
    { value: 'uat', label: 'UAT' },
    { value: 'released', label: 'Released' },
  ];

  const toggleStatus = (s: ReleaseStatusV2) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className={styles.releaseHub}>
      {/* ═══ PAGE HEADER ═══ */}
      <header className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Package size={20} style={{ color: 'var(--rh-primary)' }} />
          <h1 className={styles.pageTitle}>All Releases</h1>
          <span className={styles.pageSubtitle}>{summary.total} releases</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.btnAI} onClick={() => setShowAI(true)}>
            <Sparkles size={14} /> AI Insights
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowNewModal(true)}>
            <Plus size={14} /> New Release
          </button>
        </div>
      </header>

      {/* ═══ SUMMARY STRIP ═══ */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryCount}>{summary.total}</span>
          <span className={styles.summaryLabel}>Total</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryCount} style={{ color: 'var(--rh-danger)' }}>{summary.critical}</span>
          <span className={styles.summaryLabel}>Critical</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryCount} style={{ color: 'var(--rh-warning)' }}>{summary.atRisk}</span>
          <span className={styles.summaryLabel}>At Risk</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryCount} style={{ color: 'var(--rh-success)' }}>{summary.healthy}</span>
          <span className={styles.summaryLabel}>Healthy</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryCount} style={{ color: summary.overdue > 0 ? 'var(--rh-danger)' : undefined }}>{summary.overdue}</span>
          <span className={styles.summaryLabel}>Overdue</span>
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} />
            <input
              id="rh-search"
              className={styles.searchInput}
              placeholder="Search releases... ⌘K"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search releases"
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
          {/* Status filters */}
          {statusOptions.map(s => (
            <button
              key={s.value}
              className={`${styles.filterChip} ${statusFilter.includes(s.value) ? styles.filterChipActive : ''}`}
              onClick={() => toggleStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.btnOutline} onClick={() => exportReleasesToCSV(releases)}>
            <Download size={14} /> Export
          </button>
          {/* View Switcher */}
          <div className={styles.viewSwitcher} role="tablist" aria-label="View mode">
            <button
              className={`${styles.viewSwitcherBtn} ${view === 'cards' ? styles.viewSwitcherBtnActive : ''}`}
              onClick={() => setView('cards')} role="tab" aria-selected={view === 'cards'}
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button
              className={`${styles.viewSwitcherBtn} ${view === 'timeline' ? styles.viewSwitcherBtnActive : ''}`}
              onClick={() => setView('timeline')} role="tab" aria-selected={view === 'timeline'}
            >
              <Clock size={14} /> Timeline
            </button>
            <button
              className={`${styles.viewSwitcherBtn} ${view === 'table' ? styles.viewSwitcherBtnActive : ''}`}
              onClick={() => setView('table')} role="tab" aria-selected={view === 'table'}
            >
              <Table2 size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingCenter}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            Loading releases...
          </div>
        ) : isError ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateTitle}>Error loading releases</div>
            <div className={styles.emptyStateDesc}>{(error as Error).message}</div>
            <button className={styles.btnOutline} onClick={() => refetch()} style={{ marginTop: 16 }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : releases.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={40} style={{ color: 'var(--rh-text-muted)', marginBottom: 12 }} />
            <div className={styles.emptyStateTitle}>No releases found</div>
            <div className={styles.emptyStateDesc}>
              {search || statusFilter.length > 0 ? 'Try adjusting your filters' : 'Create your first release to get started'}
            </div>
            {!search && statusFilter.length === 0 && (
              <button className={styles.btnPrimary} onClick={() => setShowNewModal(true)} style={{ marginTop: 16 }}>
                <Plus size={14} /> New Release
              </button>
            )}
          </div>
        ) : (
          <>
            {view === 'cards' && <CardsView releases={releases} onNavigate={handleNavigate} />}
            {view === 'table' && <TableView releases={releases} onNavigate={handleNavigate} />}
            {view === 'timeline' && <TimelineView releases={releases} onNavigate={handleNavigate} />}
          </>
        )}
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <div className={styles.statusBar}>
        <span className={styles.statusBarText}>
          {releases.length} of {summary.total} releases
        </span>
        <span className={styles.statusBarText}>
          {view.charAt(0).toUpperCase() + view.slice(1)} view
        </span>
      </div>

      {/* ═══ MODALS ═══ */}
      <NewReleaseModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} onCreated={() => queryClient.invalidateQueries({ queryKey: ['releases-v2'] })} />
      <AIInsightsPanel isOpen={showAI} onClose={() => setShowAI(false)} />
    </div>
  );
}
