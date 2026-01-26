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
    <div className="w-full mb-6">
      <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">
        Filter by Department
      </div>
      
      {/* PART 1: Full-width grid with 7 columns */}
      <div className="grid grid-cols-7 gap-3 w-full">
        {departments.map(d => {
          const budget = budgets[d.id];
          
          if (!budget) return null;
          
          return (
            <button
              key={d.id}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                currentDept === d.id
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
              )}
              onClick={() => onSelect(d.id)}
            >
              <span className={cn(
                "text-xs font-semibold",
                currentDept === d.id ? "text-blue-700" : "text-slate-600"
              )}>
                {d.name}
              </span>
              <span className={cn(
                "text-xl font-bold font-mono mt-1",
                currentDept === d.id ? "text-blue-600" : "text-slate-900"
              )}>
                {formatCurrency(budget.total)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                {budget.resources} resources
                {budget.dataIssues > 0 && (
                  <span className="text-amber-600 ml-1 font-semibold">
                    • ⚠{budget.dataIssues}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
