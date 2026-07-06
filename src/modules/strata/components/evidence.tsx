/**
 * STRATA evidence primitives — executive-readable rendering of calc-engine
 * provenance (blueprint §19). Relocated verbatim from shared.tsx when the
 * evidence drawer became a full page (StrataEvidencePage). Display-only:
 * values render exactly as the calc engine recorded them, unknowns → '—'.
 */
import React from 'react';
import { T, StrataBandLozenge } from './shared';
import { fmtScore, labelize } from './format';

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const shortId = (v: string) => `${v.slice(0, 8)}…`;

/** Executive-readable rendering of calc inputs: perspective rollups become rows,
 *  flat objects become key/value lines; unknown shapes fall back to JSON. */
export function EvidenceInputs({ inputs }: { inputs: Record<string, unknown> | null | undefined }) {
  if (!inputs) return <>—</>;
  const perspectives = (inputs as { perspectives?: unknown }).perspectives;
  if (Array.isArray(perspectives)) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {perspectives.map((p, i) => {
          const row = p as { name?: string; score?: number; weight?: number; has_data?: boolean; status_key?: string | null };
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ minWidth: 96 }}>{row.name ?? '—'}</span>
              <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{row.has_data === false ? '—' : fmtScore(row.score)}</strong>
              <span style={{ color: T.subtlest }}>w {row.weight ?? '—'}</span>
              <StrataBandLozenge bandKey={row.status_key} />
            </span>
          );
        })}
      </span>
    );
  }
  // Flatten one level of nesting (e.g. line inputs = {ref_type, weight, detail:{actual, target, …}})
  const flat: Array<[string, unknown]> = [];
  Object.entries(inputs).forEach(([k, v]) => {
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.entries(v as Record<string, unknown>).forEach(([ck, cv]) => flat.push([ck, cv]));
    } else {
      flat.push([k, v]);
    }
  });
  if (flat.length > 0 && flat.every(([, v]) => v == null || ['string', 'number', 'boolean'].includes(typeof v))) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {flat.map(([k, v], i) => (
          <span key={`${k}-${i}`}>
            <span style={{ color: T.subtlest }}>{labelize(k)}: </span>
            {v == null ? '—' : isUuid(v) ? shortId(v) : String(v)}
          </span>
        ))}
      </span>
    );
  }
  return <>{JSON.stringify(inputs)}</>;
}

export function EvidenceConfigContext({ ctx }: { ctx: Record<string, unknown> | null | undefined }) {
  if (!ctx) return <>—</>;
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Object.entries(ctx).map(([k, v]) => (
        <span key={k}>
          <span style={{ color: T.subtlest }}>{labelize(k)}: </span>
          {v == null ? '—' : isUuid(v) ? shortId(v) : typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </span>
      ))}
    </span>
  );
}

export function EvidenceRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>{k}</span>
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}
