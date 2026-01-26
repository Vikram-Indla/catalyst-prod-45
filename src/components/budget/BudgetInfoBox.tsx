/**
 * Budget Info Box Component — Catalyst V8
 * Per spec: Better spaced, color-coded terms
 */

import { Info } from 'lucide-react';

export function BudgetInfoBox() {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
      <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        <span>
          <strong className="text-[#2563eb]">Insourced</strong> = CTC × months (Jan 2026 to contract/assignment end)
        </span>
        <span className="text-slate-300">•</span>
        <span>
          <strong className="text-[#0d9488]">Cosourced</strong> = Fixed vendor budget
        </span>
        <span className="text-slate-300">•</span>
        <span>
          <strong className="text-[#d97706]">Outsourced</strong> = Fixed contract
        </span>
      </div>
    </div>
  );
}
