import React from 'react';

const HubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="currentColor" fillOpacity="0.1"/>
    <circle cx="24" cy="24" r="8" fill="currentColor"/>
    <circle cx="24" cy="8" r="4" fill="currentColor"/>
    <circle cx="24" cy="40" r="4" fill="currentColor"/>
    <circle cx="8" cy="24" r="4" fill="currentColor"/>
    <circle cx="40" cy="24" r="4" fill="currentColor"/>
    <line x1="24" y1="16" x2="24" y2="12" stroke="currentColor" strokeWidth="2"/>
    <line x1="24" y1="36" x2="24" y2="32" stroke="currentColor" strokeWidth="2"/>
    <line x1="16" y1="24" x2="12" y2="24" stroke="currentColor" strokeWidth="2"/>
    <line x1="36" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const CatyThinking = () => (
  <div className="caty-message assistant">
    <div className="caty-avatar">
      <div className="caty-thinking-icon">
        <HubIcon />
      </div>
    </div>
    <div className="caty-thinking">
      <div className="caty-thinking-header">
        <div className="caty-thinking-spinner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <span className="caty-thinking-text">Analyzing contract data...</span>
      </div>
      <div className="caty-thinking-preview">
        <div className="caty-skeleton caty-skeleton-text full" />
        <div className="caty-skeleton caty-skeleton-text medium" />
        <div className="caty-skeleton caty-skeleton-text short" />
        <div className="caty-skeleton caty-skeleton-card" />
      </div>
    </div>
  </div>
);
