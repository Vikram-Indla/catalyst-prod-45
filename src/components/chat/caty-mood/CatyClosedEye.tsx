/**
 * CatyClosedEye — simple closed-eye icon when Caty FAB is hidden.
 * Circle with strikethrough line, filled with Caty gradient.
 */

interface CatyClosedEyeProps {
  size?: number;
}

export function CatyClosedEye({ size = 24 }: CatyClosedEyeProps) {
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
        <linearGradient id="caty-closed-eye-gradient" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          {/* ads-scanner:ignore-next-line */}
          <stop stopColor="#F79357" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".5" stopColor="#F53F68" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".78" stopColor="#B41572" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset="1" stopColor="#CC1E9A" />
        </linearGradient>
      </defs>

      {/* Eye circle */}
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="url(#caty-closed-eye-gradient)"
        opacity="0.95"
      />

      {/* Strikethrough line (closed) */}
      <line
        x1="6"
        y1="16"
        x2="26"
        y2="16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
