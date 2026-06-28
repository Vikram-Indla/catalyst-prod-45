import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { CatyInsightCard } from './CatyInsightCard';
import Spinner from '@atlaskit/spinner';

interface RiskItem {
  issueKey: string;
  summary: string;
  issueType: string;
  reporter: string;
  project: string;
  daysSinceUpdate: number;
}

interface ColumnRisk {
  column: string;
  count: number;
  avgDaysSinceUpdate: number;
  topBlocker: RiskItem | null;
  action: string;
}

interface BoardInsightData {
  summary: string;
  totalItems: number;
  columns: ColumnRisk[];
}

/** Cached AI output shape (stored in board_insight_cache.insight). */
interface CachedInsight {
  summary?: string;
  columns?: Array<{ column: string; action?: string }>;
}

/**
 * Structural fingerprint of the analyzed open items. Hashes only
 * (issue_key, status, jira_updated_at) — NOT time-derived "days since update"
 * — so the hash stays stable across days and only changes when the board
 * actually changes (item added/removed/moved column/updated).
 */
async function hashBoardState(
  openItems: Array<{ issue_key: string; status: string | null; jira_updated_at: string | null }>,
): Promise<string> {
  const sig = openItems
    .map((r) => `${r.issue_key}|${r.status ?? ''}|${r.jira_updated_at ?? ''}`)
    .sort()
    .join('\n');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sig));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface CatyBoardInsightProps {
  resourceId?: string | null;
  projectKey?: string | null;
  /* 2026-06-15: when provided, the result panel is portaled to this DOM
     element instead of replacing the trigger button inline. Use this when
     the trigger needs to stay in a constrained slot (e.g. a fixed-height
     toolbar) but the expanded result needs full-width room elsewhere on
     the page. The trigger button always renders at the component's own
     mount point. */
  panelPortalTarget?: HTMLElement | null;
}

export function CatyBoardInsight({ resourceId, projectKey, panelPortalTarget }: CatyBoardInsightProps) {
  const { user } = useAuth();
  const [insight, setInsight] = useState<BoardInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsight = useCallback(async (opts?: { force?: boolean }) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles').select('jira_account_id').eq('id', user.id).single();
      const jiraAccountId = profile?.jira_account_id;
      if (!jiraAccountId) { setInsight({ summary: 'Could not resolve your Jira account.', totalItems: 0, columns: [] }); return; }

      let query = supabase
        .from('ph_issues')
        .select('status, status_category, jira_updated_at, summary, issue_key, issue_type, reporter_display_name, project_key')
        .eq('assignee_account_id', jiraAccountId)
        
        .is('archived_at', null)
        .order('jira_updated_at', { ascending: true })
        .limit(200);

      if (projectKey) {
        query = query.eq('project_key', projectKey);
      }

      const { data: items, error: qErr } = await query;

      const DONE_STATUSES = new Set(['done', 'resolved', 'closed', 'complete', 'completed', 'released', 'verified', 'approved', 'ready for production', 'production ready', 'beta ready', 'monitor']);
      const openItems = (items ?? []).filter(r => {
        const sc = (r.status_category || '').toLowerCase().replace(/[\s_-]/g, '');
        const st = (r.status || '').toLowerCase().trim();
        if (sc === 'done' || sc === 'complete' || sc === 'resolved' || sc === 'closed') return false;
        if (DONE_STATUSES.has(st)) return false;
        return true;
      });

      if (qErr || openItems.length === 0) {
        setInsight({ summary: 'No open items found to analyze.', totalItems: 0, columns: [] });
        return;
      }

      const now = Date.now();
      const colMap: Record<string, { count: number; totalDays: number; items: typeof openItems }> = {};
      for (const r of openItems) {
        const col = r.status || 'Unknown';
        if (!colMap[col]) colMap[col] = { count: 0, totalDays: 0, items: [] };
        colMap[col].count++;
        const days = r.jira_updated_at ? Math.floor((now - new Date(r.jira_updated_at).getTime()) / 86_400_000) : 0;
        colMap[col].totalDays += days;
        colMap[col].items.push(r);
      }

      const columnStats: ColumnRisk[] = Object.entries(colMap)
        .map(([col, v]) => {
          const avg = Math.round(v.totalDays / v.count);
          const stalest = v.items[0];
          const stalestDays = stalest?.jira_updated_at ? Math.floor((now - new Date(stalest.jira_updated_at).getTime()) / 86_400_000) : 0;
          return {
            column: col, count: v.count, avgDaysSinceUpdate: avg,
            topBlocker: stalest ? {
              issueKey: stalest.issue_key, summary: stalest.summary,
              issueType: stalest.issue_type || 'Story',
              reporter: stalest.reporter_display_name || 'Unknown',
              project: stalest.project_key || '', daysSinceUpdate: stalestDays,
            } : null,
            action: '',
          };
        })
        .sort((a, b) => (b.count * b.avgDaysSinceUpdate) - (a.count * a.avgDaysSinceUpdate))
        .slice(0, 5);

      // Per-user cache keyed on the structural board state. On a hit we serve
      // the AI text instantly and skip the ai-digest call entirely. The counts/
      // days/blockers above are always recomputed fresh, so only the AI-generated
      // summary + per-column actions come from cache.
      const projectScope = projectKey || 'all';
      const dataHash = await hashBoardState(openItems);
      const fallbackSummary = `${openItems.length} open items across ${columnStats.length} active columns.`;

      if (!opts?.force) {
        const { data: cachedRow } = await supabase
          .from('board_insight_cache')
          .select('insight')
          .eq('user_id', user.id)
          .eq('project_scope', projectScope)
          .eq('data_hash', dataHash)
          .maybeSingle();
        const cached = (cachedRow as { insight?: CachedInsight } | null)?.insight;
        if (cached) {
          for (const ac of cached.columns ?? []) {
            const match = columnStats.find(c => c.column === ac.column);
            if (match && ac.action) match.action = ac.action;
          }
          setInsight({ summary: cached.summary || fallbackSummary, totalItems: openItems.length, columns: columnStats });
          return;
        }
      }

      const context = JSON.stringify({
        totalItems: openItems.length,
        projectScope: projectKey || 'all assigned',
        columns: columnStats.map(c => ({
          column: c.column, count: c.count, avgDays: c.avgDaysSinceUpdate,
          topBlocker: c.topBlocker ? { key: c.topBlocker.issueKey, summary: c.topBlocker.summary, reporter: c.topBlocker.reporter, project: c.topBlocker.project, daysSinceUpdate: c.topBlocker.daysSinceUpdate } : null,
        })),
      });

      const { data, error } = await supabase.functions.invoke('ai-digest', {
        body: { mode: 'board-insight', context },
      });

      if (!error && data?.insight?.columns) {
        const aiCols = data.insight.columns as Array<{ column: string; action?: string }>;
        for (const ac of aiCols) {
          const match = columnStats.find(c => c.column === ac.column);
          if (match && ac.action) match.action = ac.action;
        }
      }

      const summary = data?.insight?.summary || fallbackSummary;

      // Store only the AI output, keyed by the structural hash. Bypass on AI
      // error so a failed call never poisons the cache.
      if (!error) {
        await supabase.from('board_insight_cache').upsert(
          {
            user_id: user.id,
            project_scope: projectScope,
            data_hash: dataHash,
            insight: { summary, columns: columnStats.map(c => ({ column: c.column, action: c.action })) },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,project_scope,data_hash' },
        );
      }

      setInsight({
        summary,
        totalItems: openItems.length,
        columns: columnStats,
      });
    } catch {
      setInsight({ summary: 'Board analysis could not be completed.', totalItems: 0, columns: [] });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, projectKey]);

  if (!resourceId && !projectKey) return null;

  /* 2026-06-15: split render. The trigger button always renders at the
     component's mount point. The result panel either replaces the button
     inline (legacy callers) or portals to `panelPortalTarget` when
     provided (kanban board: button in toolbar, panel below toolbar at
     full width). */
  /* De-catted 2026-06-17: Board health is analytics, not conversational AI.
     The Caty cat is reserved for the Ask Caty search affordance so the two no
     longer compete. Pulse glyph in ADS magenta (Caty-family pink, token-clean)
     as a subtle AI tie-in; ADS spinner while loading. */
  const button = (
    <button
      type="button"
      onClick={() => generateInsight()}
      disabled={isLoading}
      aria-busy={isLoading || undefined}
      aria-label={isLoading ? 'Generating board health…' : 'Board health'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 16px',
        border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        borderRadius: 999,
        background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
        color: token('color.text', 'var(--ds-text, #172B4D)'),
        fontSize: 13,
        fontWeight: 500,
        cursor: isLoading ? 'default' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      {isLoading ? (
        <Spinner size="small" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
// TODO: ads-unmapped — #CD519D context unclear
          <path d="M1 8h3l2-5 3 10 2-5h4" stroke={token('color.icon.accent.magenta', '#CD519D')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {/* In-progress affordance — "Thinking…" label while the digest generates
          (mirrors the CatyButton loading state that was lost when Board health
          was de-catted). */}
      {isLoading ? 'Thinking…' : 'Board health'}
    </button>
  );

  const panel = !insight ? null : insight.totalItems === 0 ? (
    <CatyInsightCard title="Board health" onDismiss={() => setInsight(null)}>
      <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>{insight.summary}</span>
    </CatyInsightCard>
  ) : (
    <CatyInsightCard title="Board health" onRefresh={() => generateInsight({ force: true })} onDismiss={() => setInsight(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
              {insight.summary}
            </p>

            {insight.columns.map((col) => (
              <div key={col.column} style={{
                padding: '8px 12px', borderRadius: 4,
                background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken, #F7F8F9)'),
              }}>
                {/* Column header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: col.topBlocker ? 4 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ font: `600 13px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
                      {col.column}
                    </span>
                    <span style={{ font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                      {col.count} {col.count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <span style={{
                    font: `600 12px/16px var(--ds-font-family-body, "Atlassian Sans")`,
                    color: col.avgDaysSinceUpdate > 30
                      ? token('color.text.danger', 'var(--ds-text-danger, #AE2A19)')
                      : col.avgDaysSinceUpdate > 14
                        ? token('color.text.warning', 'var(--ds-text-warning, #974F0C)')
                        : token('color.text.subtle', 'var(--ds-icon, #44546F)'),
                  }}>
                    avg {col.avgDaysSinceUpdate} days since update
                  </span>
                </div>

                {/* Top blocker row */}
                {col.topBlocker && (
                  <div style={{ paddingBlockStart: 4 }}>
                    {/* Line 1: type icon + key + summary (clickable) */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => useGlobalSearchStore.getState().openDetail({ id: col.topBlocker!.issueKey })}
                    >
                      <JiraIssueTypeIcon type={col.topBlocker.issueType} size={14} />
                      <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', 'var(--ds-link, #0052CC)'), flexShrink: 0 }}>
                        {col.topBlocker.issueKey}
                      </span>
                      <span style={{ font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', 'var(--ds-text, #172B4D)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.topBlocker.summary}
                      </span>
                    </div>
                    {/* Line 2: project + reporter avatar + days */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInlineStart: 22, paddingBlockStart: 2 }}>
                      <span style={{ font: `500 11px/14px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                        {col.topBlocker.project}
                      </span>
                      <CatalystAvatar size="xsmall" src={resolveAvatarUrl(col.topBlocker.reporter) || undefined} name={col.topBlocker.reporter} />
                      <span style={{ font: `400 11px/14px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                        {col.topBlocker.reporter}
                      </span>
                      <span style={{
                        font: `600 11px/14px var(--ds-font-family-body, "Atlassian Sans")`,
                        color: col.topBlocker.daysSinceUpdate > 60
                          ? token('color.text.danger', 'var(--ds-text-danger, #AE2A19)')
                          : col.topBlocker.daysSinceUpdate > 21
                            ? token('color.text.warning', 'var(--ds-text-warning, #974F0C)')
                            : token('color.text.subtle', 'var(--ds-icon, #44546F)'),
                      }}>
                        {col.topBlocker.daysSinceUpdate} days
                      </span>
                    </div>
                  </div>
                )}

                {/* AI action */}
                {col.action && (
                  <p style={{ margin: '4px 0 0', font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', 'var(--ds-icon, #44546F)') }}>
                    {col.action}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CatyInsightCard>
  );

  /* Portal mode: button at mount point, panel portaled to target. */
  if (panelPortalTarget) {
    return (
      <>
        {button}
        {panel && createPortal(panel, panelPortalTarget)}
      </>
    );
  }

  /* Legacy mode: panel replaces button inline (button OR panel, not both). */
  return insight ? panel : button;
}
