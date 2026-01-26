/**
 * Budget Quality Panel Component — Catalyst V8
 * Per spec: Prominent amber panel, collapsible, 2-column layout
 */

import { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface DataQualityIssue {
  name: string;
  department: string;
  issue: string;
}

interface BudgetQualityPanelProps {
  issues: DataQualityIssue[];
}

export function BudgetQualityPanel({ issues }: BudgetQualityPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (issues.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 bg-amber-100/50 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="font-bold text-amber-800 text-sm">
            Data Quality Alerts
            <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-semibold">
              {issues.length}
            </span>
          </span>
        </div>
        <button 
          className="text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {/* Alert List */}
      {isOpen && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {issues.slice(0, 6).map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">
                  <strong className="text-amber-700">{issue.name}</strong>
                  <span className="text-slate-500"> ({issue.department})</span>
                  <span className="text-slate-600"> — {issue.issue}</span>
                </span>
              </div>
            ))}
          </div>
          
          {issues.length > 6 && (
            <button className="mt-3 text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline">
              +{issues.length - 6} more issues
            </button>
          )}
        </div>
      )}
    </div>
  );
}
