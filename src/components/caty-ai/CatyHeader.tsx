/**
 * Caty AI V7 — Header Component (Simplified)
 */

import React from 'react';
import { HubIcon } from './constants';

interface CatyHeaderProps {
  isOnline: boolean;
}

export const CatyHeader: React.FC<CatyHeaderProps> = ({ isOnline }) => (
  <header className="caty-header">
    <div className="caty-header-left">
      <div className="caty-header-icon">
        <HubIcon />
      </div>
      <div>
        <div className="caty-header-title">Caty</div>
        <div className="caty-header-subtitle">
          <span className={`caty-status-dot ${!isOnline ? 'offline' : ''}`} />
          Capacity Assistant
        </div>
      </div>
    </div>
  </header>
);
