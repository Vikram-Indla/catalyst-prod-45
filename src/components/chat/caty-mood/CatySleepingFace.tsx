/**
 * CatySleepingFace — closed-eye Caty indicator when FAB is hidden.
 * Shows eyes + moustache in Caty brand gradient, distinct from awake state.
 */

interface CatySleepingFaceProps {
  size?: number;
}

export function CatySleepingFace({ size = 24 }: CatySleepingFaceProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Caty is sleeping"
    >
      <defs>
        {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
        <linearGradient id="caty-sleep-gradient" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          {/* ads-scanner:ignore-next-line */}
// TODO: ads-unmapped — #F79357 context unclear
          <stop stopColor="#F79357" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".5" stopColor="var(--ds-background-danger-bold, #C9372C)" />
          {/* ads-scanner:ignore-next-line */}
// TODO: ads-unmapped — #B41572 context unclear
          <stop offset=".78" stopColor="#B41572" />
          {/* ads-scanner:ignore-next-line */}
// TODO: ads-unmapped — #CC1E9A context unclear
          <stop offset="1" stopColor="#CC1E9A" />
        </linearGradient>
      </defs>

      {/* Outer circle background */}
      <circle cx="16" cy="16" r="15" fill="url(#caty-sleep-gradient)" opacity="0.95" />

      {/* Left closed eye (curved line) */}
      <g stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M 10 14 Q 12 16 14 14" />
      </g>

      {/* Right closed eye (curved line) */}
      <g stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M 18 14 Q 20 16 22 14" />
      </g>

      {/* Moustache — two curved strokes */}
      <g stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round">
        {/* Left side of moustache */}
        <path d="M 16 17 Q 13 18 10 17.5" />
        {/* Right side of moustache */}
        <path d="M 16 17 Q 19 18 22 17.5" />
      </g>

      {/* Tiny smile dot (optional warmth) */}
      <circle cx="16" cy="21" r="0.8" fill="white" opacity="0.7" />
    </svg>
  );
}
