import React, { useState } from 'react';
import Lozenge from '@atlaskit/lozenge';
import { SeededData } from './useSeededTestReportData';
import { passRate } from './reportCalculations';

interface Props {
  reportSlug: string;
  data: SeededData;
}

interface Insight {
  label: string;
  body: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}

function buildInsights(slug: string, data: SeededData): Insight[] {
  const totalRuns = data.runs.length;
  const passed = data.runs.filter(r => r.status === 'passed').length;
  const failed = data.runs.filter(r => r.status === 'failed').length;
  const blocked = data.runs.filter(r => r.status === 'blocked').length;
  const openCritical = data.defects.filter(d => d.severity === 'critical' && (d.status === 'open' || d.status === 'in_progress')).length;
  const rate = passRate(passed, totalRuns);
  const linkedCases = data.cases.filter(c => c.linkedFeature !== null).length;
  const coveragePct = Math.round((linkedCases / data.cases.length) * 100);

  const common: Insight[] = [
    {
      label: 'Quality Signal',
      body: rate >= 80
        ? `Pass rate ${rate}% is healthy. Maintain momentum into the release candidate.`
        : `Pass rate ${rate}% is below the 80% release threshold. ${failed} failures require attention before shipping.`,
      tone: rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger',
    },
    {
      label: 'Critical Defects',
      body: openCritical > 0
        ? `${openCritical} critical defect${openCritical > 1 ? 's' : ''} open. These are blocking release readiness.`
        : 'No open critical defects. Release risk from known defects is low.',
      tone: openCritical > 0 ? 'danger' : 'success',
    },
    {
      label: 'Blocked Tests',
      body: blocked > 0
        ? `${blocked} runs are blocked. Unblocking these unlocks up to ${Math.round((blocked / totalRuns) * 100)}% additional pass rate potential.`
        : 'No blocked tests. Execution pipeline is unobstructed.',
      tone: blocked > 5 ? 'warning' : 'neutral',
    },
    {
      label: 'Coverage Gap',
      body: `${coveragePct}% of test cases are linked to requirements. ${data.cases.length - linkedCases} cases have no traceability anchor — these cannot demonstrate requirement coverage in sign-off.`,
      tone: coveragePct >= 80 ? 'success' : coveragePct >= 50 ? 'warning' : 'danger',
    },
  ];

  const specific: Record<string, Insight[]> = {
    'execution-burndown': [
      { label: 'Burn Rate', body: 'Sprint 16 is on track with the ideal burndown line. At current velocity, all 48 in-scope cases will complete by end of sprint.', tone: 'success' },
    ],
    'defect-impact': [
      { label: 'High Impact', body: 'Payment double-charge (BUG-002) has impact score 8 and remains open. Recommend escalating to P0 before next sprint cut.', tone: 'danger' },
    ],
    'traceability-summary': [
      { label: 'Uncovered Features', body: 'Notifications feature (CAT-104) has 0 linked test cases. Any regression in this area will go undetected without manual testing.', tone: 'danger' },
    ],
    'case-usage': [
      { label: 'Stale Cases', body: '10 test cases have never been executed. Consider archiving or adding to next sprint scope.', tone: 'warning' },
      { label: 'Flaky Case', body: 'TC-007 (payment confirmation) alternates pass/fail across cycles — classic flakiness pattern. Investigate race condition before release.', tone: 'danger' },
    ],
    'multi-cycle-comparison': [
      { label: 'Trend', body: 'Pass rate improved 12% from Sprint 12 → Sprint 15. Sprint 16 is on track to reach 85%+ at completion.', tone: 'success' },
    ],
  };

  return [...common, ...(specific[slug] ?? [])];
}

const TONE_APPEARANCE: Record<string, 'success' | 'moved' | 'removed' | 'default'> = {
  success: 'success',
  warning: 'moved',
  danger: 'removed',
  neutral: 'default',
};

export default function ReportInsightPanel({ reportSlug, data }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const insights = buildInsights(reportSlug, data);

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--ds-surface)',
        borderLeft: '1px solid var(--ds-border)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '14px 16px 10px',
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          color: 'var(--ds-text-subtlest)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--ds-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>AI Insights</span>
        <span
          style={{
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 3,
            background: 'var(--ds-background-information)',
            color: 'var(--ds-text-information)',
            letterSpacing: '0.05em',
          }}
        >
          LAB — SEEDED
        </span>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map(ins => (
          <button
            key={ins.label}
            type="button"
            onClick={() => setExpanded(e => e === ins.label ? null : ins.label)}
            style={{
              textAlign: 'left',
              background: expanded === ins.label ? 'var(--ds-background-selected)' : 'var(--ds-surface-raised)',
              border: '1px solid var(--ds-border)',
              borderRadius: 6,
              padding: '10px 12px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded === ins.label ? 8 : 0 }}>
              <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text)' }}>{ins.label}</span>
              <Lozenge appearance={TONE_APPEARANCE[ins.tone]}>{ins.tone}</Lozenge>
            </div>
            {expanded === ins.label && (
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', lineHeight: 1.55 }}>
                {ins.body}
              </p>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 12px 16px', marginTop: 'auto' }}>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', lineHeight: 1.5, fontStyle: 'italic' }}>
          AI insights will use Gemini Gateway with real report metrics after lab approval. Currently showing seeded deterministic analysis.
        </p>
      </div>
    </div>
  );
}
