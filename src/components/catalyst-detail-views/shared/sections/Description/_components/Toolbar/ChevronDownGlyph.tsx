/**
 * ChevronDownGlyph — thin-stroke chevron used by InlineFormattingDropdown
 * and ListsDropdown. Centered in a 14×14 box with a 1.5px stroke so it
 * reads as "light weight" next to the heavier Atlaskit glyph icons.
 *
 * Atlaskit's @atlaskit/icon/glyph/chevron-down is a filled, chunky shape;
 * neither it nor any `core` variant offers a stroke-weight prop. A small
 * custom SVG is the cleanest way to control the visual weight.
 */
export function ChevronDownGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path
        d="M3.5 5.25 L7 9 L10.5 5.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
