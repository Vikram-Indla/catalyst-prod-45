import React, { useState, useEffect, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';

interface R360SummarizeDrawerProps {
  resourceId: string;
  onClose: () => void;
}

const CACHE_PREFIX = 'r360-summarize-cache-';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const STALE_THRESHOLD_DAYS = 14;
const DUE_SOON_DAYS = 7;
const HIGH_VELOCITY_THRESHOLD = 5;

const STATIC_RAINBOW =
  'conic-gradient(from 0deg, var(--ds-background-accent-magenta-bolder, #BE185D) 0deg, var(--ds-background-discovery-bold, #6E5DC6) 60deg, var(--ds-link, #0C66E4) 120deg, var(--ds-background-information-bold, #0C66E4) 180deg, var(--ds-background-success, #DFFCF0) 240deg, var(--ds-background-warning-bold, #E2B203) 300deg, var(--ds-background-accent-magenta-bolder, #BE185D) 360deg)';

interface ProjectSummary {
  projectKey: string;
  total: number;
  done: number;
  inProgress: number;
  toDo: number;
  keyItems: { key: string; title: string; status: string; statusCategory: string }[];
}

interface SummaryData {
  projects: ProjectSummary[];
  totalItems: number;
  staleCount: number;
  avgAge: number;
  recommendations: Recommendation[];
  generatedAt: string;
  contentHash: string;
  resourceName: string;
}

interface Recommendation {
  type: 'warning' | 'win' | 'suggestion';
  text: string;
}

async function computeHash(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function generateRecommendations(
  items: any[],
  projects: ProjectSummary[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  const staleItems = items.filter(
    (i) =>
      i.status_category !== 'done' &&
      i.updated_at &&
      daysBetween(i.updated_at) > STALE_THRESHOLD_DAYS,
  );
  if (staleItems.length > 0) {
    recs.push({
      type: 'warning',
      text: `${staleItems.length} item${staleItems.length > 1 ? 's' : ''} not updated in ${STALE_THRESHOLD_DAYS}+ days — may need attention`,
    });
  }

  const blockedItems = items.filter(
    (i) => i.status?.toLowerCase().includes('blocked') && i.status_category !== 'done',
  );
  if (blockedItems.length > 0) {
    recs.push({
      type: 'warning',
      text: `${blockedItems.length} blocked item${blockedItems.length > 1 ? 's' : ''} requiring unblock`,
    });
  }

  const dueSoon = items.filter((i) => {
    if (!i.due_date || i.status_category === 'done') return false;
    const days = daysBetween(i.due_date);
    return days >= -DUE_SOON_DAYS && days <= 0;
  });
  if (dueSoon.length > 0) {
    recs.push({
      type: 'suggestion',
      text: `${dueSoon.length} item${dueSoon.length > 1 ? 's' : ''} due within ${DUE_SOON_DAYS} days`,
    });
  }

  const totalDone = projects.reduce((s, p) => s + p.done, 0);
  if (totalDone >= HIGH_VELOCITY_THRESHOLD) {
    recs.push({
      type: 'win',
      text: `Strong velocity — ${totalDone} items completed`,
    });
  }

  const lowActivity = projects.filter((p) => p.done === 0 && p.total > 3);
  if (lowActivity.length > 0) {
    recs.push({
      type: 'suggestion',
      text: `${lowActivity.map((p) => p.projectKey).join(', ')} ha${lowActivity.length > 1 ? 've' : 's'} no completed items — review priorities`,
    });
  }

  return recs;
}

export default function R360SummarizeDrawer({ resourceId, onClose }: R360SummarizeDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setFromCache(false);

      try {
        const { data: resource, error: resErr } = await supabase
          .from('resource_inventory')
          .select('jira_account_id, name')
          .eq('id', resourceId)
          .single();

        if (resErr || !resource?.jira_account_id) {
          throw new Error('Could not find resource Jira account');
        }

        const { data: items, error: itemsErr } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category, project_key, issue_type, updated_at, due_date, created_at')
          .eq('assignee_account_id', resource.jira_account_id)
          .order('updated_at', { ascending: false })
          .limit(500);

        if (itemsErr) throw new Error('Failed to fetch work items');
        if (cancelled) return;

        const issueList = items || [];
        const hashInput = JSON.stringify(
          issueList.map((i) => i.issue_key + i.status_category).sort(),
        );
        const contentHash = await computeHash(hashInput);

        const cacheKey = CACHE_PREFIX + resourceId;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed: SummaryData = JSON.parse(cached);
            const age = Date.now() - new Date(parsed.generatedAt).getTime();
            if (parsed.contentHash === contentHash && age < CACHE_TTL_MS) {
              if (!cancelled) {
                setSummary(parsed);
                setFromCache(true);
                setLoading(false);
              }
              return;
            }
          } catch {
            // stale/corrupt cache — regenerate
          }
        }

        const projectMap = new Map<string, any[]>();
        for (const item of issueList) {
          const pk = item.project_key || 'Unknown';
          if (!projectMap.has(pk)) projectMap.set(pk, []);
          projectMap.get(pk)!.push(item);
        }

        const projects: ProjectSummary[] = Array.from(projectMap.entries())
          .map(([projectKey, pItems]) => {
            const done = pItems.filter((i) => i.status_category === 'done').length;
            const inProgress = pItems.filter((i) => i.status_category === 'indeterminate').length;
            const toDo = pItems.length - done - inProgress;
            const keyItems = pItems.slice(0, 3).map((i) => ({
              key: i.issue_key,
              title: i.summary || '',
              status: i.status || '',
              statusCategory: i.status_category || '',
            }));
            return { projectKey, total: pItems.length, done, inProgress, toDo, keyItems };
          })
          .sort((a, b) => b.total - a.total);

        const staleCount = issueList.filter(
          (i) =>
            i.status_category !== 'done' &&
            i.updated_at &&
            daysBetween(i.updated_at) > STALE_THRESHOLD_DAYS,
        ).length;

        const ages = issueList
          .filter((i) => i.created_at)
          .map((i) => daysBetween(i.created_at!));
        const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

        const recommendations = generateRecommendations(issueList, projects);

        const result: SummaryData = {
          projects,
          totalItems: issueList.length,
          staleCount,
          avgAge,
          recommendations,
          generatedAt: new Date().toISOString(),
          contentHash,
          resourceName: resource.name || 'Team member',
        };

        try {
          const { data: aiResult } = await supabase.functions.invoke('ai-digest', {
            body: { action: 'summarize', resource_id: resourceId, items: issueList },
          });
          if (aiResult?.recommendations && Array.isArray(aiResult.recommendations)) {
            result.recommendations = [
              ...aiResult.recommendations.map((r: string) => ({ type: 'suggestion' as const, text: r })),
              ...recommendations,
            ];
          }
        } catch {
          // AI unavailable — local recommendations already set
        }

        if (!cancelled) {
          localStorage.setItem(cacheKey, JSON.stringify(result));
          setSummary(result);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to generate summary');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [resourceId]);

  const generatedLabel = useMemo(() => {
    if (!summary) return '';
    const d = new Date(summary.generatedAt);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.round(diffMin / 60)}h ago`;
  }, [summary]);

  const REC_BORDER: Record<Recommendation['type'], string> = {
    warning: token('color.border.warning', 'var(--ds-background-warning-bold, #E2B203)'),
    win: token('color.border.success', 'var(--ds-background-success-bold, #1F845A)'),
    suggestion: token('color.border.information', 'var(--ds-background-information-bold, #0C66E4)'),
  };

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Spinner size="large" />
        <span style={{ fontSize: 14, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
          Generating summary...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: token('color.background.danger', 'var(--ds-background-danger, #FFECEB)'),
          color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
          fontSize: 14,
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
          ✦ Ask Caty — Summarize
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
            padding: 4,
            lineHeight: 1,
          }}
          aria-label="Close summary"
        >
          ✕
        </button>
      </div>

      {/* Rainbow accent */}
      <div style={{ height: 2, background: STATIC_RAINBOW, animation: 'none' }} />

      {/* Sub-header */}
      <div style={{ padding: '16px 24px 8px' }}>
        <div style={{ fontSize: 16, fontWeight: 653, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
          Work summary for {summary.resourceName}
        </div>
        <div style={{ fontSize: 12, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'), marginTop: 4 }}>
          Generated {generatedLabel} · Based on {summary.totalItems} items
          {fromCache && ' · Cached'}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>

        {/* Capacity snapshot */}
        <div style={{
          background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken, #F7F8F9)'),
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), marginBottom: 8 }}>
            Capacity snapshot
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
            <Stat label="Total" value={summary.totalItems} />
            <Stat label="Stale" value={summary.staleCount} />
            <Stat label="Avg age" value={`${summary.avgAge}d`} />
            <Stat label="Projects" value={summary.projects.length} />
          </div>
          {summary.totalItems > 0 && (
            <UtilizationBar projects={summary.projects} total={summary.totalItems} />
          )}
        </div>

        {/* Project cards */}
        {summary.projects.map((p) => (
          <ProjectCard key={p.projectKey} project={p} />
        ))}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)'), marginBottom: 8 }}>
              Recommendations
            </div>
            {summary.recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  borderLeft: `3px solid ${REC_BORDER[rec.type]}`,
                  padding: '8px 16px',
                  marginBottom: 8,
                  borderRadius: '0 4px 4px 0',
                  background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken, #F7F8F9)'),
                  fontSize: 13,
                  color: token('color.text', 'var(--ds-text, #172B4D)'),
                }}
              >
                {rec.text}
              </div>
            ))}
          </div>
        )}

        {/* Cache indicator */}
        <div style={{
          fontSize: 11,
          color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
          marginTop: 16,
          textAlign: 'center',
        }}>
          {fromCache ? 'Loaded from cache' : 'Freshly generated'} · Hash: {summary.contentHash.slice(0, 8)}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
        {label}
      </div>
    </div>
  );
}

function UtilizationBar({ projects, total }: { projects: ProjectSummary[]; total: number }) {
  const done = projects.reduce((s, p) => s + p.done, 0);
  const ip = projects.reduce((s, p) => s + p.inProgress, 0);
  const doneW = (done / total) * 100;
  const ipW = (ip / total) * 100;
  const todoW = 100 - doneW - ipW;

  return (
    <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden' }}>
      {doneW > 0 && <div style={{ width: `${doneW}%`, background: token('color.background.success.bold', 'var(--ds-background-success-bold, #1F845A)') }} />}
      {ipW > 0 && <div style={{ width: `${ipW}%`, background: token('color.background.information.bold', 'var(--ds-link, #0C66E4)') }} />}
      {todoW > 0 && <div style={{ width: `${todoW}%`, background: token('color.background.neutral', 'var(--ds-border, #DFE1E6)') }} />}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const doneW = project.total > 0 ? (project.done / project.total) * 100 : 0;
  const ipW = project.total > 0 ? (project.inProgress / project.total) * 100 : 0;
  const todoW = 100 - doneW - ipW;

  return (
    <div style={{
      border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
      borderRadius: 8,
      padding: 16,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
          {project.projectKey}
        </span>
        <span style={{ fontSize: 12, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
          {project.total} items
        </span>
      </div>

      {/* Status dots */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <StatusDot color={token('color.icon.success', 'var(--ds-background-success-bold, #1F845A)')} label="Done" count={project.done} />
        <StatusDot color={token('color.icon.information', 'var(--ds-link, #0C66E4)')} label="In progress" count={project.inProgress} />
        <StatusDot color={token('color.icon.subtle', 'var(--ds-text-subtlest, #6B778C)')} label="To do" count={project.toDo} />
      </div>

      {/* Completion bar */}
      <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        {doneW > 0 && <div style={{ width: `${doneW}%`, background: token('color.background.success.bold', 'var(--ds-background-success-bold, #1F845A)') }} />}
        {ipW > 0 && <div style={{ width: `${ipW}%`, background: token('color.background.information.bold', 'var(--ds-link, #0C66E4)') }} />}
        {todoW > 0 && <div style={{ width: `${todoW}%`, background: token('color.background.neutral', 'var(--ds-border, #DFE1E6)') }} />}
      </div>

      {/* Key items */}
      {project.keyItems.map((item) => (
        <div
          key={item.key}
          style={{
            fontSize: 12,
            color: token('color.text', 'var(--ds-text, #172B4D)'),
            padding: '2px 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'), marginRight: 4 }}>·</span>
          <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), fontWeight: 500, marginRight: 4 }}>
            {item.key}
          </span>
          {item.title}
        </div>
      ))}
    </div>
  );
}

function StatusDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>
        {count} {label}
      </span>
    </div>
  );
}
