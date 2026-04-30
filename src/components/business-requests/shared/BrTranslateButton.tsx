/**
 * BrTranslateButton — shared bidirectional Translate button for BR title
 * fields. Used by both the Create modal (`CreateBusinessRequestModal`)
 * and the View modal (`CatalystViewBusinessRequest.v2`).
 *
 * Calls the `ai-improve-story` Supabase edge function with
 * `improve_type: 'translate_text'` + a direction. The button is purely
 * presentational — the parent owns the source text and applies the
 * returned translation via its own state setter.
 *
 * Visual treatment: 32×40 button (matches Atlaskit Textfield height)
 * with a purple AI sparkle icon. Loading state swaps in @atlaskit/spinner.
 *
 * Original implementation lived inline in CreateBusinessRequestModal
 * (cycle pre-2026-04-29) — extracted here in cycle 2 of the producthub
 * view drawer migration.
 */
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';

export interface BrTranslateButtonProps {
  loading: boolean;
  label: string;
  onClick: () => void;
}

export function BrTranslateButton({ loading, label, onClick }: BrTranslateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={label}
      aria-label={label}
      style={{
        flexShrink: 0,
        width: 32,
        height: 40,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: token('color.background.neutral', '#F4F5F7'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 3,
        cursor: loading ? 'default' : 'pointer',
        color: token('color.text.subtle', '#44546F'),
        transition: 'background 120ms',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = token(
            'color.background.neutral.hovered',
            'rgba(9,30,66,0.06)',
          );
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = token('color.background.neutral', '#F4F5F7');
      }}
    >
      {loading ? (
        <Spinner size="small" />
      ) : (
        // Purple sparkle reserved for AI affordances per CLAUDE.md §8.
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9l-4 2.5 1.5-4L2 5h4.5L8 1z"
            fill="#7C3AED"
          />
        </svg>
      )}
    </button>
  );
}

export default BrTranslateButton;
