/**
 * TimeInStatusEtaStrip — predictive ETA inline strip on a live TIS cell.
 *
 * Phase 4 row 5 — Catalyst outlier #1 (no competitor renders an inline
 * forecast on the duration cell itself). Converts descriptive "12d spent"
 * into prescriptive "→ ETA Jun 12 · 71% · over P50".
 *
 * V1 mocked input: the widget computes (p50Hours, confidence) client-side
 * from a hardcoded cohort table. Row 9 (post-backfill) rewires this to a
 * react-query cohort-forecast hook backed by `tis-forecast-cohort` edge fn.
 *
 * Visual states:
 *   on_track   — current < p50      → blue, "→ ETA <date> · NN% · on track"
 *   over       — current >= p50     → red,  "→ ETA <date> · NN% · over P50"
 *   overdue    — current > 2 * p50  → red,  "→ overdue · stalled"
 *   no data    — p50Hours === null  → renders nothing (returns null)
 *
 * All colours via ADS tokens. Atlassian Sans 11/500 inline. Tabular nums for
 * the date + percentage. Stays under the cell's existing 35px row height —
 * adds ~14px below the duration text.
 */
import { token } from '@atlaskit/tokens';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface TimeInStatusEtaStripProps {
  /** Time already accumulated in this status, in ms. */
  currentMs: number;
  /** Cohort P50 (median) duration for this (issue_type, status, project), in hours. Null = no forecast data. */
  p50Hours: number | null;
  /** Forecast confidence 0..1. */
  confidence: number;
  /** Optional override for "today" — used by tests to deterministically check the ETA date. */
  now?: Date;
}

type EtaState = 'on_track' | 'over' | 'overdue';

function classify(currentMs: number, p50Hours: number): EtaState {
  const p50Ms = p50Hours * HOUR;
  if (currentMs > 2 * p50Ms) return 'overdue';
  if (currentMs >= p50Ms) return 'over';
  return 'on_track';
}

function formatEtaDate(d: Date): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function TimeInStatusEtaStrip({
  currentMs,
  p50Hours,
  confidence,
  now,
}: TimeInStatusEtaStripProps) {
  if (p50Hours === null) return null;

  const state = classify(currentMs, p50Hours);
  const baseDate = now ?? new Date();
  // ETA = today + max(0, p50Ms - currentMs). Overdue case shows "overdue"
  // string instead of a date.
  const remainingMs = Math.max(0, p50Hours * HOUR - currentMs);
  const etaDate = new Date(baseDate.getTime() + remainingMs);
  const confPct = Math.round(confidence * 100);

  const isOver = state === 'over' || state === 'overdue';
  const color = isOver
    ? 'var(--ds-text-accent-red, #AE2A19)'
    : 'var(--ds-text-subtle, #42526E)';

  const arrowColor = 'var(--ds-text-subtlest, #6B778C)';

  return (
    <div
      data-testid="tis-eta-strip"
      data-eta-state={state}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
        fontSize: 11,
        lineHeight: '14px',
        fontWeight: 500,
        fontFamily: 'Atlassian Sans, -apple-system, system-ui, sans-serif',
        color,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ color: arrowColor, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>→</span>
      {state === 'overdue' ? (
        <>
          <span style={{ fontWeight: 653 }}>overdue</span>
          <span>·</span>
          <span>stalled</span>
        </>
      ) : (
        <>
          <span>ETA</span>
          <span
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              color: token('color.text', '#172B4D'),
              fontWeight: isOver ? 653 : 500,
            }}
          >
            {formatEtaDate(etaDate)}
          </span>
          <span>·</span>
          <span>{confPct}%</span>
          <span>·</span>
          <span>{state === 'over' ? 'over P50' : 'on track'}</span>
        </>
      )}
    </div>
  );
}

export default TimeInStatusEtaStrip;
