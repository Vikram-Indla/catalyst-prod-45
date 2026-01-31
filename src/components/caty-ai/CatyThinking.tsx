/**
 * Caty AI V7 — Thinking State (Contextual)
 */

import React from 'react';
import { HubIcon } from './constants';

export const CatyThinking: React.FC = () => (
  <div className="caty-message assistant">
    <div className="caty-avatar assistant">
      <HubIcon />
    </div>
    <div className="caty-msg-body">
      <div className="caty-thinking">
        <div className="caty-thinking-header">
          <svg className="caty-thinking-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
          </svg>
          <span>Querying capacity data...</span>
        </div>
        <div className="caty-thinking-stats">
          <span>Analyzing resources across departments</span>
        </div>
      </div>
    </div>
  </div>
);
