/**
 * CatyHiddenEye — closed-eye icon when Caty FAB is hidden.
 * Minimal eye shape filled with Caty brand gradient.
 */

interface CatyHiddenEyeProps {
  size?: number;
}

export function CatyHiddenEye({ size = 24 }: CatyHiddenEyeProps) {
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
        <linearGradient id="caty-eye-gradient" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          {/* ads-scanner:ignore-next-line */}
          <stop stopColor="#F79357" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".5" stopColor="var(--ds-background-danger-bold)" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".78" stopColor="#B41572" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset="1" stopColor="#CC1E9A" />
        </linearGradient>
      </defs>

      {/* Closed eye shape — almond/leaf form */}
      <ellipse
        cx="16"
        cy="16"
        rx="12"
        ry="10"
        fill="url(#caty-eye-gradient)"
        opacity="0.95"
      />

      {/* Eyelash line top */}
      <path
        d="M 6 16 Q 6 10 16 8 Q 26 10 26 16"
        stroke="white"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Eyelash line bottom */}
      <path
        d="M 6 16 Q 6 22 16 24 Q 26 22 26 16"
        stroke="white"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Subtle shine/gleam */}
      <ellipse
        cx="12"
        cy="14"
        rx="2"
        ry="2"
        fill="white"
        opacity="0.6"
      />
    </svg>
  );
}
