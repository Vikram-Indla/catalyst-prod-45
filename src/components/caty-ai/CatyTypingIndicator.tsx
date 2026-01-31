/**
 * Caty AI V7 — Typing Indicator
 */

import React from 'react';
import { HubIcon } from './constants';

export const CatyTypingIndicator: React.FC = () => (
  <div className="caty-message assistant">
    <div className="caty-avatar assistant">
      <HubIcon />
    </div>
    <div className="caty-msg-body">
      <div className="caty-typing">
        <div className="caty-typing-dot" />
        <div className="caty-typing-dot" />
        <div className="caty-typing-dot" />
      </div>
    </div>
  </div>
);
