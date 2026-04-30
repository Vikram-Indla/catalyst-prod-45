/**
 * BrScoringSection — Business Request scoring (priority tier + WSJF
 * components). Ports DetailTabScore (currently in
 * `src/components/producthub/timeline/`) to the canonical CatalystView
 * pattern as a single-scroll section, ADS-only.
 *
 * Cycle 1 stub. Cycle 2 will:
 *  - Render an Atlaskit table or stacked Stat tiles for the four score
 *    components (`business_value`, `complexity_score`, `executive_urgency`,
 *    `business_score`)
 *  - Add an Atlaskit InlineEdit per editable score field
 *  - Show the computed `rank` + `priority_tier` as Atlaskit Lozenges
 *  - Wire `is_force_ranked` + `rank_override_justification` editing
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrScoringSection({ request, onUpdate: _onUpdate }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-scoring"
      style={{ marginBottom: 16 }}
      aria-label="Scoring"
    >
      <div
        style={{
          fontSize: 11,
          color: '#6B6E76',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 4,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Scoring <span style={{ textTransform: 'none', color: '#8590A2' }}>(cycle 2 stub)</span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#42526E',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Business value: {request.business_value ?? '—'} · Complexity:{' '}
        {request.complexity_score ?? '—'} · Urgency:{' '}
        {request.executive_urgency ?? '—'} · Score: {request.business_score ?? '—'}
      </div>
    </section>
  );
}

export default BrScoringSection;
