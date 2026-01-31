/**
 * Caty AI V7 — Context Bar Component
 */

import React from 'react';
import { CatyContext } from './types';

interface CatyContextBarProps {
  context: CatyContext;
}

export const CatyContextBar: React.FC<CatyContextBarProps> = ({ context }) => (
  <div className="caty-context-bar">
    <span className="caty-context-label">Context:</span>
    <div className="caty-context-tags">
      <span className="caty-context-tag active">{context.department}</span>
      <span className="caty-context-tag">{context.period}</span>
      <span className="caty-context-tag">{context.view}</span>
    </div>
  </div>
);
