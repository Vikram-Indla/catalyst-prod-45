/**
 * Caty AI V7 — Empty State
 */

import React from 'react';
import { HubIcon } from './constants';

interface CatyEmptyProps {
  onSuggestionClick: (text: string) => void;
}

export const CatyEmpty: React.FC<CatyEmptyProps> = ({ onSuggestionClick }) => (
  <div className="caty-empty">
    <div className="caty-empty-icon">
      <HubIcon />
    </div>
    <h3>Caty AI</h3>
    <p>Capacity Intelligence Assistant</p>
    <div className="caty-empty-suggestions">
      <p className="caty-empty-label">Suggested queries</p>
      <button onClick={() => onSuggestionClick('Show Q2 capacity forecast for Delivery')}>
        Show Q2 capacity forecast for Delivery
      </button>
      <button onClick={() => onSuggestionClick('List expiring contracts this month')}>
        List expiring contracts this month
      </button>
      <button onClick={() => onSuggestionClick('Find available .NET developers')}>
        Find available .NET developers
      </button>
    </div>
  </div>
);
