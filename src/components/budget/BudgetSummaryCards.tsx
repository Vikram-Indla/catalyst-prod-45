/**
 * Budget Summary Cards Component — Catalyst V8
 * Per spec: 6px gradient top bar, hover lift effect, chevron indicator
 */

import { useState, Fragment } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatFull, type BudgetResource, type BudgetPeriod } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment, DepartmentBudget, BudgetLicense } from '@/hooks/budget/useBudgetData';

interface BudgetSummaryCardsProps {
  budget: DepartmentBudget | null;
  assignments: BudgetAssignment[];
  currentDept: string;
  licenses?: BudgetLicense[];
  licenseCount?: number;
  monthlyLicenseCost?: number;
  resources?: BudgetResource[];
  period?: BudgetPeriod;
}

type PanelType = 'insourced' | 'cosourced' | 'outsourced' | 'licenses' | null;

// V8 Color definitions
const cardColors = {
  insourced: {
    bar: 'bg-gradient-to-r from-[var(--ds-text-brand, #2563eb)] to-[var(--ds-text-brand, #3b82f6)]',
    value: 'text-[var(--ds-text-brand, #2563eb)]',
    badge: 'bg-[rgba(37,99,235,0.08)] text-[var(--ds-text-brand, #2563eb)]',
    ring: 'shadow-[0_0_0_2px_rgba(37,99,235,0.3)]'
  },
  cosourced: {
    bar: 'bg-gradient-to-r from-[#0f766e] to-[#0d9488]',
    value: 'text-[#0d9488]',
    badge: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    ring: 'shadow-[0_0_0_2px_rgba(13,148,136,0.3)]'
  },
  outsourced: {
    bar: 'bg-gradient-to-r from-[var(--ds-text-warning, #d97706)] to-[var(--ds-text-warning, #f59e0b)]',
    value: 'text-[var(--ds-text-warning, #d97706)]',
    badge: 'bg-[rgba(217,119,6,0.1)] text-[var(--ds-text-warning, #d97706)]',
    ring: 'shadow-[0_0_0_2px_rgba(217,119,6,0.3)]'
  },
  licenses: {
    bar: 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]',
    value: 'text-[#7c3aed]',
    badge: 'bg-[rgba(124,58,237,0.1)] text-[#7c3aed]',
    ring: 'shadow-[0_0_0_2px_rgba(124,58,237,0.3)]'
  }
};

export function BudgetSummaryCards({ 
  budget, 
  assignments, 
  currentDept,
  licenses = [],
  licenseCount = 0,
  monthlyLicenseCost = 0,
  resources = [],
  period = 'Full'
}: BudgetSummaryCardsProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  if (!budget) return null;

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const months = period === 'Q1' ? 3 : period === 'H1' ? 6 : 12;

  const insourcedAssignments = assignments.filter(a => 
    a.type === 'Insourced' && (currentDept === 'all' || a.department === currentDept)
  );
  const cosourcedAssignments = assignments.filter(a => 
    a.type === 'Cosourced' && (currentDept === 'all' || a.department === currentDept)
  );
  const outsourcedAssignments = assignments.filter(a => a.type === 'Outsourced');

  // Get resources for insourced assignments
  const getResourcesForAssignment = (aid: string) => {
    return resources.filter(r => r.aid === aid);
  };

  // Find next renewal
  const upcomingRenewals = licenses
    .filter(l => l.renewalDate)
    .sort((a, b) => new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime());
  const nextRenewal = upcomingRenewals[0];

  const hasUnpaid = outsourcedAssignments.some(a => a.paymentStatus === 'unpaid');
  const unpaidCount = outsourcedAssignments.filter(a => a.paymentStatus === 'unpaid').length;

  // Card component helper
  const BudgetCard = ({ 
    type, 
    value, 
    title, 
    subtitle, 
    badgeText, 
    detail,
    showUnpaid = false
  }: { 
    type: keyof typeof cardColors;
    value: number;
    title: string;
    subtitle: string;
    badgeText: string;
    detail: React.ReactNode;
    showUnpaid?: boolean;
  }) => {
    const colors = cardColors[type];
    const isActive = activePanel === type;
    
    return (
      <div 
        onClick={() => togglePanel(type)}
        className={cn(
          "relative bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5",
          isActive && colors.ring
        )}
      >
        {/* TOP COLOR BAR - 6px gradient */}
        <div className={cn("absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl", colors.bar)} />
        
        <div className="p-5 pt-6">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-4">
            {/* Label */}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {title}
            </span>
            
            {/* Badges + Chevron */}
            <div className="flex items-center gap-2">
              {/* Assignment Count Badge */}
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md", colors.badge)}>
                {badgeText}
              </span>
              
              {/* Unpaid Badge (Outsourced only) */}
              {showUnpaid && hasUnpaid && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-600 border border-red-200 animate-pulse">
                  △ {unpaidCount} Unpaid
                </span>
              )}
              
              {/* Expand Chevron */}
              {isActive ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
          
          {/* VALUE - Large, monospace */}
          <div className={cn("font-mono text-4xl font-bold mb-2", colors.value)}>
            {formatCurrency(value)}
          </div>
          
          {/* Description */}
          <div className="text-sm text-slate-500 mb-4">
            SAR • {subtitle}
          </div>
          
          {/* Divider */}
          <div className="h-px bg-slate-100 my-4" />
          
          {/* Type-specific Details */}
          <div className="text-sm text-slate-600">
            {detail}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* V8: 4-column grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Insourced Card */}
        <BudgetCard
          type="insourced"
          value={budget.insourced}
          title="Insourced"
          subtitle="CTC × Duration to Contract End"
          badgeText={`${insourcedAssignments.length} Assignment${insourcedAssignments.length !== 1 ? 's' : ''}`}
          detail={
            <>
              Variable & Freelance contracts
              <br />
              <span className="font-semibold">{budget.resources} resources</span>
            </>
          }
        />

        {/* Cosourced Card */}
        <BudgetCard
          type="cosourced"
          value={budget.cosourced}
          title="Cosourced"
          subtitle="Fixed Vendor Budget"
          badgeText={`${cosourcedAssignments.length} Assignment${cosourcedAssignments.length !== 1 ? 's' : ''}`}
          detail={
            cosourcedAssignments.length > 0 
              ? <><strong>{cosourcedAssignments[0].vendor}</strong> — {cosourcedAssignments[0].name}</>
              : 'No cosourced assignments'
          }
        />

        {/* Outsourced Card */}
        <BudgetCard
          type="outsourced"
          value={budget.outsourced}
          title="Outsourced"
          subtitle="Fixed Contract"
          badgeText={`${outsourcedAssignments.length} Assignment${outsourcedAssignments.length !== 1 ? 's' : ''}`}
          showUnpaid={true}
          detail={
            <div className="space-y-1">
              {outsourcedAssignments.slice(0, 2).map(a => (
                <div key={a.id} className="flex items-center gap-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    a.paymentStatus === 'unpaid' ? "bg-amber-500" : "bg-green-500"
                  )} />
                  <span><strong>{a.vendor}</strong> — {a.name}</span>
                </div>
              ))}
            </div>
          }
        />

        {/* Licenses Card */}
        <BudgetCard
          type="licenses"
          value={budget.licenses}
          title="Licenses"
          subtitle="Software Subscriptions"
          badgeText={`${licenseCount} Active`}
          detail={
            <div className="flex items-center justify-between">
              <span>Monthly: <strong>{formatCurrency(monthlyLicenseCost)}</strong></span>
              {nextRenewal && (
                <span className="text-xs text-[#7c3aed] font-medium">
                  Next: {new Date(nextRenewal.renewalDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* V8: Expanded Panel - Insourced - with colored border */}
      {activePanel === 'insourced' && (
        <div className="mt-4 rounded-xl border overflow-hidden border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.02)] animate-in slide-in-from-top-2 duration-200 mb-6">
          {/* Panel Header */}
          <div className="flex justify-between items-center px-5 py-3 border-b bg-[rgba(37,99,235,0.05)] border-[rgba(37,99,235,0.1)]">
            <h4 className="text-sm font-bold text-slate-700">Insourced Breakdown</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); setActivePanel(null); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="expanded-panel-body">
            {/* Get all insourced resources instead of showing by assignment */}
            {(() => {
              const insourcedResourcesList = resources.filter(r => 
                (r.resourceType === 'Variable' || r.resourceType === 'Freelance') &&
                (currentDept === 'all' || r.department === currentDept)
              ).sort((a, b) => {
                const assignmentA = a.assignmentName || '';
                const assignmentB = b.assignmentName || '';
                return assignmentA.localeCompare(assignmentB);
              });
              
              return (
            <table className="expanded-panel-table">
              <thead>
                <tr>
                  <th>RID</th>
                  <th>Resource Name</th>
                  <th>Type</th>
                  <th>Contract End</th>
                  <th>Monthly CTC</th>
                  <th>Assignment</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {insourcedResourcesList.map(r => {
                  const typeColors: Record<string, string> = {
                    'Variable': 'bg-blue-500',
                    'Fixed': 'bg-emerald-500',
                    'Freelance': 'bg-violet-500',
                    'Permanent': 'bg-slate-500'
                  };
                  const contractEndDate = r.contractEnd ? new Date(r.contractEnd) : null;
                  const isEndingSoon = contractEndDate && 
                    (contractEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90;
                  
                  return (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-[var(--budget-text-muted)]">{r.rid || '—'}</td>
                    <td className="font-medium">{r.name}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', typeColors[r.resourceType] || 'bg-slate-400')} />
                        <span className="text-xs text-[var(--budget-text-secondary)]">{r.resourceType}</span>
                      </div>
                    </td>
                    <td className={cn('text-sm', isEndingSoon ? 'text-amber-600 font-medium' : 'text-[var(--budget-text-secondary)]')}>
                      {r.contractEnd || '—'}
                      {isEndingSoon && ' ⚠️'}
                    </td>
                    <td className="right font-mono">
                      {r.ctc 
                        ? formatCurrency(r.ctc) 
                        : <span className="text-[var(--budget-danger)] text-xs font-semibold">Missing CTC</span>}
                    </td>
                    <td className="text-[var(--budget-text-secondary)]">{r.assignmentName || '—'}</td>
                    <td className="text-[var(--budget-text-secondary)]">{r.vendorName || '—'}</td>
                  </tr>
                  );
                })}
                {insourcedResourcesList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-[var(--budget-text-muted)] py-8">
                      <div className="flex flex-col items-center gap-2">
                        <X className="w-8 h-8 opacity-20" />
                        <span>No insourced resources found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* Expanded Panel: Cosourced */}
      {activePanel === 'cosourced' && (
        <div className="expanded-panel animate-in">
          <div className="expanded-panel-header">
            <h3>Cosourced Breakdown</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setActivePanel(null); }}
              className="text-[var(--budget-text-muted)] hover:text-[var(--budget-text)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="expanded-panel-body">
            {/* Section 1: Assignments */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-[var(--budget-text-secondary)] uppercase tracking-wider mb-2">
                Assignments
              </div>
            <table className="expanded-panel-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="right">Budget (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {cosourcedAssignments.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.name}</td>
                    <td>{a.vendor || '—'}</td>
                    <td>
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[11px] font-medium",
                        a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {a.status === 'in_progress' ? 'In Progress' : 
                         a.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td>
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[11px] font-medium",
                        a.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-700' :
                        a.paymentStatus === 'on_track' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {a.paymentStatus === 'not_applicable' ? 'N/A' : 
                         a.paymentStatus === 'on_track' ? 'On Track' :
                         a.paymentStatus === 'unpaid' ? 'Unpaid' : a.paymentStatus}
                      </span>
                    </td>
                    <td className="right font-mono font-semibold">{formatCurrency(a.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Section 2: Allocated Resources */}
            {(() => {
              const cosourcedAids = cosourcedAssignments.map(a => a.aid);
              const cosourcedResourcesList = resources.filter(r => 
                r.aid && cosourcedAids.includes(r.aid)
              );
              
              if (cosourcedResourcesList.length === 0) return null;
              
              return (
                <div>
                  <div className="text-xs font-semibold text-[var(--budget-text-secondary)] uppercase tracking-wider mb-2">
                    Allocated Resources ({cosourcedResourcesList.length})
                  </div>
                   <table className="expanded-panel-table">
                    <thead>
                      <tr>
                        <th>RID</th>
                        <th>Resource Name</th>
                        <th>Role</th>
                        <th>Monthly CTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cosourcedResourcesList.map(r => (
                        <tr key={r.id}>
                          <td className="font-mono text-xs text-[var(--budget-text-muted)]">{r.rid || '—'}</td>
                          <td className="font-medium">{r.name}</td>
                          <td className="text-[var(--budget-text-secondary)]">{r.role || '—'}</td>
                          <td className="right font-mono">
                            {r.ctc 
                              ? formatCurrency(r.ctc) 
                              : <span className="text-[var(--budget-danger)] text-xs font-semibold">Missing CTC</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Expanded Panel: Outsourced */}
      {activePanel === 'outsourced' && (
        <div className="expanded-panel animate-in">
          <div className="expanded-panel-header">
            <h3>Outsourced Breakdown</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setActivePanel(null); }}
              className="text-[var(--budget-text-muted)] hover:text-[var(--budget-text)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="expanded-panel-body">
            <table className="expanded-panel-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="right">Budget (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {outsourcedAssignments.map(a => (
                  <tr key={a.id} className={a.paymentStatus === 'unpaid' ? 'bg-red-50' : ''}>
                    <td className="font-medium">{a.name}</td>
                    <td>{a.vendor || '—'}</td>
                    <td>
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[11px] font-medium",
                        a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {a.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td>
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[11px] font-medium",
                        a.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-700' :
                        a.paymentStatus === 'on_track' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {a.paymentStatus === 'not_applicable' ? 'N/A' : 
                         a.paymentStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="right font-mono font-semibold">
                      {formatFull(a.budget)}
                      {a.paymentStatus === 'unpaid' && <span className="ml-1 text-red-600">⚠️</span>}
                    </td>
                  </tr>
                ))}
                {outsourcedAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-[var(--budget-text-muted)] py-8">
                      No outsourced assignments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Unpaid Total Footer */}
          {(() => {
            const unpaidTotal = outsourcedAssignments
              .filter(a => a.paymentStatus === 'unpaid')
              .reduce((sum, a) => sum + (a.budget || 0), 0);
            
            if (unpaidTotal <= 0) return null;
            
            return (
              <div className="flex justify-between items-center px-4 py-3 bg-red-50 border-t border-red-100">
                <span className="font-semibold text-red-600">Total Unpaid</span>
                <span className="font-mono text-lg font-bold text-red-600">
                  {formatFull(unpaidTotal)} SAR
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Expanded Panel: Licenses */}
      {activePanel === 'licenses' && (
        <div className="expanded-panel animate-in">
          <div className="expanded-panel-header">
            <h3>Software Licenses</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setActivePanel(null); }}
              className="text-[var(--budget-text-muted)] hover:text-[var(--budget-text)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="expanded-panel-body">
            <table className="expanded-panel-table">
              <thead>
                <tr>
                  <th>License</th>
                  <th>Type</th>
                  <th className="center">Users</th>
                  <th className="right">Monthly</th>
                  <th className="right">Annual</th>
                  <th>Renewal</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(l => {
                  const renewalDate = l.renewalDate ? new Date(l.renewalDate) : null;
                  const isExpiringSoon = renewalDate && 
                    (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90;
                  
                  return (
                    <tr key={l.id} className={isExpiringSoon ? 'bg-amber-50' : ''}>
                      <td className="font-medium">{l.name}</td>
                      <td className="text-[var(--budget-text-secondary)]">{l.licenseType}</td>
                      <td className="center">{l.userCount || '—'}</td>
                      <td className="right font-mono">{formatCurrency(l.monthlyCost)}</td>
                      <td className="right font-mono font-semibold">{formatFull(l.annualCost)}</td>
                      <td>
                        {renewalDate ? (
                          <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                            {renewalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                            {isExpiringSoon && ' ⚠️'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {licenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-[var(--budget-text-muted)] py-8">
                      No active licenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
