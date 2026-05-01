/**
 * Caty AI V7 — Header Component (White Background)
 */

import React from 'react';
import { Minus, RefreshCw } from 'lucide-react';

interface CatyHeaderProps {
  isOnline?: boolean;
  onClose?: () => void;
  onClearChat?: () => void;
  onMinimize?: () => void;
}

export const CatyHeader: React.FC<CatyHeaderProps> = ({ 
  isOnline = true, 
  onClose,
  onClearChat,
  onMinimize 
}) => (
  <header className="caty-header-fixed">
    <div className="caty-header-left">
      <div className="caty-header-icon">
        <svg viewBox="0 0 100 100" fill="none">
          <line x1="50" y1="50" x2="22" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
          <line x1="50" y1="50" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
          <line x1="50" y1="50" x2="22" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
          <line x1="50" y1="50" x2="78" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="22" cy="22" r="10" fill="white"/>
          <circle cx="78" cy="22" r="10" fill="white"/>
          <circle cx="22" cy="78" r="10" fill="white"/>
          <circle cx="78" cy="78" r="10" fill="white"/>
          <circle cx="50" cy="50" r="16" fill="white"/>
          <circle cx="50" cy="50" r="8" fill="var(--ds-text-brand, var(--ds-text-brand, #2563eb))"/>
        </svg>
      </div>
      <div className="caty-header-text">
        <span className="caty-header-title">CATY AI™</span>
        <span className="caty-header-subtitle">
          <span className={`caty-status-dot ${!isOnline ? 'offline' : ''}`}></span>
          Resource Capacity Assistant
        </span>
      </div>
    </div>
    <div className="caty-header-actions">
      {onClearChat && (
        <button 
          className="caty-header-btn" 
          onClick={onClearChat}
          title="Refresh chat"
        >
          <RefreshCw size={18} />
        </button>
      )}
      {onMinimize && (
        <button 
          className="caty-header-btn" 
          onClick={onMinimize}
          title="Minimize"
        >
          <Minus size={18} />
        </button>
      )}
    </div>
  </header>
);
