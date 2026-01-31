/**
 * Caty AI V7 — Header Component (Simplified)
 */

import React from 'react';
import { X, Minus } from 'lucide-react';
import { HubIcon } from './constants';

interface CatyHeaderProps {
  isOnline: boolean;
  onClose?: () => void;
}

export const CatyHeader: React.FC<CatyHeaderProps> = ({ isOnline, onClose }) => (
  <header className="caty-header">
    <div className="caty-header-left">
      <div className="caty-header-icon">
        <HubIcon />
      </div>
      <div>
        <div className="caty-header-title">CATY AI<sup className="caty-trademark">™</sup></div>
        <div className="caty-header-subtitle">
          <span className={`caty-status-dot ${!isOnline ? 'offline' : ''}`} />
          Capacity Assistant
        </div>
      </div>
    </div>
    
    <div className="caty-header-actions">
      {onClose && (
        <button
          className="caty-header-btn"
          onClick={onClose}
          aria-label="Minimize CATY AI"
          title="Minimize"
        >
          <Minus />
        </button>
      )}
    </div>
  </header>
);
