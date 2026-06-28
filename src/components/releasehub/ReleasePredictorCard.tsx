/**
 * ReleasePredictorCard — date-based completion forecast for a release or sprint.
 * No story points: each work item counts equally, weighted only by status stage,
 * tested against per-item due dates and the subject start→due window.
 * The percentages and dates are deterministic (from the edge function); the
 * CatyPulseIcon narrative only explains them. Renders honest empty states when
 * the subject has no linked items or no due dates.
 */
import React from 'react';
import Spinner from '@atlaskit/spinner';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { RH } from '@/constants/releasehub.design';
import { useRunPredictor, type Prediction, type PredictionRisk } from '@/hooks/useReleaseHub';

const T = {
  surface: 'var(--ds-surface)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  danger: 'var(--ds-text-danger)',
  warn: 'var(--ds-text-warning)',
  success: 'var(--ds-text-success)',
  info: 'var(--ds-text-information)',
  infoBold: 'var(--ds-background-information-bold)',
  successBold: 'var(--ds-background-success-bold)',
};

const RISK: Record<PredictionRisk, { label: string; fg: string; accent: string }> = {
  on_track: { label: 'On track', fg: T.success, accent: 'var(--ds-border-success)' },
  at_risk: { label: 'At risk', fg: T.warn, accent: 'var(--ds-border-warning)' },
  off_track: { label: 'Off track', fg: T.danger, accent: 'var(--ds-border-danger)' },
  done: { label: 'Complete', fg: T.success, accent: 'var(--ds-border-success)' },
  no_data: { label: 'No data', fg: T.subtlest, accent: T.border },
};

function stageColor(weight: number): string {
  if (weight >= 1) return T.successBold;
  if (weight >= 0.65) return T.infoBold;
  if (weight >= 0.35) return 'var(--ds-background-information-bold)';
  if (weight > 0) return 'var(--ds-background-information)';
  return T.border;
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Metric({ label, value, fg, accent }: { label: string; value: string; fg?: string; accent?: string }) {
  return (
    <div style={{ background: T.sunken, borderRadius: 6, padding: '8px 12px', borderLeft: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{label}</div>
      <div style={{ fontFamily: RH.fontDisplay, fontSize: value.length > 4 ? 16 : 22, fontWeight: 600, color: fg ?? T.text, lineHeight: '1.6' }}>{value}</div>
    </div>
  );
}

export function ReleasePredictorCard({
  kind, id, label, prediction,
}: {
  kind: 'release' | 'sprint';
  id: string;
  label: string;
  prediction: Prediction | null;
}) {
  const run = useRunPredictor();
  const p = run.data ?? prediction;
  const risk = RISK[p?.risk ?? 'no_data'];
  const total = p?.statusSpread.reduce((s, x) => s + x.count, 0) || 0;

  return (
    <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `0.5px solid ${T.border}` }}>
        <CatyPulseIcon size={16} />
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>
          {kind === 'release' ? 'Release' : 'Sprint'} predictor
        </span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {label}</span>
        <button
          onClick={() => run.mutate({ kind, id })}
          disabled={run.isPending}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, cursor: run.isPending ? 'default' : 'pointer' }}
        >
          {run.isPending ? <Spinner size="small" /> : <CatyPulseIcon size={14} />}
          {p ? 'Re-run' : 'Run predictor'}
        </button>
      </div>

      {!p && (
        <div style={{ padding: 24, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>
          {run.isError ? <span style={{ color: T.danger }}>Could not run the predictor. Try again.</span>
            : 'Run the predictor to forecast completion from work-item dates.'}
        </div>
      )}

      {p && p.risk === 'no_data' && (
        <div style={{ padding: 16, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>
          <div style={{ fontWeight: 600, color: T.text, marginBottom: 4 }}>Not enough data to forecast</div>
          {p.narrative}
        </div>
      )}

      {p && p.risk !== 'no_data' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 16 }}>
            <Metric label="Predicted" value={p.predictedPct != null ? `${p.predictedPct}%` : '—'} />
            <Metric label="Forecast" value={fmtDate(p.forecastDate)} />
            <Metric label="Due" value={fmtDate(p.dueDate)} />
            <Metric label="Risk" value={risk.label} fg={risk.fg} accent={risk.accent} />
          </div>

          {p.timeUsedPct != null && p.predictedPct != null && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, marginBottom: 4 }}>
                <span>Time used <b style={{ color: T.text }}>{p.timeUsedPct}%</b></span>
                <span>Work done <b style={{ color: T.text }}>{p.predictedPct}%</b></span>
              </div>
              <div style={{ position: 'relative', height: 8, borderRadius: 4, background: T.border, overflow: 'hidden' }}>
                <div style={{ height: 8, width: `${p.predictedPct}%`, background: T.infoBold }} />
              </div>
              <div style={{ position: 'relative', height: 12 }}>
                <div style={{ position: 'absolute', left: `${p.timeUsedPct}%`, top: -9, width: 1.5, height: 13, background: 'var(--ds-border-danger)' }} />
              </div>
            </div>
          )}

          {total > 0 && (
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, marginBottom: 4 }}>Status spread · by item count</div>
              <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden' }}>
                {p.statusSpread.map((s) => (
                  <div key={s.status} title={`${s.status}: ${s.count}`} style={{ width: `${(s.count / total) * 100}%`, background: stageColor(s.weight) }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
                {p.statusSpread.map((s) => (
                  <span key={s.status} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: stageColor(s.weight) }} />{s.status} {s.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, padding: '12px 16px', borderTop: `0.5px solid ${T.border}`, marginTop: 8 }}>
            <div>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>Need to hit due</div>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{p.requiredPace != null ? `${p.requiredPace} / day` : '—'}</div>
            </div>
            <div>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>Closing pace</div>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: p.observedPace != null && p.requiredPace != null && p.observedPace < p.requiredPace ? T.warn : T.text }}>{p.observedPace != null ? `${p.observedPace} / day` : '—'}</div>
            </div>
            <div>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>Overdue</div>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: p.itemOverdue > 0 ? T.danger : T.text }}>{p.itemOverdue} item{p.itemOverdue === 1 ? '' : 's'}</div>
            </div>
          </div>

          {p.reasons.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${T.border}` }}>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, marginBottom: 8 }}>What's still pending</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.reasons.map((r, i) => (
                  <div key={i} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text }}>
                    {r.label}{r.keys?.length ? <span style={{ color: T.subtle }}> — {r.keys.slice(0, 4).join(', ')}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.narrative && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `0.5px solid ${T.border}`, background: T.sunken }}>
              <CatyPulseIcon size={16} />
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, lineHeight: 1.55 }}>{p.narrative}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReleasePredictorCard;
