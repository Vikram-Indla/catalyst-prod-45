/**
 * Caty AI V7 — Constants
 */

export const CATY_STORAGE_KEY = 'caty_ai_sessions';
export const CATY_MAX_SESSIONS = 50;

export const HubIcon = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="catalystBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'var(--cp-blue)'}}/>
        <stop offset="100%" style={{stopColor:'var(--ds-background-brand-bold-hovered, #1d4ed8)'}}/>
      </linearGradient>
    </defs>
    <line x1="50" y1="50" x2="22" y2="22" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
    <line x1="50" y1="50" x2="78" y2="22" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
    <line x1="50" y1="50" x2="22" y2="78" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
    <line x1="50" y1="50" x2="78" y2="78" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="22" cy="22" r="12" fill="url(#catalystBlue)"/>
    <circle cx="78" cy="22" r="12" fill="url(#catalystBlue)"/>
    <circle cx="22" cy="78" r="12" fill="url(#catalystBlue)"/>
    <circle cx="78" cy="78" r="12" fill="url(#catalystBlue)"/>
    <circle cx="50" cy="50" r="18" fill="url(#catalystBlue)"/>
    <circle cx="50" cy="50" r="9" fill="white"/>
  </svg>
);
