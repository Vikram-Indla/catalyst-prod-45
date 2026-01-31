/**
 * Caty AI V7 — Context Bar Component (Better labels)
 */

import React from 'react';
import { CatyContext } from './types';

interface CatyContextBarProps {
  context: CatyContext;
}

export const CatyContextBar: React.FC<CatyContextBarProps> = ({ context }) => (
  <div className="caty-context-bar">
    <span className="caty-context-label">Viewing:</span>
    <div className="caty-context-tags">
      <span className="caty-context-tag active">{context.department}</span>
      <span className="caty-context-tag">{context.period}</span>
      <span className="caty-context-tag">{context.location || 'All Locations'}</span>
    </div>
  </div>
);
