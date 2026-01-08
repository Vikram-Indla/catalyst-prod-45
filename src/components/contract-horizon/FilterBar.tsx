/**
 * Filter Pills Bar
 * Filter resources by department/status
 */

import { cn } from '@/lib/utils';
import type { ContractFilter } from '@/types/contract-horizon';

interface FilterBarProps {
  filter: ContractFilter;
  onFilterChange: (filter: ContractFilter) => void;
  counts: {
    total: number;
    critical: number;
    delivery: number;
    product: number;
    operations: number;
    support: number;
  };
}

export function FilterBar({ filter, onFilterChange, counts }: FilterBarProps) {
  const filters: { id: ContractFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'critical', label: 'Critical', count: counts.critical },
    { id: 'delivery', label: 'Delivery', count: counts.delivery },
    { id: 'product', label: 'Product', count: counts.product },
    { id: 'operations', label: 'Operations', count: counts.operations },
    { id: 'support', label: 'Support', count: counts.support },
  ];

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
        Filter by:
      </span>
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "h-8 px-3.5 rounded-full text-[12px] font-medium border transition-all duration-150",
              filter === f.id
                ? "bg-[#2563eb] border-[#2563eb] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                : "bg-card border-border text-muted-foreground hover:border-[#2563eb] hover:text-[#2563eb]"
            )}
          >
            {f.label} <span className="font-bold">({f.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
