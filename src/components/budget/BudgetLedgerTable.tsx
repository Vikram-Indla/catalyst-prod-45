/**
 * Budget Ledger Table Component
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment } from '@/hooks/budget/useBudgetData';

interface BudgetLedgerTableProps {
  assignments: BudgetAssignment[];
  currentDept: string;
}

export function BudgetLedgerTable({ assignments, currentDept }: BudgetLedgerTableProps) {
  const [ctcVisible, setCtcVisible] = useState(true);

  // Calculate totals
  const totals = assignments.reduce((acc, a) => {
    acc[a.type.toLowerCase() as 'insourced' | 'cosourced' | 'outsourced'] += a.budget;
    return acc;
  }, { insourced: 0, cosourced: 0, outsourced: 0 });

  const getStatusClass = (status: string) => {
    if (status === 'Completed') return 'completed';
    if (status === 'In Progress') return 'in-progress';
    return 'on-hold';
  };

  const getPaymentClass = (status: string) => {
    if (status === 'Unpaid') return 'unpaid';
    if (status === 'On Track') return 'on-track';
    return 'na';
  };

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="table-title">
          Assignment Ledger <span>— {currentDept === 'all' ? 'All Departments' : currentDept}</span>
        </h3>
        <button 
          className="flex items-center gap-2 text-sm text-[var(--budget-text-secondary)] hover:text-[var(--budget-primary)]"
          onClick={() => setCtcVisible(!ctcVisible)}
        >
          {ctcVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {ctcVisible ? 'Hide CTC' : 'Show CTC'}
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Type</th>
            <th>Status</th>
            <th>Vendor</th>
            <th className="center">Resources</th>
            <th className="right">Budget (SAR)</th>
            <th className="center">Payment</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map(a => {
            const typeClass = a.type.toLowerCase();
            return (
              <tr key={a.id}>
                <td>
                  <div className="assignment-cell">
                    <div className={cn('assignment-icon', typeClass)}>
                      {a.aid.replace('A', '')}
                    </div>
                    <div className="assignment-info">
                      <h4>{a.name}</h4>
                      <span>{a.department}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={cn('type-badge', typeClass)}>{a.type}</span>
                </td>
                <td>
                  <span className={cn('status-badge', getStatusClass(a.status))}>{a.status}</span>
                </td>
                <td>
                  {a.vendor ? (
                    <div className="vendor-cell">
                      <div className="vendor-logo">{a.vendor.substring(0, 2).toUpperCase()}</div>
                      <span>{a.vendor}</span>
                    </div>
                  ) : (
                    <span className="cost-cell muted">—</span>
                  )}
                </td>
                <td className="center">
                  {a.type === 'Outsourced' ? '—' : (
                    <span className="text-[var(--budget-text)]">{a.resourceCount || 0}</span>
                  )}
                </td>
                <td className="right">
                  <span className={cn('cost-cell', typeClass)}>{formatFull(a.budget)}</span>
                  {a.computed && (
                    <span className="text-[10px] text-[var(--budget-text-muted)] ml-1">ƒ</span>
                  )}
                </td>
                <td className="center">
                  <span className={cn('payment-badge', getPaymentClass(a.paymentStatus))}>
                    {a.paymentStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="table-footer">
        <div className="footer-stats">{assignments.length} assignments</div>
        <div className="footer-totals">
          <div className="footer-total">
            <div className="footer-total-label">Insourced</div>
            <div className="footer-total-value" style={{ color: 'var(--budget-insourced)' }}>
              {formatFull(totals.insourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Cosourced</div>
            <div className="footer-total-value" style={{ color: 'var(--budget-cosourced)' }}>
              {formatFull(totals.cosourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Outsourced</div>
            <div className="footer-total-value" style={{ color: 'var(--budget-outsourced)' }}>
              {formatFull(totals.outsourced)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
