import React, { useCallback, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import { supabase } from '@/integrations/supabase/client';
import { CatyInsightCard } from './CatyInsightCard';
import { CatyRainbowCTA } from './CatyRainbowCTA';
import type { AgeingItem } from '@/hooks/useAgeingItems';

interface TriageResult {
  issueKey: string;
  summary: string;
  daysOpen: number;
  reason: string;
  suggestion: string;
}

interface CatyAgeingTriageProps {
  items: AgeingItem[];
  onOpenDetail?: (issueKey: string) => void;
}

function buildLocalTriage(items: AgeingItem[]): TriageResult[] {
  return [...items]
    .sort((a, b) => (b.days_open ?? 0) - (a.days_open ?? 0))
    .slice(0, 10)
    .map(i => {
      const noComments = (i.comment_count ?? 0) === 0;
      const inactive = i.assignee_is_inactive;
      const veryOld = (i.days_open ?? 0) > 90;
      let reason = '';
      let suggestion = '';
      if (inactive) {
        reason = `Assignee has been inactive for ${i.assignee_last_login_days ?? '?'} days.`;
        suggestion = 'Consider reassigning to an active team member.';
      } else if (noComments) {
        reason = `No comments on this item. It may be forgotten.`;
        suggestion = 'Add a comment to check progress or re-prioritize.';
      } else if (veryOld) {
        reason = `Open for ${i.days_open} days with no resolution.`;
        suggestion = 'Review scope — split into smaller deliverables or close if no longer relevant.';
      } else {
        reason = `Open for ${i.days_open} days. Last activity may be stale.`;
        suggestion = 'Check with the assignee for a status update.';
      }
      return { issueKey: i.issue_key, summary: i.summary, daysOpen: i.days_open ?? 0, reason, suggestion };
    });
}

export function CatyAgeingTriage({ items, onOpenDetail }: CatyAgeingTriageProps) {
  const [results, setResults] = useState<TriageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const runTriage = useCallback(async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    try {
      const top10 = [...items]
        .sort((a, b) => (b.days_open ?? 0) - (a.days_open ?? 0))
        .slice(0, 10);

      const context = JSON.stringify(top10.map(i => ({
        key: i.issue_key, summary: i.summary, daysOpen: i.days_open,
        status: i.status, commentCount: i.comment_count ?? 0,
        assigneeLastLoginDays: i.assignee_last_login_days,
        assigneeIsInactive: i.assignee_is_inactive,
      })));

      const { data, error } = await supabase.functions.invoke('ai-digest', {
        body: { mode: 'ageing-triage', context },
      });

      if (!error && data?.triageResults) {
        setResults(data.triageResults);
      } else {
        setResults(buildLocalTriage(items));
      }
    } catch {
      setResults(buildLocalTriage(items));
    } finally {
      setIsLoading(false);
    }
  }, [items]);
  if (items.length === 0) return null;

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (results.length === 0) {
    return <CatyRainbowCTA label="Triage stale" onClick={runTriage} isLoading={isLoading} />;
  }

  return (
    <CatyInsightCard title="Stale item triage" onRefresh={runTriage} onDismiss={() => { setResults([]); }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {results.map((r) => (
          <div key={r.issueKey} style={{ padding: 8, borderRadius: 4, background: token('color.background.neutral.subtle', '#F7F8F9') }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleExpand(r.issueKey)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, flexShrink: 0, minWidth: 56,
                  color: r.daysOpen > 90
                    ? token('color.text.danger', '#AE2A19')
                    : r.daysOpen > 60
                      ? token('color.text.warning', '#974F0C')
                      : token('color.text.subtle', '#44546F'),
                }}>
                  {r.daysOpen} days
                </span>
                <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{r.issueKey}</span>
                <span style={{ font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={token('color.text.subtle', '#44546F')} style={{ transform: expanded.has(r.issueKey) ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}><path d="M7 10l5 5 5-5z" /></svg>
            </div>
            {expanded.has(r.issueKey) && (
              <div style={{ paddingBlockStart: 8, paddingInlineStart: 4 }}>
                <p style={{ margin: '0 0 4px', font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F') }}>{r.reason}</p>
                <p style={{ margin: 0, font: `500 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{r.suggestion}</p>
                {onOpenDetail && <div style={{ paddingBlockStart: 8 }}><Button appearance="subtle" spacing="compact" onClick={() => onOpenDetail(r.issueKey)}>Open detail</Button></div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </CatyInsightCard>
  );
}
