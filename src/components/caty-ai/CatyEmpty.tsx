/**
 * Caty AI V7 — Empty State with Data Summary
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
    <h3>Caty</h3>
    <p>Capacity Assistant</p>
    
    {/* Data Summary */}
    <div className="caty-data-summary">
      <div className="caty-data-stat">
        <span className="caty-data-value">847</span>
        <span className="caty-data-label">Resources</span>
      </div>
      <div className="caty-data-stat">
        <span className="caty-data-value">23</span>
        <span className="caty-data-label">Expiring</span>
      </div>
      <div className="caty-data-stat">
        <span className="caty-data-value">12</span>
        <span className="caty-data-label">Depts</span>
      </div>
    </div>
    
    {/* Suggestions */}
    <div className="caty-empty-suggestions">
      <p className="caty-empty-label">Try asking</p>
      <button onClick={() => onSuggestionClick('Show Delivery Dept utilization')}>
        Show Delivery Dept utilization
      </button>
      <button onClick={() => onSuggestionClick('Who is over 90% utilized?')}>
        Who is over 90% utilized?
      </button>
      <button onClick={() => onSuggestionClick('Off-shore assignments this month')}>
        Off-shore assignments this month
      </button>
    </div>
  </div>
);
