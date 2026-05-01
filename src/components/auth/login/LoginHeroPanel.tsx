/**
 * Login Hero Panel V10 - Institutional
 * Blue gradient background with Islamic geometric pattern and Catalyst wordmark
 */

import catalystWordmark from '@/assets/catalyst-wordmark-2.svg';
import './login-styles.css';

// Catalyst Convergence Hub Logo (white on blue)
function CatalystLogo({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Connecting lines */}
      <line x1="50" y1="50" x2="22" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="22" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="78" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
      {/* Corner circles */}
      <circle cx="22" cy="22" r="12" fill="white"/>
      <circle cx="78" cy="22" r="12" fill="white"/>
      <circle cx="22" cy="78" r="12" fill="white"/>
      <circle cx="78" cy="78" r="12" fill="white"/>
      {/* Center hub */}
      <circle cx="50" cy="50" r="18" fill="white"/>
      <circle cx="50" cy="50" r="9" fill="var(--ds-text-brand, #2563eb)"/>
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
        {/* Wordmark */}
        <div className="hero-logo">
          <img 
            src={catalystWordmark} 
            alt="Catalyst" 
            style={{ height: '80px', width: 'auto', filter: 'brightness(0) invert(1)' }} 
          />
        </div>

        {/* Sub-brand */}
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
