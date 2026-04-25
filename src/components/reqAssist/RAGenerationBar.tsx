import type { GenerationSlotState } from '@/types/reqAssistV2';

interface Props {
  slots: { brd: GenerationSlotState; epics: GenerationSlotState; uat: GenerationSlotState; wiki: GenerationSlotState };
  artifactCounts?: { brd: number; epics: number; uat: number; initiative: number };
  isProcessing?: boolean;
  etaMinutes?: number;
  docStatus?: string;
  epicCount?: number;
  pipelineStage?: string | null;
}

/* D08: Map status to progress percentage */
const STAGE_PROGRESS: Record<string, number> = {
  pending: 0,
  intake: 10,
  extract: 30,
  process: 50,
  validate: 70,
  distribute: 85,
  processing: 50,
  ready: 100,
  complete: 100,
  failed: 100,
};

export default function RAGenerationBar({ slots, artifactCounts, isProcessing, etaMinutes, docStatus, epicCount = 0, pipelineStage }: Props) {
  const ps = pipelineStage ?? docStatus ?? 'pending';

  // If epicCount > 0 → complete regardless of pipeline_stage
  const isComplete = epicCount > 0 || ps === 'ready' || ps === 'complete';
  const isFailed = ps === 'failed';
  const pct = epicCount > 0 ? 100 : (STAGE_PROGRESS[ps] ?? 0);

  const barColor = isComplete ? '#16A34A' : isFailed ? '#DC2626' : '#2563EB';

  let labelText = '';
  let labelColor = '#64748B';

  if (isProcessing) {
    labelText = `~${etaMinutes ?? 4}m left`;
    labelColor = '#2563EB';
  } else if (isComplete) {
    if (epicCount > 0) {
      labelText = 'Complete';
      labelColor = '#16A34A';
    } else {
      const parts: string[] = [];
      if (artifactCounts?.epics) parts.push(`E·${artifactCounts.epics}`);
      if (artifactCounts?.uat) parts.push(`U·${artifactCounts.uat}`);
      labelText = parts.length > 0 ? parts.join(' ') : 'Complete';
      labelColor = '#16A34A';
    }
  } else if (isFailed) {
    labelText = 'Failed';
    labelColor = '#DC2626';
  }
  // intake + epicCount=0 → empty bar, show em-dash

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 160 }}>
      {/* Progress bar — 80px fixed */}
      <div style={{ width: 80, height: 4, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: barColor, transition: 'width 300ms ease' }} />
      </div>
      {/* Label */}
      {labelText ? (
        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 11, color: labelColor, whiteSpace: 'nowrap' }}>
          {labelText}
        </span>
      ) : (
        <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>
      )}
    </div>
  );
}
