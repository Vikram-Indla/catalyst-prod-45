/**
 * Budget Ledger Table Component
 * STAGE 3: Expandable rows, hide CTC toggle, export functionality
 * V8 QA Pass: Type-colored budgets, consistent badges, tight rows
 * A11Y Pass: ARIA labels, sortable columns, focus states
 */

import { useState, Fragment, useMemo } from 'react';
import { Eye, EyeOff, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull, type BudgetResource } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment } from '@/hooks/budget/useBudgetData';

// UX-4: Sorting types
type SortField = 'name' | 'type' | 'status' | 'vendor' | 'resourceCount' | 'budget' | null;
type SortDirection = 'asc' | 'desc';

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
  
  // UX-4: Sorting state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
  
  // UX-4: Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // UX-4: Sorted assignments
  const sortedAssignments = useMemo(() => {
    if (!sortField) return assignments;
    
    return [...assignments].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'vendor':
          comparison = (a.vendor || '').localeCompare(b.vendor || '');
          break;
        case 'resourceCount':
          comparison = (a.resourceCount || 0) - (b.resourceCount || 0);
          break;
        case 'budget':
          comparison = a.budget - b.budget;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assignments, sortField, sortDirection]);
  
  // UX-4: Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
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
    <div className="table-card" role="region" aria-label={`Assignment Ledger for ${currentDept === 'all' ? 'All Departments' : currentDept}`}>
      <div className="table-header">
        <h3 className="table-title">
          Assignment Ledger <span>— {currentDept === 'all' ? 'All Departments' : currentDept}</span>
        </h3>
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 text-sm font-medium text-[var(--budget-text-muted)] hover:text-[var(--budget-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
            onClick={exportToCSV}
            title="Export to CSV"
            aria-label="Export ledger to CSV file"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </button>
          <button 
            className="flex items-center gap-2 text-sm font-medium text-[var(--budget-text-muted)] hover:text-[var(--budget-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
            onClick={toggleCTC}
            aria-pressed={!isHidden}
            aria-label={isHidden ? 'Show CTC values' : 'Hide CTC values'}
          >
            {isHidden ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
            {isHidden ? 'Show CTC' : 'Hide CTC'}
          </button>
        </div>
      </div>
      
      <table role="grid" aria-label="Assignment ledger table">
        <thead>
          <tr>
            <th style={{ width: 40 }} aria-label="Expand row"></th>
            {/* UX-4: Sortable columns with ARIA */}
            <th>
              <button 
                type="button"
                onClick={() => handleSort('name')}
                className="flex items-center w-full hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary"
                aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Assignment
                <SortIcon field="name" />
              </button>
            </th>
            <th>
              <button 
                type="button"
                onClick={() => handleSort('type')}
                className="flex items-center w-full hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary"
                aria-sort={sortField === 'type' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Type
                <SortIcon field="type" />
              </button>
            </th>
            <th>
              <button 
                type="button"
                onClick={() => handleSort('status')}
                className="flex items-center w-full hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary"
                aria-sort={sortField === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Status
                <SortIcon field="status" />
              </button>
            </th>
            <th>
              <button 
                type="button"
                onClick={() => handleSort('vendor')}
                className="flex items-center w-full hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary"
                aria-sort={sortField === 'vendor' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Vendor
                <SortIcon field="vendor" />
              </button>
            </th>
            <th className="center">
              <button 
                type="button"
                onClick={() => handleSort('resourceCount')}
                className="flex items-center justify-center w-full hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary"
                aria-sort={sortField === 'resourceCount' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Resources
                <SortIcon field="resourceCount" />
              </button>
            </th>
            <th className="right">
              <button 
                type="button"
                onClick={() => handleSort('budget')}
                className="flex items-center justify-end w-full hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary"
                aria-sort={sortField === 'budget' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Budget (SAR)
                <SortIcon field="budget" />
              </button>
            </th>
            <th className="center">Payment</th>
          </tr>
        </thead>
        <tbody>
          {sortedAssignments.map(a => {
            const typeClass = a.type.toLowerCase();
            const isExpanded = expandedRows.has(a.id);
            const assignmentResources = getAssignmentResources(a.aid);
            const hasResources = assignmentResources.length > 0 && a.type !== 'Outsourced';
            const totalCTC = assignmentResources.reduce((sum, r) => sum + (r.ctc || 0), 0);

            return (
              <Fragment key={a.id}>
                {/* Main Assignment Row - A11Y enhanced */}
                <tr 
                  className={cn(
                    'ledger-row transition-all duration-150',
                    hasResources && 'cursor-pointer',
                    isExpanded && 'expanded-parent'
                  )}
                  data-type={a.type}
                  onClick={() => hasResources && toggleRow(a.id)}
                >
                  {/* Expand Arrow - Clear affordance */}
                  <td className="center expand-cell" style={{ width: 40 }}>
                    {hasResources ? (
                      <ChevronRight 
                        className={cn(
                          "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                          isExpanded 
                            ? "rotate-90 text-primary" 
                            : "text-muted-foreground"
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
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Resources Count - JetBrains Mono */}
                  <td className="center">
                    {a.type === 'Outsourced' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="font-mono font-semibold text-foreground">{a.resourceCount || 0}</span>
                    )}
                  </td>
                  
                  {/* Budget Value - COLOR BY TYPE, clean hidden state */}
                  <td className="right">
                    {isHidden ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        <span className={cn(
                          'font-mono font-semibold',
                          a.type === 'Insourced' && 'text-[color:var(--budget-insourced)]',
                          a.type === 'Cosourced' && 'text-[color:var(--budget-cosourced)]',
                          a.type === 'Outsourced' && 'text-[color:var(--budget-outsourced)]'
                        )}>
                          {formatBudget(a.budget)}
                        </span>
                        {a.computed && (
                          <span className="text-[10px] font-medium ml-1 text-muted-foreground">ƒ</span>
                        )}
                      </>
                    )}
                  </td>
                  
                  {/* Payment Status - Clear badges or dash */}
                  <td className="center">
                    {a.type === 'Insourced' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={cn('payment-badge', getPaymentClass(a.paymentStatus, a.type))}>
                        {formatPayment(a.paymentStatus, a.type)}
                      </span>
                    )}
                  </td>
                </tr>
                
                {/* Expanded Resources Row */}
                {isExpanded && assignmentResources.length > 0 && (
                  <tr className="bg-muted/40">
                    <td colSpan={8} className="p-0 border-b border-border">
                      <div className="ml-14 mr-4 my-4">
                        {/* Resources Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Resources ({assignmentResources.length})
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Total Monthly CTC: 
                            <span className="font-mono font-semibold text-foreground ml-1">
                              {isHidden ? '••••••' : `${totalCTC.toLocaleString()} SAR`}
                            </span>
                          </span>
                        </div>
                        
                        {/* Resources Table Container */}
                        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/30 border-b border-border">
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">RID</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Type</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Vendor</th>
                                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-32">Monthly CTC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {assignmentResources.map((r, idx) => (
                                <tr 
                                  key={r.id} 
                                  className={cn(
                                    'hover:bg-muted/40 transition-colors',
                                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                                  )}
                                >
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs text-muted-foreground">{r.rid || '—'}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-sm text-foreground">{r.name}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-muted-foreground">{r.role || '—'}</span>
                                  </td>
                                  <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
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
                                    <span className="text-sm text-muted-foreground">{r.vendorName || '—'}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {isHidden ? (
                                      <span className="font-mono text-sm text-muted-foreground">••••••</span>
                                    ) : r.ctc ? (
                                      <span className="font-mono text-sm font-semibold text-foreground">
                                        {r.ctc.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-0.5 rounded bg-destructive/15 text-destructive text-[10px] font-semibold">
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
              <div className="footer-total-value text-[color:var(--budget-insourced)]">
              {isHidden ? '••••••' : formatBudget(totals.insourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Cosourced</div>
              <div className="footer-total-value text-[color:var(--budget-cosourced)]">
              {isHidden ? '••••••' : formatBudget(totals.cosourced)}
            </div>
          </div>
          <div className="footer-total">
            <div className="footer-total-label">Outsourced</div>
              <div className="footer-total-value text-[color:var(--budget-outsourced)]">
              {isHidden ? '••••••' : formatBudget(totals.outsourced)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
