/**
 * Budget Quality Panel Component
 */

import { useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

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
    <div className="quality-panel">
      <div className="quality-header">
        <div className="quality-title">
          <AlertTriangle className="w-4 h-4" />
          Data Quality Alerts ({issues.length})
        </div>
        <button 
          className="quality-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {isOpen && (
        <div className="quality-items">
          {issues.slice(0, 6).map((issue, idx) => (
            <div key={idx} className="quality-item">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{issue.name}</strong> ({issue.department}) — {issue.issue}
              </span>
            </div>
          ))}
          {issues.length > 6 && (
            <div className="quality-item">
              <strong>+{issues.length - 6} more issues</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
