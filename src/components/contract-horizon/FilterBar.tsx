/**
 * Filter Pills Bar
 * Filter resources by department/status
 * Catalyst V8 ring-fenced design
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
    <div className="analytics-dept-filters mb-4">
      {filters.map(f => (
        <button
          key={f.id}
          onClick={() => onFilterChange(f.id)}
          className={cn(
            'analytics-dept-pill',
            filter === f.id && 'active'
          )}
        >
          {f.label} ({f.count})
        </button>
      ))}
    </div>
  );
}
