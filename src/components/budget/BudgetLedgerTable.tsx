/**
 * Budget Ledger Table Component
 * STAGE 3: Expandable rows, hide CTC toggle, export functionality
 * V8 QA Pass: Type-colored budgets, consistent badges, tight rows
 */

import { useState, Fragment } from 'react';
import { Eye, EyeOff, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull, type BudgetResource } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment } from '@/hooks/budget/useBudgetData';

interface BudgetLedgerTableProps {
  assignments: BudgetAssignment[];
  currentDept: string;
  resources?: BudgetResource[];
  hideCTC?: boolean;
  onHideCTCChange?: (hide: boolean) => void;
}

// Format budget as clean number (no trailing characters)
function formatBudget(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format status: in_progress -> In Progress
function formatStatus(status: string): string {
  const map: Record<string, string> = {
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'on_hold': 'On Hold',
    'not_started': 'Not Started',
    'yet_to_start': 'Yet to Start',
  };
  return map[status] || status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Format payment for Insourced (use dash), others get badge text
function formatPayment(payment: string, type: string): string {
  // Insourced doesn't have payment status - show dash
  if (type === 'Insourced') return '—';
  
  const map: Record<string, string> = {
    'not_applicable': '—',
    'on_track': '✓ On Track',
    'unpaid': '⚠ Unpaid',
    'paid': '✓ Paid',
  };
  return map[payment] || payment.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Get status CSS class - consistent badge styling
function getStatusClass(status: string): string {
  if (status === 'completed' || status === 'Completed') return 'completed';
  if (status === 'in_progress' || status === 'In Progress') return 'in-progress';
  if (status === 'yet_to_start' || status === 'Yet to Start' || status === 'not_started') return 'yet-to-start';
  if (status === 'on_hold' || status === 'On Hold') return 'on-hold';
  return 'yet-to-start';
}

// Get payment CSS class  
function getPaymentClass(payment: string, type: string): string {
  // Insourced shows dash, not a badge
  if (type === 'Insourced' || payment === 'not_applicable') return 'na';
  if (payment === 'unpaid' || payment === 'Unpaid') return 'unpaid';
  if (payment === 'on_track' || payment === 'On Track' || payment === 'paid' || payment === 'Paid') return 'on-track';
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
      formatPayment(a.paymentStatus, a.type)
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
            <th style={{ width: 40 }}></th>
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
            const totalCTC = assignmentResources.reduce((sum, r) => sum + (r.ctc || 0), 0);

            return (
              <Fragment key={a.id}>
                {/* Main Assignment Row */}
                <tr 
                  className={cn(
                    'ledger-row transition-all duration-150',
                    hasResources && 'cursor-pointer',
                    isExpanded && 'expanded-parent'
                  )}
                  data-type={a.type}
                  onClick={() => hasResources && toggleRow(a.id)}
                  style={isExpanded ? { 
                    background: '#eff6ff', 
                    boxShadow: 'inset 4px 0 0 #2563eb' 
                  } : undefined}
                >
                  {/* Expand Arrow - Clear affordance */}
                  <td className="center expand-cell" style={{ width: 40 }}>
                    {hasResources ? (
                      <ChevronRight 
                        className={cn(
                          "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                          isExpanded 
                            ? "rotate-90 text-blue-600" 
                            : "text-slate-400"
                        )} 
                      />
                    ) : (
                      <span className="w-5 h-5" />
                    )}
                  </td>
                  
                  {/* Assignment Cell - Consistent badge color (slate-600) */}
                  <td>
                    <div className="assignment-cell">
                      <div className="assignment-badge">
                        {a.aid.replace('A', '')}
                      </div>
                      <div className="assignment-info">
                        <h4>{a.name}</h4>
                        <span>{a.department}</span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Type Badge - Color by type */}
                  <td>
                    <span className={cn('type-badge', typeClass)}>{a.type}</span>
                  </td>
                  
                  {/* Status Badge - Consistent styling */}
                  <td>
                    <span className={cn('status-badge', getStatusClass(a.status))}>
                      {formatStatus(a.status)}
                    </span>
                  </td>
                  
                  {/* Vendor Cell - Consistent handling */}
                  <td>
                    {a.vendor ? (
                      <div className="vendor-cell">
                        <div className="vendor-logo">{a.vendor.substring(0, 2).toUpperCase()}</div>
                        <span className="vendor-name">{a.vendor}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  
                  {/* Resources Count - JetBrains Mono */}
                  <td className="center">
                    {a.type === 'Outsourced' ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="font-mono font-semibold text-slate-700">{a.resourceCount || 0}</span>
                    )}
                  </td>
                  
                  {/* Budget Value - COLOR BY TYPE, clean hidden state */}
                  <td className="right">
                    {isHidden ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <>
                        <span className={cn(
                          'font-mono font-semibold',
                          a.type === 'Insourced' && 'text-blue-600',
                          a.type === 'Cosourced' && 'text-teal-600',
                          a.type === 'Outsourced' && 'text-amber-600'
                        )}>
                          {formatBudget(a.budget)}
                        </span>
                        {a.computed && (
                          <span className="text-[10px] font-medium ml-1 text-slate-400">ƒ</span>
                        )}
                      </>
                    )}
                  </td>
                  
                  {/* Payment Status - Clear badges or dash */}
                  <td className="center">
                    {a.type === 'Insourced' ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={cn('payment-badge', getPaymentClass(a.paymentStatus, a.type))}>
                        {formatPayment(a.paymentStatus, a.type)}
                      </span>
                    )}
                  </td>
                </tr>
                
                {/* Expanded Resources Row */}
                {isExpanded && assignmentResources.length > 0 && (
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="p-0 border-b border-slate-200">
                      <div className="ml-14 mr-4 my-4">
                        {/* Resources Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Resources ({assignmentResources.length})
                          </span>
                          <span className="text-xs text-slate-400">
                            Total Monthly CTC: 
                            <span className="font-mono font-semibold text-slate-700 ml-1">
                              {isHidden ? '••••••' : `${totalCTC.toLocaleString()} SAR`}
                            </span>
                          </span>
                        </div>
                        
                        {/* Resources Table Container */}
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-16">RID</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-24">Type</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-28">Vendor</th>
                                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-32">Monthly CTC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {assignmentResources.map((r, idx) => (
                                <tr 
                                  key={r.id} 
                                  className={cn(
                                    'hover:bg-blue-50/50 transition-colors',
                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                  )}
                                >
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs text-slate-500">{r.rid || '—'}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-sm text-slate-800">{r.name}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-slate-600">{r.role || '—'}</span>
                                  </td>
                                  <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                r.resourceType === 'Variable' ? 'bg-blue-600' :
                                r.resourceType === 'Fixed' ? 'bg-emerald-600' :
                                r.resourceType === 'Freelance' ? 'bg-violet-600' :
                                'bg-slate-400'
                              )} />
                              {r.resourceType}
                            </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-slate-600">{r.vendorName || '—'}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {isHidden ? (
                                      <span className="font-mono text-sm text-slate-400">••••••</span>
                                    ) : r.ctc ? (
                                      <span className="font-mono text-sm font-semibold text-slate-800">
                                        {r.ctc.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
            <div className="footer-total-value text-blue-600">
              {isHidden ? '••••••' : formatBudget(totals.insourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Cosourced</div>
            <div className="footer-total-value text-teal-600">
              {isHidden ? '••••••' : formatBudget(totals.cosourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Outsourced</div>
            <div className="footer-total-value text-amber-600">
              {isHidden ? '••••••' : formatBudget(totals.outsourced)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
