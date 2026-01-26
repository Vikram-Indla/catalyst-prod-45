/**
 * Filter Pills Bar
 * Filter resources by department
 * Matches Utilization tab order and styling
 */

import { cn } from '@/lib/utils';
import type { ContractFilter } from '@/types/contract-horizon';

interface FilterBarProps {
  filter: ContractFilter;
  onFilterChange: (filter: ContractFilter) => void;
  counts: {
    total: number;
    delivery: number;
    product: number;
    operations: number;
    technical_support: number;
    governance: number;
  };
}

export function FilterBar({ filter, onFilterChange, counts }: FilterBarProps) {
  // Ordered to match Utilization tab: All, Delivery, Product, Operations, Technical Support, Governance
  const filters: { id: ContractFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Departments', count: counts.total },
    { id: 'delivery', label: 'Delivery', count: counts.delivery },
    { id: 'product', label: 'Product', count: counts.product },
    { id: 'operations', label: 'Operations', count: counts.operations },
    { id: 'technical_support', label: 'Technical Support', count: counts.technical_support },
    { id: 'governance', label: 'Governance', count: counts.governance },
  ];

  return (
    <div className="analytics-dept-filters">
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
