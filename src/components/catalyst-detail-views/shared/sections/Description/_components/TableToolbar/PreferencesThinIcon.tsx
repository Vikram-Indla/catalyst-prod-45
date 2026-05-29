/**
 * PreferencesThinIcon — thin-stroke "two horizontal sliders" glyph for
 * the Table options toolbar button. Atlaskit's glyph/preferences is
 * intentionally chunky; this is the lighter equivalent matching the
 * weight of ChevronDownGlyph and the core icons we use elsewhere.
 */
export function PreferencesThinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ display: 'block' }}
    >
      {/* Top slider: line — knob — line */}
      <line
        x1="2"
        y1="5"
        x2="5.6"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="9.4"
        y1="5"
        x2="14"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle
        cx="7.5"
        cy="5"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      {/* Bottom slider: line — knob — line (knob in different position) */}
      <line
        x1="2"
        y1="11"
        x2="8.6"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="12.4"
        y1="11"
        x2="14"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle
        cx="10.5"
        cy="11"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}
