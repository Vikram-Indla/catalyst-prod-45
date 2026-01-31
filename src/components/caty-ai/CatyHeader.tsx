/**
 * Caty AI V7 — Header Component
 */

import React from 'react';
import { Clock, Users, Minus } from 'lucide-react';
import { HubIcon } from './constants';

interface CatyHeaderProps {
  onHistoryClick: () => void;
  onEscalateClick: () => void;
  onMinimizeClick: () => void;
  isOnline: boolean;
}

export const CatyHeader: React.FC<CatyHeaderProps> = ({
  onHistoryClick,
  onEscalateClick,
  onMinimizeClick,
  isOnline,
}) => (
  <header className="caty-header">
    <div className="caty-header-left">
      <div className="caty-header-icon">
        <HubIcon />
      </div>
      <div>
        <div className="caty-header-title">Caty AI</div>
        <div className="caty-header-subtitle">
          <span className={`caty-status-dot ${!isOnline ? 'offline' : ''}`} />
          <span>Capacity Intelligence Assistant</span>
        </div>
      </div>
    </div>
    <div className="caty-header-actions">
      <button className="caty-header-btn" onClick={onHistoryClick} aria-label="View history">
        <Clock size={22} />
      </button>
      <button className="caty-header-btn escalate" onClick={onEscalateClick} aria-label="Connect to specialist">
        <Users size={22} />
      </button>
      <button className="caty-header-btn" onClick={onMinimizeClick} aria-label="Minimize">
        <Minus size={22} />
      </button>
    </div>
  </header>
);
