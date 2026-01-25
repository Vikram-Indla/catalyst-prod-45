/**
 * Budget Ledger Table Component
 * STAGE 3: Expandable rows, hide CTC toggle, export functionality
 */

import { useState, Fragment } from 'react';
import { Eye, EyeOff, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull, formatSAR, type BudgetResource } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment } from '@/hooks/budget/useBudgetData';

interface BudgetLedgerTableProps {
  assignments: BudgetAssignment[];
  currentDept: string;
  resources?: BudgetResource[];
  hideCTC?: boolean;
  onHideCTCChange?: (hide: boolean) => void;
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

export function BudgetLedgerTable({ 
  assignments, 
  currentDept, 
  resources = [],
  hideCTC: externalHideCTC,
  onHideCTCChange
}: BudgetLedgerTableProps) {
  const [ctcVisible, setCtcVisible] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Use external control if provided
  const isHidden = externalHideCTC !== undefined ? externalHideCTC : !ctcVisible;

  const toggleCTC = () => {
    if (onHideCTCChange) {
      onHideCTCChange(!isHidden);
    } else {
      setCtcVisible(!ctcVisible);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get resources for an assignment
  const getAssignmentResources = (assignmentAid: string): BudgetResource[] => {
    return resources.filter(r => r.aid === assignmentAid);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['AID', 'Assignment', 'Type', 'Status', 'Department', 'Vendor', 'Resources', 'Budget (SAR)', 'Payment'];
    const rows = assignments.map(a => [
      a.aid,
      a.name,
      a.type,
      formatStatus(a.status),
      a.department,
      a.vendor || '—',
      a.type === 'Outsourced' ? '—' : (a.resourceCount || 0),
      a.budget,
      formatPayment(a.paymentStatus)
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-ledger-${currentDept === 'all' ? 'all-departments' : currentDept.toLowerCase().replace(' ', '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totals = assignments.reduce((acc, a) => {
    const key = a.type.toLowerCase() as 'insourced' | 'cosourced' | 'outsourced';
    if (acc[key] !== undefined) {
      acc[key] += a.budget;
    }
    return acc;
  }, { insourced: 0, cosourced: 0, outsourced: 0 });

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="table-title">
          Assignment Ledger <span>— {currentDept === 'all' ? 'All Departments' : currentDept}</span>
        </h3>
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 text-sm font-medium text-[var(--budget-text-muted)] hover:text-[var(--budget-primary)] transition-colors"
            onClick={exportToCSV}
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            className="flex items-center gap-2 text-sm font-medium text-[var(--budget-text-muted)] hover:text-[var(--budget-primary)] transition-colors"
            onClick={toggleCTC}
          >
            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isHidden ? 'Show CTC' : 'Hide CTC'}
          </button>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
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
            const isExpanded = expandedRows.has(a.id);
            const assignmentResources = getAssignmentResources(a.aid);
            const hasResources = assignmentResources.length > 0 && a.type !== 'Outsourced';

            return (
              <Fragment key={a.id}>
                <tr 
                  className={cn(
                    hasResources && 'cursor-pointer hover:bg-[var(--budget-bg)]',
                    isExpanded && 'bg-[var(--budget-primary-light)]'
                  )}
                  onClick={() => hasResources && toggleRow(a.id)}
                >
                  <td className="center" style={{ width: 32 }}>
                    {hasResources && (
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 text-[var(--budget-text-muted)] transition-transform",
                          isExpanded && "rotate-90 text-[var(--budget-primary)]"
                        )} 
                      />
                    )}
                  </td>
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
                    <span className={cn('cost-cell', typeClass)}>
                      {isHidden ? '••••••' : formatFull(a.budget)}
                    </span>
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
                
                {/* Expanded Resources Row */}
                {isExpanded && assignmentResources.length > 0 && (
                  <tr className="expanded-row">
                    <td colSpan={8} className="p-0">
                      <div className="expanded-content">
                        <div className="text-[11px] font-semibold text-[var(--budget-text-muted)] uppercase tracking-wide mb-3">
                          Resources ({assignmentResources.length})
                        </div>
                        <table className="expanded-table">
                          <thead>
                            <tr>
                              <th>RID</th>
                              <th>Name</th>
                              <th>Role</th>
                              <th>Type</th>
                              <th>Vendor</th>
                              <th className="right">Monthly CTC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignmentResources.map(r => (
                              <tr key={r.id}>
                                <td className="font-mono text-[var(--budget-text-muted)]">{r.rid}</td>
                                <td className="font-medium">{r.name}</td>
                                <td className="text-[var(--budget-text-secondary)]">{r.role || '—'}</td>
                                <td>
                                  <span className="inline-block px-2 py-0.5 bg-[var(--budget-bg)] rounded text-[11px]">
                                    {r.resourceType}
                                  </span>
                                </td>
                                <td className="text-[var(--budget-text-secondary)]">{r.vendorName || '—'}</td>
                                <td className="right font-mono">
                                  {isHidden ? '••••••' : (
                                    r.ctc ? (
                                      <span>{formatFull(r.ctc)}</span>
                                    ) : (
                                      <span className="text-[var(--budget-danger)]">Missing</span>
                                    )
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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
              {isHidden ? '••••••' : formatFull(totals.insourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Cosourced</div>
            <div className="footer-total-value" style={{ color: 'var(--budget-cosourced)' }}>
              {isHidden ? '••••••' : formatFull(totals.cosourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Outsourced</div>
            <div className="footer-total-value" style={{ color: 'var(--budget-outsourced)' }}>
              {isHidden ? '••••••' : formatFull(totals.outsourced)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
