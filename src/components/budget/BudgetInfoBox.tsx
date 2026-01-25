/**
 * Budget Info Box Component
 */

import { Info } from 'lucide-react';

export function BudgetInfoBox() {
  return (
    <div className="info-box">
      <Info className="w-4 h-4 text-[var(--budget-primary)] shrink-0" />
      <div className="info-box-text">
        <strong>Insourced</strong> = CTC × months (Jan 2026 to contract/assignment end) &nbsp;•&nbsp;
        <strong>Cosourced</strong> = Fixed vendor budget &nbsp;•&nbsp;
        <strong>Outsourced</strong> = Fixed contract
      </div>
    </div>
  );
}
