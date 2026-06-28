import Tooltip from '@atlaskit/tooltip';
import CatalystAvatar, { type CatalystAvatarSize } from './CatalystAvatar';
import { PRESENCE_RING, PRESENCE_DASHED, PRESENCE_LABEL, type PresenceState } from '@/lib/presence';

// Avatar diameter in px — mirrors CatalystAvatar SIZE_PX
const SIZE_PX: Record<CatalystAvatarSize, number> = {
  xsmall: 16, small: 24, medium: 32, large: 40, xlarge: 96, xxlarge: 128,
};

interface Props {
  name?: string | null;
  src?: string | null;
  size?: CatalystAvatarSize;
  /** Presence state drives the ring. Omit / null → plain avatar, no ring. */
  state?: PresenceState | null;
  testId?: string;
  /** Override the default state-label tooltip. Use for "On leave · Back Jun 15" etc. */
  tooltip?: string;
}

/**
 * PresenceRing — CatalystAvatar with a coloured ring overlay.
 *
 * Ring spec (from prototypes/presence-availability.html, 2026-06-02):
 *   available  → solid 2px BLUE ring  (var(--ds-link), --ds-link)
 *   away       → hollow/dashed 2px BLUE ring (same colour, different treatment)
 *   busy       → solid 2px GREY ring  (var(--ds-text-subtlest), --ds-text-subtlest)
 *   offline    → solid 2px AMBER ring (var(--ds-background-warning-bold), --ds-icon-warning)
 *   on_leave   → solid 2px RED ring   (var(--ds-background-danger-bold), --ds-icon-danger)
 *
 * Ring rendering:
 *   Solid states → wrapper span has box-shadow:
 *     0 0 0 2px var(--ds-surface),     ← white gap
 *     0 0 0 4px <ringColor>                 ← coloured ring
 *   away (dashed) → inner box-shadow for white gap only +
 *     absolutely positioned span with border:2px dashed <ringColor>
 */
export function PresenceRing({ name, src, size = 'medium', state, testId, tooltip }: Props) {
  if (!state) {
    return <CatalystAvatar name={name} src={src} size={size} testId={testId} />;
  }

  const ringColor = PRESENCE_RING[state];
  const dashed    = PRESENCE_DASHED[state];
  const px        = SIZE_PX[size];

  // tooltip prop overrides the default state label (e.g. "On leave · Back Jun 15")
  const label = tooltip ?? PRESENCE_LABEL[state];

  if (dashed) {
    // Away: white-gap box-shadow on the wrapper + dashed border via child element
    return (
      <Tooltip content={label} position="top" tag="span">
        <span
          data-presence={state}
          aria-label={label}
          style={{
            position:    'relative',
            display:     'inline-flex',
            flexShrink:  0,
            borderRadius: '50%',
            boxShadow:   `0 0 0 2px var(--ds-surface)`,
          }}
        >
          <CatalystAvatar name={name} src={src} size={size} testId={testId} />
          <span
            aria-hidden="true"
            style={{
              position:     'absolute',
              inset:        -4,
              borderRadius: '50%',
              border:       `2px dashed ${ringColor}`,
              pointerEvents: 'none',
            }}
          />
        </span>
      </Tooltip>
    );
  }

  // Solid ring: double box-shadow (white gap + ring colour) on the wrapper
  return (
    <Tooltip content={label} position="top" tag="span">
      <span
        data-presence={state}
        aria-label={label}
        style={{
          position:     'relative',
          display:      'inline-flex',
          flexShrink:   0,
          borderRadius: '50%',
          // 2px white gap + 2px coloured ring
          boxShadow:    `0 0 0 2px var(--ds-surface), 0 0 0 4px ${ringColor}`,
          // Extra margin so the ring doesn't clip the avatar group layout
          margin:       2,
        }}
      >
        <CatalystAvatar name={name} src={src} size={size} testId={testId} />
      </span>
    </Tooltip>
  );
}
