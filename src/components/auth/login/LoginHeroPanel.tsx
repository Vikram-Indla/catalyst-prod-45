/**
 * Login Hero Panel V10 - Institutional
 * Blue gradient background with Islamic geometric pattern and Catalyst Convergence Hub logo
 */

import './login-styles.css';

// Catalyst Full Logo — white version for blue hero background (Convergence Hub + Umbrella-C + "atalyst")
function CatalystLogoWhite({ width = 280 }: { width?: number }) {
  const height = (width / 420) * 80;
  return (
    <svg width={width} height={height} viewBox="0 0 420 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Convergence Hub Icon */}
      <g transform="translate(8, 8)">
        <line x1="32" y1="32" x2="12" y2="12" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="32" y1="32" x2="52" y2="12" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="32" y1="32" x2="12" y2="52" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="32" y1="32" x2="52" y2="52" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="8" fill="white"/>
        <circle cx="52" cy="12" r="8" fill="white"/>
        <circle cx="12" cy="52" r="8" fill="white"/>
        <circle cx="52" cy="52" r="8" fill="white"/>
        <circle cx="32" cy="32" r="12" fill="white"/>
        <circle cx="32" cy="32" r="6" fill="#2563eb"/>
      </g>
      {/* Umbrella Arc */}
      <path d="M88 22C88 10 102 4 122 4C142 4 156 10 156 22" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none"/>
      {/* C Letterform */}
      <path d="M148 38C148 28 136 22 122 22C104 22 92 32 92 48C92 64 104 74 122 74C136 74 148 68 148 58" stroke="white" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* "atalyst" text */}
      <text x="162" y="62" fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif" fontSize="52" fontWeight="700" fill="white" letterSpacing="-1">atalyst</text>
    </svg>
  );
}

// Islamic Geometric Pattern (8-point star tessellation)
function IslamicPattern() {
  const s = 60; // cell size
  const h = s / 2;
  const q = s / 4;

  return (
    <svg
      className="hero-pattern"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="islamicGeo" x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
          {/* 8-point star outline */}
          <path 
            d={`M ${h} 0 L ${h+q} ${q} L ${s} ${h} L ${h+q} ${h+q} L ${h} ${s} L ${q} ${h+q} L 0 ${h} L ${q} ${q} Z`}
            fill="none" 
            stroke="white" 
            strokeWidth="1" 
          />
          {/* Inner diamond */}
          <path 
            d={`M ${h} ${q} L ${h+q} ${h} L ${h} ${h+q} L ${q} ${h} Z`}
            fill="none" 
            stroke="white" 
            strokeWidth="0.6" 
          />
          {/* Cross lines */}
          <line x1={h} y1="0" x2={h} y2={s} stroke="white" strokeWidth="0.3" />
          <line x1="0" y1={h} x2={s} y2={h} stroke="white" strokeWidth="0.3" />
        </pattern>
        <radialGradient id="patternFade" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="white" stopOpacity="0.01" />
          <stop offset="40%" stopColor="white" stopOpacity="0.03" />
          <stop offset="100%" stopColor="white" stopOpacity="0.06" />
        </radialGradient>
        <mask id="patternMask">
          <rect width="100%" height="100%" fill="url(#patternFade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamicGeo)" mask="url(#patternMask)" />
    </svg>
  );
}

export function LoginHeroPanel() {
  return (
    <div className="hero-panel-v10" aria-hidden="true">
      {/* Islamic geometric pattern background */}
      <IslamicPattern />
      
      {/* Gold divider line */}
      <div className="hero-divider" />
      
      {/* Top light vignette */}
      <div className="hero-vignette-top" />
      
      {/* Bottom darken vignette */}
      <div className="hero-vignette-bottom" />

      {/* Centered content */}
      <div className="hero-content-v10">
        {/* Logo + Wordmark (combined) */}
        <div className="hero-logo">
          <CatalystLogoWhite width={320} />
        </div>
        <p className="hero-subbrand">Enterprise Portfolio Management</p>

        {/* Horizontal rule */}
        <div className="hero-rule" />

        {/* Tagline */}
        <p className="hero-tagline">
          Strategic alignment.<br />Intelligent delivery.
        </p>

        {/* Footer */}
        <div className="hero-footer">
          <div className="hero-footer-line" />
          <p className="hero-copyright">© 2025 Catalyst. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
