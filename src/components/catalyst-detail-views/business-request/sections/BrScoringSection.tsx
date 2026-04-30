/**
 * BrScoringSection — Business Request scoring rows (WSJF-ish components).
 *
 * Real implementation as of cycle 3. Renders four numeric InlineEdit
 * fields covering the BR scoring vocabulary on `business_requests`:
 *   - business_value      (0..10, integer suggested)
 *   - complexity_score    (0..10, integer suggested)
 *   - executive_urgency   (0..10, integer suggested)
 *   - business_score      (computed total — read-only typically, but
 *     editable here for manual override; cycle 4 may convert to
 *     read-only with a "Recompute" button)
 *
 * Saves via the parent's `onUpdate(field, value)` callback. Each cell is
 * a labelled InlineEdit + Textfield; non-numeric input is coerced to
 * `null` so the DB sees a clean update.
 *
 * 100% ADS — no shadcn, no lucide-react.
 */
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

interface ScoreField {
  key: keyof BusinessRequest;
  label: string;
}

const SCORE_FIELDS: ScoreField[] = [
  { key: 'business_value', label: 'Business value' },
  { key: 'complexity_score', label: 'Complexity' },
  { key: 'executive_urgency', label: 'Executive urgency' },
  { key: 'business_score', label: 'Score (total)' },
];

function parseScore(raw: string): number | null {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function BrScoringSection({ request, onUpdate }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-scoring"
      style={{ marginBottom: 20 }}
      aria-label="Scoring"
    >
      <div
        style={{
          fontSize: 11,
          color: token('color.text.subtle', '#6B6E76'),
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 8,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Scoring
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {SCORE_FIELDS.map((field) => {
          const value = (request[field.key] as number | null) ?? null;
          const display = value === null || value === undefined ? '—' : String(value);
          return (
            <div
              key={String(field.key)}
              data-cv-section={`br-scoring-${String(field.key)}`}
              style={{
                padding: 12,
                background: token('elevation.surface.sunken', '#F7F8F9'),
                borderRadius: 4,
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: token('color.text.subtle', '#6B6E76'),
                  fontWeight: 600,
                  marginBottom: 4,
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                {field.label}
              </div>
              <InlineEdit<string>
                label={field.label}
                hideActionButtons
                defaultValue={display === '—' ? '' : display}
                editView={({ errorMessage: _err, ...fieldProps }) => (
                  <Textfield
                    {...fieldProps}
                    autoFocus
                    type="number"
                    inputMode="numeric"
                  />
                )}
                readView={() => (
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: token('color.text', '#292A2E'),
                      fontFamily: 'var(--cp-font-body)',
                    }}
                  >
                    {display}
                  </div>
                )}
                onConfirm={(next) => {
                  const parsed = parseScore(String(next ?? ''));
                  if (parsed === value) return;
                  void onUpdate(String(field.key), parsed);
                }}
                keepEditViewOpenOnBlur={false}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BrScoringSection;
