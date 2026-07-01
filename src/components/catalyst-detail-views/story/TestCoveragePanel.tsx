/**
 * TestCoveragePanel — Trace-From (test coverage) on the story detail view.
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001 (B4 traceability, consent gate G-002).
 *
 * Given a story's issue_key, surfaces:
 *   - coverage chip (Covered / Not covered)        - linked test cases + latest run status
 *   - linked defect count                          - governance note (story Done + failing test)
 * Trace-From chain: tm_requirement_links.external_key = issue_key → tm_test_cases → cycle_scope/defects.
 * Renders nothing for stories with no link AND no signal worth showing is suppressed — instead we always
 * show a compact "Not covered" state for Story items (uncovered IS a real, useful signal — not a default).
 * ADS tokens only; @atlaskit Lozenge owns its color.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import { supabase } from '@/integrations/supabase/client';

type CoverageMode = 'story' | 'defect' | 'incident';

interface TestCoveragePanelProps {
  issueKey: string;
  statusCategory?: string | null;
  /** Tunes labels + flags. 'incident' surfaces a regression-coverage gap (B5 G-M7). */
  mode?: CoverageMode;
}

interface LinkedCase {
  caseKey: string;
  title: string;
  runStatus: string; // worst observed: failed > blocked > in_progress > passed > not_run
}

interface CoverageData {
  covered: boolean;
  cases: LinkedCase[];
  defectCount: number;
}

const SEVERITY: Record<string, number> = { failed: 5, blocked: 4, in_progress: 3, passed: 2, not_run: 1, skipped: 0 };

function worst(a: string, b: string): string {
  return (SEVERITY[b] ?? 0) > (SEVERITY[a] ?? 0) ? b : a;
}

function runAppearance(s: string): ThemeAppearance {
  switch (s) {
    case 'passed': return 'success';
    case 'failed': return 'removed';
    case 'blocked': return 'moved';
    case 'in_progress': return 'inprogress';
    default: return 'default';
  }
}

function useStoryTestCoverage(issueKey: string) {
  return useQuery({
    queryKey: ['story-test-coverage', issueKey],
    enabled: !!issueKey,
    queryFn: async (): Promise<CoverageData> => {
      const { data: links } = await supabase
        .from('tm_requirement_links')
        .select('test_case_id')
        .eq('external_key', issueKey);
      const caseIds = Array.from(new Set((links ?? []).map((l: { test_case_id: string }) => l.test_case_id)));
      if (caseIds.length === 0) return { covered: false, cases: [], defectCount: 0 };

      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title')
        .in('id', caseIds);

      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id, current_status')
        .in('test_case_id', caseIds);
      const statusByCase = new Map<string, string>();
      for (const s of scope ?? []) {
        const row = s as { test_case_id: string; current_status: string };
        const prev = statusByCase.get(row.test_case_id) ?? 'not_run';
        statusByCase.set(row.test_case_id, worst(prev, row.current_status));
      }

      const defects = await supabase
        .from('tm_defects')
        .select('id', { count: 'exact', head: true })
        .in('source_test_case_id', caseIds);

      const linkedCases: LinkedCase[] = (cases ?? []).map((c: { id: string; case_key: string; title: string }) => ({
        caseKey: c.case_key,
        title: c.title,
        runStatus: statusByCase.get(c.id) ?? 'not_run',
      }));

      return { covered: true, cases: linkedCases, defectCount: defects.count ?? 0 };
    },
  });
}

export function TestCoveragePanel({ issueKey, statusCategory, mode = 'story' }: TestCoveragePanelProps) {
  const { data, isLoading } = useStoryTestCoverage(issueKey);
  const [expanded, setExpanded] = useState(true);

  const heading = mode === 'incident' ? 'Regression coverage' : 'Test cases';
  const noun = mode === 'incident' ? 'this incident' : mode === 'defect' ? 'this defect' : 'this story';

  if (isLoading) {
    return (
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)' }}>
        <Spinner size="small" /> <span style={{ fontSize: 'var(--ds-font-size-300)' }}>Loading {heading.toLowerCase()}…</span>
      </div>
    );
  }
  if (!data) return null;

  const hasFailing = data.cases.some((c) => c.runStatus === 'failed');
  const isMismatch = mode === 'story' && statusCategory === 'Done' && hasFailing;
  const isRegressionGap = mode === 'incident' && !data.covered;
  const count = data.cases.length;
  const bodyId = `test-cases-body-${issueKey}`;
  const onToggle = () => setExpanded((e) => !e);

  // Collapsible section header — mirrors LinkedWorkItemsHeader pattern:
  // chevron toggle button + Atlaskit Heading + count badge. Same chevron
  // icons, same vertical rhythm, same ADS Heading size="small" typography.
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '4px 0',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <Tooltip content={expanded ? 'Collapse' : 'Expand'} position="bottom">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={bodyId}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                marginLeft: -4,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--ds-text-subtle)',
                borderRadius: 3,
              }}
            >
              {expanded
                ? <ChevronDownIcon label="" color="var(--ds-text-subtle)" />
                : <ChevronRightIcon label="" color="var(--ds-text-subtle)" />
              }
            </button>
          </Tooltip>
          <h2
            onClick={onToggle}
            style={{ margin: 0, padding: '0 4px', fontSize: 16, fontWeight: 600, lineHeight: '20px', color: 'var(--ds-text)', cursor: 'pointer' }}
          >
            {heading}
          </h2>
          {count > 0 && (
            <span
              aria-label={`${count} test case${count === 1 ? '' : 's'}`}
              style={{
                display: 'inline',
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--ds-text-subtlest)',
                marginLeft: 4,
              }}
            >
              {count}
            </span>
          )}
        </div>
        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {data.covered
              ? <Lozenge appearance="success">Covered</Lozenge>
              : <Lozenge appearance="default">Not covered</Lozenge>}
            {data.defectCount > 0 && <Lozenge appearance="removed">{data.defectCount} defect{data.defectCount === 1 ? '' : 's'}</Lozenge>}
          </div>
        )}
      </div>

      {expanded && (
        <div id={bodyId}>
          {isMismatch && (
            <div style={{ background: 'var(--ds-background-danger)', border: '1px solid var(--ds-border-danger)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-100) var(--ds-space-150)', marginBottom: 'var(--ds-space-100)', color: 'var(--ds-text-danger)' }}>
              Governance flag — this story is marked Done but has a failing test.
            </div>
          )}

          {isRegressionGap && (
            <div style={{ background: 'var(--ds-background-warning)', border: '1px solid var(--ds-border-warning)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-100) var(--ds-space-150)', marginBottom: 'var(--ds-space-100)', color: 'var(--ds-text-warning)' }}>
              Coverage gap — no regression test is linked to this incident.
            </div>
          )}

          {!data.covered ? (
            <div style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)', marginLeft: 24 }}>
              No test case is linked to {noun}.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--ds-border)', borderRadius: 6, overflow: 'hidden' }}>
              {data.cases.map((c, i) => (
                <div
                  key={c.caseKey}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--ds-border)',
                    background: 'var(--ds-surface)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--ds-text)', minWidth: 84 }}>{c.caseKey}</span>
                  <span style={{ flex: 1, color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  <Lozenge appearance={runAppearance(c.runStatus)}>{c.runStatus.replace('_', ' ')}</Lozenge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
