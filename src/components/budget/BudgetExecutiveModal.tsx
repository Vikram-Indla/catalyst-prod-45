/**
 * Budget Executive Summary Modal
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatFull } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment, DepartmentBudget } from '@/hooks/budget/useBudgetData';

interface BudgetExecutiveModalProps {
  open: boolean;
  onClose: () => void;
  data: {
    assignments: BudgetAssignment[];
    departments: Record<string, DepartmentBudget>;
    dataQualityIssues: { name: string; department: string; issue: string }[];
  } | undefined;
}

// Departments will be derived dynamically from data

export function BudgetExecutiveModal({ open, onClose, data }: BudgetExecutiveModalProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [execDept, setExecDept] = useState('all');
  const [execTypeFilter, setExecTypeFilter] = useState<string | null>(null);

  if (!open || !data) return null;

  // Derive departments dynamically from actual data
  const departments = [
    { id: 'all', name: 'All Departments' },
    ...Object.keys(data.departments)
      .filter(k => k !== 'all')
      .map(k => ({ 
        id: k, 
        name: k === 'Technical Support' ? 'Tech Support' : k 
      }))
  ];

  const budget = data.departments[execDept] || data.departments.all;
  const unpaidAssignments = data.assignments.filter(a => a.paymentStatus === 'Unpaid');
  const unpaidTotal = unpaidAssignments.reduce((s, a) => s + a.budget, 0);
  const cosourcedAssignments = data.assignments.filter(a => a.type === 'Cosourced');
  const outsourcedAssignments = data.assignments.filter(a => a.type === 'Outsourced');

  const nextSlide = () => setCurrentSlide(s => Math.min(s + 1, 4));
  const prevSlide = () => setCurrentSlide(s => Math.max(s - 1, 1));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Executive Budget Summary — <span className="text-[var(--budget-text-muted)]">H1 2026</span></h2>
          <button 
            className="w-8 h-8 rounded-lg bg-[var(--budget-bg)] flex items-center justify-center hover:bg-[var(--budget-border)]"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-[var(--budget-text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Department Selector - Dynamic from DB */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {departments.map(d => (
              <button
                key={d.id}
                className={cn(
                  "px-4 py-2 text-[13px] font-medium rounded-lg border transition-all",
                  execDept === d.id 
                    ? "bg-[var(--budget-primary)] border-[var(--budget-primary)] text-white"
                    : "bg-[var(--budget-bg)] border-[var(--budget-border)] text-[var(--budget-text-secondary)] hover:border-[var(--budget-primary)]"
                )}
                onClick={() => setExecDept(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* Slide 1: Portfolio Overview */}
          {currentSlide === 1 && (
            <div>
              <h3 className="text-[22px] font-bold mb-2">Portfolio Budget Overview</h3>
              <p className="text-[13px] text-[var(--budget-text-muted)] mb-6">
                Total budget requirement — {execDept === 'all' ? 'All Departments' : execDept}
              </p>

              {/* Unpaid Alert - Show for all or when outsourced unpaid exists */}
              {unpaidAssignments.length > 0 && execDept === 'all' && (
                <div className="exec-alert">
                  <div className="exec-alert-title">
                    ⚠️ CRITICAL: SAR {formatFull(unpaidTotal)} Unpaid — Completed Outsourced
                  </div>
                  <div className="exec-alert-items">
                    {unpaidAssignments.map(a => (
                      <div key={a.id} className="exec-alert-item">
                        <div>
                          <div className="text-[13px] font-semibold">{a.name}</div>
                          <div className="text-[11px] text-[var(--budget-text-muted)]">Vendor: {a.vendor}</div>
                        </div>
                        <div className="exec-alert-item-amount">{formatFull(a.budget)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Grid */}
              <div className="exec-summary-grid">
                <div 
                  className={cn('exec-summary-item', execTypeFilter === 'insourced' && 'active')}
                  onClick={() => setExecTypeFilter(execTypeFilter === 'insourced' ? null : 'insourced')}
                >
                  <h3>Insourced</h3>
                  <div className="value" style={{ color: 'var(--budget-insourced)' }}>{formatCurrency(budget.insourced)}</div>
                  <div className="text-[12px] text-[var(--budget-text-muted)] mt-1">{budget.resources} resources • CTC × Duration</div>
                  {budget.dataIssues > 0 && (
                    <div className="text-[12px] text-[var(--budget-warning)] mt-1">⚠️ {budget.dataIssues} missing CTC</div>
                  )}
                </div>
                <div 
                  className={cn('exec-summary-item', execTypeFilter === 'cosourced' && 'active')}
                  onClick={() => setExecTypeFilter(execTypeFilter === 'cosourced' ? null : 'cosourced')}
                >
                  <h3>Cosourced</h3>
                  <div className="value" style={{ color: 'var(--budget-cosourced)' }}>{formatCurrency(budget.cosourced)}</div>
                  <div className="text-[12px] text-[var(--budget-text-muted)] mt-1">Fixed Vendor Budget</div>
                  <div className="mt-3 text-left">
                    {cosourcedAssignments.map(a => (
                      <div key={a.id} className="flex justify-between text-[11px] py-1 border-b border-[var(--budget-border-light)] last:border-0">
                        <span>{a.vendor} — {a.name}</span>
                        <span style={{ fontFamily: 'var(--budget-font-mono)' }}>{formatCurrency(a.budget)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div 
                  className={cn('exec-summary-item', execTypeFilter === 'outsourced' && 'active')}
                  onClick={() => setExecTypeFilter(execTypeFilter === 'outsourced' ? null : 'outsourced')}
                >
                  <h3>Outsourced</h3>
                  <div className="value" style={{ color: 'var(--budget-outsourced)' }}>{formatCurrency(budget.outsourced)}</div>
                  <div className="text-[12px] text-[var(--budget-text-muted)] mt-1">Fixed Contract</div>
                  <div className="mt-3 text-left">
                    {outsourcedAssignments.map(a => (
                      <div key={a.id} className="flex justify-between text-[11px] py-1 border-b border-[var(--budget-border-light)] last:border-0">
                        <span>{a.vendor} — {a.name}</span>
                        <span style={{ 
                          fontFamily: 'var(--budget-font-mono)',
                          color: a.paymentStatus === 'Unpaid' ? 'var(--budget-danger)' : 'inherit'
                        }}>
                          {formatCurrency(a.budget)}{a.paymentStatus === 'Unpaid' ? ' ⚠️' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 2: Department Breakdown */}
          {currentSlide === 2 && (
            <div>
              <h3 className="text-[22px] font-bold mb-2">Department Budget Breakdown</h3>
              <p className="text-[13px] text-[var(--budget-text-muted)] mb-6">
                Comparative view across all departments
              </p>

              <div className="space-y-3">
                {departments.filter(d => d.id !== 'all').map(d => {
                  const b = data.departments[d.id];
                  if (!b) return null;
                  const maxTotal = Math.max(...departments.filter(x => x.id !== 'all').map(x => data.departments[x.id]?.total || 0));
                  const barWidth = maxTotal > 0 ? (b.total / maxTotal * 100) : 0;
                  const pI = b.total > 0 ? (b.insourced / b.total * 100) : 0;
                  const pC = b.total > 0 ? (b.cosourced / b.total * 100) : 0;
                  const pO = b.total > 0 ? (b.outsourced / b.total * 100) : 0;

                  return (
                    <div key={d.id} className="flex items-center p-3 border-b border-[var(--budget-border-light)]">
                      <span className="w-[120px] font-semibold text-[13px]">{d.name}</span>
                      <div 
                        className="flex-1 h-7 bg-[var(--budget-bg)] rounded-md overflow-hidden flex mx-4"
                        style={{ width: `${barWidth}%` }}
                      >
                        {pI > 0 && <div style={{ width: `${pI}%`, background: 'var(--budget-insourced)' }} />}
                        {pC > 0 && <div style={{ width: `${pC}%`, background: 'var(--budget-cosourced)' }} />}
                        {pO > 0 && <div style={{ width: `${pO}%`, background: 'var(--budget-outsourced)' }} />}
                      </div>
                      <span className="w-[90px] text-right font-bold font-mono text-[14px]">{formatCurrency(b.total)}</span>
                      <span className="w-[80px] text-right text-[12px] text-[var(--budget-text-muted)]">
                        {b.resources} res{b.dataIssues > 0 ? ' ⚠️' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-[var(--budget-warning-light)] rounded-lg">
                <div className="text-[12px] font-semibold text-[#92400e] mb-1">⚠️ Data Quality Note</div>
                <div className="text-[12px] text-[#78350f]">
                  Only Delivery department has complete CTC data. Other departments show SAR 0 due to missing salary information.
                </div>
              </div>
            </div>
          )}

          {/* Slide 3: Forecast */}
          {currentSlide === 3 && (
            <div>
              <h3 className="text-[22px] font-bold mb-2">Budget Forecast</h3>
              <p className="text-[13px] text-[var(--budget-text-muted)] mb-6">
                Projected spending for H1 2026
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[var(--budget-bg)] rounded-xl p-5 text-center">
                  <div className="text-[12px] text-[var(--budget-text-muted)] mb-2">Jan 2026 Consumed</div>
                  <div className="text-[28px] font-bold font-mono" style={{ color: 'var(--budget-success)' }}>
                    {formatCurrency(budget.insourced / 4)}
                  </div>
                </div>
                <div className="bg-[var(--budget-bg)] rounded-xl p-5 text-center">
                  <div className="text-[12px] text-[var(--budget-text-muted)] mb-2">Remaining (Feb+)</div>
                  <div className="text-[28px] font-bold font-mono" style={{ color: 'var(--budget-primary)' }}>
                    {formatCurrency(budget.insourced * 0.75)}
                  </div>
                </div>
                <div className="bg-[var(--budget-bg)] rounded-xl p-5 text-center">
                  <div className="text-[12px] text-[var(--budget-text-muted)] mb-2">Total 2026 Commitment</div>
                  <div className="text-[28px] font-bold font-mono">
                    {formatCurrency(budget.total)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 4: Recommendations */}
          {currentSlide === 4 && (
            <div>
              <h3 className="text-[22px] font-bold mb-2">Recommendations & Data Quality</h3>
              <p className="text-[13px] text-[var(--budget-text-muted)] mb-6">
                Action items and data quality summary
              </p>

              <div className="bg-[var(--budget-bg)] rounded-xl p-5 mb-4">
                <h4 className="text-[14px] font-semibold mb-3">🔴 Immediate Actions</h4>
                <ul className="space-y-2 text-[13px] text-[var(--budget-text-secondary)] pl-5 list-disc">
                  <li><strong>Process vendor payments:</strong> SAR {formatFull(unpaidTotal)} outstanding to {unpaidAssignments.map(a => a.vendor).join(' and ')} for completed projects</li>
                  <li><strong>Complete CTC data entry:</strong> {data.dataQualityIssues.length} resources missing salary data</li>
                </ul>
              </div>

              <div className="bg-[var(--budget-danger-light)] rounded-xl p-5">
                <h4 className="text-[14px] font-semibold text-[#991b1b] mb-3">⚠️ Data Quality Issues ({data.dataQualityIssues.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {data.dataQualityIssues.slice(0, 8).map((issue, idx) => (
                    <div key={idx} className="text-[12px] text-[#78350f] p-2 bg-white rounded-md">
                      <strong>{issue.name}</strong> ({issue.department})
                      <br />
                      <span className="text-[10px]">{issue.issue}</span>
                    </div>
                  ))}
                  {data.dataQualityIssues.length > 8 && (
                    <div className="text-[12px] text-[#78350f] p-2">
                      +{data.dataQualityIssues.length - 8} more...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="slide-nav">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                className={cn('slide-dot', currentSlide === n && 'active')}
                onClick={() => setCurrentSlide(n)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentSlide === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button size="sm" onClick={currentSlide < 4 ? nextSlide : onClose}>
              {currentSlide < 4 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
