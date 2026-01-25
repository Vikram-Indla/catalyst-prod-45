/**
 * Budget Ledger Table Component
 * AUDIT FIX V2: Text formatting, proper contrast
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

// Format status: in_progress -> In Progress
function formatStatus(status: string): string {
  const map: Record<string, string> = {
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'on_hold': 'On Hold',
    'not_started': 'Not Started',
  };
  return map[status] || status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Format payment: not_applicable -> N/A, unpaid -> Unpaid
function formatPayment(payment: string): string {
  const map: Record<string, string> = {
    'not_applicable': 'N/A',
    'on_track': 'On Track',
    'unpaid': 'Unpaid',
    'paid': 'Paid',
  };
  return map[payment] || payment.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Get status CSS class
function getStatusClass(status: string): string {
  if (status === 'completed' || status === 'Completed') return 'completed';
  if (status === 'in_progress' || status === 'In Progress') return 'in-progress';
  return 'on-hold';
}

// Get payment CSS class  
function getPaymentClass(payment: string): string {
  if (payment === 'unpaid' || payment === 'Unpaid') return 'unpaid';
  if (payment === 'on_track' || payment === 'On Track') return 'on-track';
  return 'na';
}

export function BudgetLedgerTable({ assignments, currentDept }: BudgetLedgerTableProps) {
  const [ctcVisible, setCtcVisible] = useState(true);

  // Calculate totals
  const totals = assignments.reduce((acc, a) => {
    acc[a.type.toLowerCase() as 'insourced' | 'cosourced' | 'outsourced'] += a.budget;
    return acc;
  }, { insourced: 0, cosourced: 0, outsourced: 0 });

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="table-title">
          Assignment Ledger <span>— {currentDept === 'all' ? 'All Departments' : currentDept}</span>
        </h3>
        <button 
          className="flex items-center gap-2 text-sm font-medium text-[var(--budget-text-muted)] hover:text-[var(--budget-primary)] transition-colors"
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
                  <span className={cn('status-badge', getStatusClass(a.status))}>
                    {formatStatus(a.status)}
                  </span>
                </td>
                <td>
                  {a.vendor ? (
                    <div className="vendor-cell">
                      <div className="vendor-logo">{a.vendor.substring(0, 2).toUpperCase()}</div>
                      <span className="vendor-name">{a.vendor}</span>
                    </div>
                  ) : (
                    <span className="cost-cell muted">—</span>
                  )}
                </td>
                <td className="center">
                  {a.type === 'Outsourced' ? '—' : (
                    <span style={{ color: 'var(--budget-text)', fontWeight: 500 }}>{a.resourceCount || 0}</span>
                  )}
                </td>
                <td className="right">
                  <span className={cn('cost-cell', typeClass)}>{formatFull(a.budget)}</span>
                  {a.computed && (
                    <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--budget-text-muted)' }}>ƒ</span>
                  )}
                </td>
                <td className="center">
                  <span className={cn('payment-badge', getPaymentClass(a.paymentStatus))}>
                    {formatPayment(a.paymentStatus)}
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
