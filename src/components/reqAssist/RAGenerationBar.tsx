import type { GenerationSlotState } from '@/types/reqAssistV2';
import type { DocumentStatus } from '@/types/reqAssistV2';

interface Props {
  slots: { brd: GenerationSlotState; epics: GenerationSlotState; uat: GenerationSlotState; wiki: GenerationSlotState };
  artifactCounts?: { brd: number; epics: number; uat: number; initiative: number };
  isProcessing?: boolean;
  etaMinutes?: number;
  docStatus?: string;
}

/* D08: Map status to progress percentage */
const STATUS_PROGRESS: Record<string, number> = {
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

export default function RAGenerationBar({ slots, artifactCounts, isProcessing, etaMinutes, docStatus }: Props) {
  const slotValues: GenerationSlotState[] = [slots.brd, slots.epics, slots.uat, slots.wiki];
  const allPending = slotValues.every(s => s === 'pending');

  const summaryParts: string[] = [];
  if (artifactCounts) {
    if (artifactCounts.epics > 0) summaryParts.push(`E·${artifactCounts.epics}`);
    if (artifactCounts.uat > 0) summaryParts.push(`U·${artifactCounts.uat}`);
  }

  const status = docStatus ?? 'pending';
  const pct = STATUS_PROGRESS[status] ?? 0;
  const isComplete = status === 'ready' || status === 'complete';
  const isFailed = status === 'failed';

  /* D07: Replace "not started" with em-dash */
  const labelColor = isProcessing ? '#2563EB' : '#64748B';
  const labelText = isProcessing
    ? `~${etaMinutes ?? 4}m left`
    : isComplete
      ? (summaryParts.length > 0 ? summaryParts.join(' ') : 'Complete')
      : allPending
        ? ''
        : summaryParts.length > 0
          ? summaryParts.join(' ')
          : '';

  /* D08: Progress bar color */
  const barColor = isComplete ? '#16A34A' : isFailed ? '#DC2626' : '#2563EB';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 160 }}>
      {/* Progress bar — 80px fixed */}
      <div style={{ width: 80, height: 4, borderRadius: 2, background: '#E2E8F0', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: barColor, transition: 'width 300ms ease' }} />
      </div>
      {/* Label */}
      {labelText ? (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: labelColor, whiteSpace: 'nowrap' }}>
          {labelText}
        </span>
      ) : allPending ? (
        <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>
      ) : null}
    </div>
  );
}
