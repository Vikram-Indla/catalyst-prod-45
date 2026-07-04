/**
 * ReportInsightCard — "Caty Insight" AI narrative for one report.
 * Feature: CAT-REPORTS-HUB-20260703-001 Phase 3 (Task A).
 *
 * Collapsed by default: a right-aligned canonical CatyIconCTA trigger.
 * On click → report-insights edge function with the report's live AGGREGATES
 * (counts only). Pending → spinner + "Caty is analyzing…". Result → markdown
 * (react-markdown — same renderer as Caty chat). Errors → SectionMessage.
 * 'ai-unavailable' → subtle SectionMessage. ADS tokens only.
 */
import ReactMarkdown from 'react-markdown';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';
import { useReportInsights } from './hooks/useReportInsights';

interface Props {
  reportId: string;
  reportLabel: string;
  projectName?: string | null;
  /** Aggregate metrics only (counts/rates). Null while the report has no data. */
  computed: Record<string, unknown> | null;
  dateRange?: string | null;
}

export function ReportInsightCard({ reportId, reportLabel, projectName, computed, dateRange }: Props) {
  const { generate, narrative, reason, isPending, error } = useReportInsights();

  const handleGenerate = () => {
    if (!computed) return;
    generate({
      report_id: reportId,
      report_label: reportLabel,
      project_name: projectName ?? null,
      computed,
      date_range: dateRange ?? null,
    });
  };

  return (
    <div style={{ margin: 'var(--ds-space-150) 0' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--ds-space-100)' }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', fontWeight: 600 }}>
          Caty Insight
        </span>
        <CatyIconCTA
          tooltip={`Ask Caty to analyze "${reportLabel}"`}
          onClick={handleGenerate}
          isLoading={isPending}
          disabled={!computed}
        />
      </div>

      {isPending && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)',
            color: 'var(--ds-text-subtle)', padding: 'var(--ds-space-150) 0',
          }}
        >
          <Spinner size="small" /> Caty is analyzing…
        </div>
      )}

      {!isPending && error != null && (
        <div style={{ marginTop: 'var(--ds-space-100)' }}>
          <SectionMessage appearance="error" title="Caty could not analyze this report">
            {error instanceof Error ? error.message : 'The insight service returned an error. Try again.'}
          </SectionMessage>
        </div>
      )}

      {!isPending && !error && reason === 'ai-unavailable' && (
        <div style={{ marginTop: 'var(--ds-space-100)' }}>
          <SectionMessage appearance="information">
            AI narration is not configured in this environment.
          </SectionMessage>
        </div>
      )}

      {!isPending && !error && narrative && (
        <div
          style={{
            marginTop: 'var(--ds-space-100)',
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-border-radius)',
            background: 'var(--ds-surface-raised)',
            padding: 'var(--ds-space-200)',
          }}
        >
          <div style={{ color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-200)', lineHeight: 1.5 }}>
            <ReactMarkdown>{narrative}</ReactMarkdown>
          </div>
          <div
            style={{
              marginTop: 'var(--ds-space-100)',
              fontSize: 'var(--ds-font-size-100)',
              color: 'var(--ds-text-subtlest)',
            }}
          >
            AI-generated from the report&apos;s live aggregates — verify before sharing.
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportInsightCard;
