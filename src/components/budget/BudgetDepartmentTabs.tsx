/**
 * Budget Department Tabs Component — Catalyst V8
 * Per spec: Active card has gradient bg + left accent bar
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
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Filter by Department
      </div>
      
      {/* V8: 6-column grid with proper sizing */}
      <div className="grid grid-cols-6 gap-3 w-full">
        {departments.map(d => {
          const budget = budgets[d.id];
          
          if (!budget) return null;
          
          const isActive = currentDept === d.id;
          const hasBudget = budget.total > 0;
          
          return (
            <button
              key={d.id}
              className={cn(
                "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-150 text-center",
                // Active state with gradient + left accent
                isActive && [
                  "border-[var(--ds-text-brand, #2563eb)]",
                  "bg-gradient-to-br from-[rgba(37,99,235,0.05)] via-[rgba(37,99,235,0.08)] to-[rgba(37,99,235,0.05)]",
                  "shadow-sm"
                ],
                // Inactive with budget
                !isActive && hasBudget && [
                  "border-slate-200 bg-white",
                  "hover:border-[rgba(37,99,235,0.5)]",
                  "hover:shadow-sm"
                ],
                // Inactive no budget (muted)
                !isActive && !hasBudget && [
                  "border-slate-200 bg-slate-50/50",
                  "hover:border-slate-300"
                ]
              )}
              onClick={() => onSelect(d.id)}
            >
              {/* Left accent bar - ONLY for active */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[var(--ds-text-brand, #2563eb)] rounded-full" />
              )}
              
              {/* Department Name */}
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider mb-2",
                isActive ? "text-[var(--ds-text-brand, #2563eb)]" : "text-slate-500"
              )}>
                {d.name}
              </span>
              
              {/* Budget Value - MUST use font-mono */}
              <span className={cn(
                "font-mono text-2xl font-bold mb-2",
                isActive ? "text-[var(--ds-text-brand, #2563eb)]" : hasBudget ? "text-slate-800" : "text-slate-400"
              )}>
                {hasBudget ? formatCurrency(budget.total) : '0'}
              </span>
              
              {/* Resource Count + Warning */}
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className={cn(
                  isActive ? "text-[rgba(37,99,235,0.7)]" : "text-slate-500"
                )}>
                  {budget.resources} resources
                </span>
                {budget.dataIssues > 0 && (
                  <span className="font-semibold text-amber-600">
                    • △{budget.dataIssues}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
