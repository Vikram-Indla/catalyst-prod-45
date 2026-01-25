/**
 * Budget Summary Cards Component
 * STAGE 3: Expandable panels with breakdown tables
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

export function BudgetSummaryCards({ 
  budget, 
  assignments, 
  currentDept,
  licenses = [],
  licenseCount = 0,
  monthlyLicenseCost = 0,
  resources = [],
  period = 'H1'
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

  return (
    <>
      <div className="summary-row four-cols">
        {/* Insourced Card */}
        <div 
          className={cn(
            "summary-card insourced cursor-pointer transition-all",
            activePanel === 'insourced' && "ring-2 ring-[var(--budget-insourced)]"
          )}
          onClick={() => togglePanel('insourced')}
        >
          <div className="summary-header">
            <span className="summary-title">Insourced</span>
            <div className="flex items-center gap-2">
              <span className="summary-badge insourced">{insourcedAssignments.length} Assignments</span>
              {activePanel === 'insourced' ? 
                <ChevronUp className="w-4 h-4 text-[var(--budget-insourced)]" /> : 
                <ChevronDown className="w-4 h-4 text-[var(--budget-text-muted)]" />
              }
            </div>
          </div>
          <div className="summary-value insourced">{formatCurrency(budget.insourced)}</div>
          <div className="summary-sub">SAR • CTC × Duration to Contract End</div>
          <div className="summary-detail">Variable & Freelance contracts • {budget.resources} resources</div>
        </div>

        {/* Cosourced Card */}
        <div 
          className={cn(
            "summary-card cosourced cursor-pointer transition-all",
            activePanel === 'cosourced' && "ring-2 ring-[var(--budget-cosourced)]"
          )}
          onClick={() => togglePanel('cosourced')}
        >
          <div className="summary-header">
            <span className="summary-title">Cosourced</span>
            <div className="flex items-center gap-2">
              <span className="summary-badge cosourced">{cosourcedAssignments.length} Assignment{cosourcedAssignments.length !== 1 ? 's' : ''}</span>
              {activePanel === 'cosourced' ? 
                <ChevronUp className="w-4 h-4 text-[var(--budget-cosourced)]" /> : 
                <ChevronDown className="w-4 h-4 text-[var(--budget-text-muted)]" />
              }
            </div>
          </div>
          <div className="summary-value cosourced">{formatCurrency(budget.cosourced)}</div>
          <div className="summary-sub">SAR • Fixed Vendor Budget</div>
          <div className="summary-detail">
            {cosourcedAssignments.length > 0 
              ? <><strong>{cosourcedAssignments[0].vendor}</strong> — {cosourcedAssignments[0].name}</>
              : 'No cosourced assignments'}
          </div>
        </div>

        {/* Outsourced Card */}
        <div 
          className={cn(
            "summary-card outsourced cursor-pointer transition-all",
            activePanel === 'outsourced' && "ring-2 ring-[var(--budget-outsourced)]"
          )}
          onClick={() => togglePanel('outsourced')}
        >
          <div className="summary-header">
            <span className="summary-title">Outsourced</span>
            <div className="flex items-center gap-2">
              <span className="summary-badge outsourced">{outsourcedAssignments.length} Assignments</span>
              {activePanel === 'outsourced' ? 
                <ChevronUp className="w-4 h-4 text-[var(--budget-outsourced)]" /> : 
                <ChevronDown className="w-4 h-4 text-[var(--budget-text-muted)]" />
              }
            </div>
          </div>
          <div className="summary-value outsourced">{formatCurrency(budget.outsourced)}</div>
          <div className="summary-sub">SAR • Fixed Contract</div>
          <div className="summary-detail">
            {outsourcedAssignments.slice(0, 2).map(a => (
              <div key={a.id} className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--budget-outsourced)]" />
                <span><strong>{a.vendor}</strong> — {a.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Licenses Card */}
        <div 
          className={cn(
            "summary-card licenses cursor-pointer transition-all",
            activePanel === 'licenses' && "ring-2 ring-[var(--budget-licenses)]"
          )}
          onClick={() => togglePanel('licenses')}
        >
          <div className="summary-header">
            <span className="summary-title">Licenses</span>
            <div className="flex items-center gap-2">
              <span className="summary-badge licenses">{licenseCount} Active</span>
              {activePanel === 'licenses' ? 
                <ChevronUp className="w-4 h-4 text-[var(--budget-licenses)]" /> : 
                <ChevronDown className="w-4 h-4 text-[var(--budget-text-muted)]" />
              }
            </div>
          </div>
          <div className="summary-value licenses">{formatCurrency(budget.licenses)}</div>
          <div className="summary-sub">SAR • Software Subscriptions</div>
          <div className="summary-detail">
            <div className="flex items-center justify-between">
              <span>Monthly: <strong>{formatCurrency(monthlyLicenseCost)}</strong></span>
              {nextRenewal && (
                <span className="text-[10px] text-[var(--budget-warning)]">
                  Next: {new Date(nextRenewal.renewalDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Panel: Insourced */}
      {activePanel === 'insourced' && (
        <div className="expanded-panel animate-in slide-in-from-top-2">
          <div className="expanded-panel-header">
            <h3>Insourced Breakdown</h3>
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
                  <th>Department</th>
                  <th className="center">Resources</th>
                  <th className="right">Monthly CTC</th>
                  <th className="right">{period} Total</th>
                </tr>
              </thead>
              <tbody>
                {insourcedAssignments.map(a => {
                  const assignmentResources = getResourcesForAssignment(a.aid);
                  const monthlyCTC = assignmentResources.reduce((sum, r) => sum + (r.ctc || 0), 0);
                  return (
                    <tr key={a.id}>
                      <td className="font-medium">{a.name}</td>
                      <td className="text-[var(--budget-text-secondary)]">{a.department}</td>
                      <td className="center">{assignmentResources.length}</td>
                      <td className="right font-mono">{formatCurrency(monthlyCTC)}</td>
                      <td className="right font-mono font-semibold">{formatCurrency(monthlyCTC * months)}</td>
                    </tr>
                  );
                })}
                {insourcedAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-[var(--budget-text-muted)] py-8">
                      No insourced assignments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Panel: Cosourced */}
      {activePanel === 'cosourced' && (
        <div className="expanded-panel animate-in slide-in-from-top-2">
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
                    <td className="right font-mono font-semibold">{formatFull(a.budget)}</td>
                  </tr>
                ))}
                {cosourcedAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-[var(--budget-text-muted)] py-8">
                      No cosourced assignments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Panel: Outsourced */}
      {activePanel === 'outsourced' && (
        <div className="expanded-panel animate-in slide-in-from-top-2">
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
        </div>
      )}

      {/* Expanded Panel: Licenses */}
      {activePanel === 'licenses' && (
        <div className="expanded-panel animate-in slide-in-from-top-2">
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
