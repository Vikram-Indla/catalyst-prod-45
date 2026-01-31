/**
 * Caty AI V7 — Suggestions Bar (Domain-specific)
 */

import React from 'react';

interface CatySuggestionsBarProps {
  onSend: (text: string) => void;
}

export const CatySuggestionsBar: React.FC<CatySuggestionsBarProps> = ({ onSend }) => (
  <div className="caty-suggestions">
    <button className="caty-suggestion" onClick={() => onSend('Show utilization by department')}>
      Utilization by Dept
    </button>
    <button className="caty-suggestion" onClick={() => onSend('Who is on-site this week?')}>
      On-Site Resources
    </button>
    <button className="caty-suggestion" onClick={() => onSend('Show off-shore assignments')}>
      Off-Shore Teams
    </button>
    <button className="caty-suggestion" onClick={() => onSend('Contracts ending this month')}>
      Expiring Contracts
    </button>
  </div>
);
