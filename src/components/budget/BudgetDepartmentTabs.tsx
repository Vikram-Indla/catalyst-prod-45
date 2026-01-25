/**
 * Budget Department Tabs Component
 */

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/hooks/budget/useBudgetData';
import type { DepartmentBudget } from '@/hooks/budget/useBudgetData';

interface Department {
  id: string;
  name: string;
}

interface BudgetDepartmentTabsProps {
  departments: Department[];
  currentDept: string;
  budgets: Record<string, DepartmentBudget>;
  onSelect: (dept: string) => void;
}

export function BudgetDepartmentTabs({ departments, currentDept, budgets, onSelect }: BudgetDepartmentTabsProps) {
  return (
    <div className="dept-filter">
      <div className="dept-label">Filter by Department</div>
      <div className="dept-tabs">
        {departments.map(d => {
          const budget = budgets[d.id];
          // External department shows outsourced data from 'all'
          if (d.id === 'External') {
            const outsourcedTotal = budgets.all?.outsourced || 0;
            return (
              <button
                key={d.id}
                className={cn('dept-tab', currentDept === d.id && 'active')}
                onClick={() => onSelect(d.id)}
              >
                <div className="dept-tab-name">{d.name}</div>
                <div className="dept-tab-amount">{formatCurrency(outsourcedTotal)}</div>
                <div className="dept-tab-count">Outsourced vendors</div>
              </button>
            );
          }
          
          if (!budget) return null;
          
          return (
            <button
              key={d.id}
              className={cn('dept-tab', currentDept === d.id && 'active')}
              onClick={() => onSelect(d.id)}
            >
              <div className="dept-tab-name">{d.name}</div>
              <div className="dept-tab-amount">{formatCurrency(budget.total)}</div>
              <div className="dept-tab-count">
                {budget.resources} resources
                {budget.dataIssues > 0 && ` • ⚠️${budget.dataIssues}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
