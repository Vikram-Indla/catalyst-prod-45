/**
 * EmptyState — Catalyst wrapper over @atlaskit/empty-state.
 *
 * Use for first-run / no-results / zero-state views. For error states with
 * a retry, use SectionMessage appearance="error".
 *
 * Size variants
 * ─────────────
 * Atlaskit's default EmptyState header is Heading size="large" (20/600) —
 * calibrated for full-page zero states ("You have no projects yet" as the
 * main surface content). Dropped into a 280px-wide widget body, it
 * dominates the surrounding page chrome (page h1 20/600, widget title
 * 14/700 uppercase). This wrapper adds a `size="compact"` variant that
 * renders a custom inline block at 15/600 header + 13 description — an
 * order-of-magnitude quieter treatment that nests correctly inside a
 * widget, card, dropdown, or panel.
 *
 *   size="default"   → AK EmptyState, AK Heading large   → full-page use
 *   size="compact"   → custom inline block, 15/600        → widget-nested use
 *
 * Why a custom block for compact instead of a prop on AK EmptyState:
 * @atlaskit/empty-state has no size knob; the header is always AK Heading
 * large. Wrapping with a CSS override fights Atlaskit's internal <Box>
 * padding. A custom block is ~10 lines, tokenised, and doesn't drift.
 */
import AkEmptyState from '@atlaskit/empty-state';
import { token } from '@atlaskit/tokens';
import { type ReactNode } from 'react';

export interface EmptyStateProps {
  header?: ReactNode;
  description?: ReactNode;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  maxImageWidth?: number;
  testId?: string;
  /**
   * Visual size.
   * - `default` (Atlaskit's 24/600 header) for full-page zero states.
   * - `compact` (15/600 header) for widget-nested / dropdown / card use.
   *   Compact never renders the image slot — it's designed for confined
   *   containers where an illustration would dominate.
   *
   * Defaults to `default` for backward compatibility with existing callers.
   */
  size?: 'default' | 'compact';
}

export function EmptyState({
  header,
  description,
  imageUrl,
  imageWidth,
  imageHeight,
  primaryAction,
  secondaryAction,
  maxImageWidth,
  testId,
  size = 'default',
}: EmptyStateProps) {
  if (size === 'compact') {
    /**
     * Compact — widget / panel / card use.
     *
     * Typography (measured against CLAUDE.md §4 V12 Hybrid Precision)
     *   header:       15 / 600 / color.text       — one step below page h1 (20/600)
     *   description:  13 / 400 / color.text.subtle — body small
     *   gap:          4px between header + description
     *   padding:      24px 16px — centred vertically, breathes inside a 200px widget body
     *
     * Semantic choice: the header renders as a plain <div> with
     * `role="heading" aria-level={4}` rather than an actual <h2>. This
     * preserves the document outline — page h1 → widget h3 → empty-state
     * h4 — without Atlaskit's default <h2> jumping over the widget title.
     */
    return (
      <div
        data-testid={testId}
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {header != null && (
          <div
            role="heading"
            aria-level={4}
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: token('color.text'),
              letterSpacing: '-0.002em',
            }}
          >
            {header}
          </div>
        )}
        {description != null && (
          <div
            style={{
              fontSize: 13,
              color: token('color.text.subtle'),
              maxWidth: 320,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}
        {(primaryAction || secondaryAction) && (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
    );
  }

  // Default — full-page zero state. Pass through to Atlaskit.
  return (
    <AkEmptyState
      header={header as string}
      description={description}
      imageUrl={imageUrl}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      maxImageWidth={maxImageWidth}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      testId={testId}
    />
  );
}
