import type { GenerationSlotState } from '@/types/reqAssistV2';

const SLOT_LABELS = ['BRD', 'Epics', 'UAT', 'Wiki'] as const;

interface Props {
  slots: { brd: GenerationSlotState; epics: GenerationSlotState; uat: GenerationSlotState; wiki: GenerationSlotState };
  artifactCounts?: { brd: number; epics: number; uat: number; initiative: number };
  isProcessing?: boolean;
  etaMinutes?: number;
}

const SLOT_COLORS: Record<GenerationSlotState, string> = {
  done: 'var(--ra-slot-done)',
  processing: 'var(--ra-slot-processing)',
  pending: 'var(--ra-slot-pending)',
  error: '#FEE2E2',
};

export default function RAGenerationBar({ slots, artifactCounts, isProcessing, etaMinutes }: Props) {
  const slotValues: GenerationSlotState[] = [slots.brd, slots.epics, slots.uat, slots.wiki];

  /* EC-005: All pending → "not started" */
  const allPending = slotValues.every(s => s === 'pending');

  const summaryParts: string[] = [];
  if (artifactCounts) {
    if (artifactCounts.epics > 0) summaryParts.push(`E·${artifactCounts.epics}`);
    if (artifactCounts.uat > 0) summaryParts.push(`U·${artifactCounts.uat}`);
  }

  /* DA-005: Processing label in blue */
  const labelColor = isProcessing ? '#2563EB' : '#94A3B8';
  const labelText = isProcessing
    ? `~${etaMinutes ?? 4}m left`
    : allPending
      ? 'not started'
      : summaryParts.length > 0
        ? summaryParts.join(' ')
        : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} title={SLOT_LABELS.map((l, i) => `${l}: ${slotValues[i]}`).join(', ')}>
        {slotValues.map((state, i) => (
          <div
            key={i}
            style={{
              width: 'var(--ra-slot-w)', height: 'var(--ra-slot-h)',
              borderRadius: 'var(--ra-radius-lozenge)',
              backgroundColor: SLOT_COLORS[state],
              animation: state === 'processing' ? 'ra-pulse 1.5s ease-in-out infinite' : undefined,
            }}
            title={`${SLOT_LABELS[i]}: ${state}`}
          />
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: labelColor, whiteSpace: 'nowrap' }}>
        {labelText}
      </span>
    </div>
  );
}
