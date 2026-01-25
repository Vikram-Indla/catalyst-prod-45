/**
 * Budget Summary Cards Component
 */

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/hooks/budget/useBudgetData';
import type { BudgetAssignment, DepartmentBudget } from '@/hooks/budget/useBudgetData';

interface BudgetSummaryCardsProps {
  budget: DepartmentBudget | null;
  assignments: BudgetAssignment[];
  currentDept: string;
}

export function BudgetSummaryCards({ budget, assignments, currentDept }: BudgetSummaryCardsProps) {
  if (!budget) return null;

  const insourcedAssignments = assignments.filter(a => 
    a.type === 'Insourced' && (currentDept === 'all' || a.department === currentDept)
  );
  const cosourcedAssignments = assignments.filter(a => 
    a.type === 'Cosourced' && (currentDept === 'all' || a.department === currentDept)
  );
  const outsourcedAssignments = assignments.filter(a => a.type === 'Outsourced');

  return (
    <div className="summary-row">
      {/* Insourced Card */}
      <div className="summary-card insourced">
        <div className="summary-header">
          <span className="summary-title">Insourced</span>
          <span className="summary-badge insourced">{insourcedAssignments.length} Assignments</span>
        </div>
        <div className="summary-value insourced">{formatCurrency(budget.insourced)}</div>
        <div className="summary-sub">SAR • CTC × Duration to Contract End</div>
        <div className="summary-detail">Variable & Freelance contracts • {budget.resources} resources</div>
      </div>

      {/* Cosourced Card */}
      <div className="summary-card cosourced">
        <div className="summary-header">
          <span className="summary-title">Cosourced</span>
          <span className="summary-badge cosourced">{cosourcedAssignments.length} Assignment{cosourcedAssignments.length !== 1 ? 's' : ''}</span>
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
      <div className="summary-card outsourced">
        <div className="summary-header">
          <span className="summary-title">Outsourced</span>
          <span className="summary-badge outsourced">{outsourcedAssignments.length} Assignments</span>
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
    </div>
  );
}
