import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuickFilter {
  key: string;
  label: string;
  count?: number;
}

interface QuickFiltersBarProps {
  filters: QuickFilter[];
  activeFilter: string | null;
  onFilterChange: (filterKey: string | null) => void;
}

export function QuickFiltersBar({ filters, activeFilter, onFilterChange }: QuickFiltersBarProps) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border mb-4 overflow-x-auto">
      <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">
        Quick filters:
      </span>
      
      <Button
        variant={activeFilter === null ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onFilterChange(null)}
      >
        All
      </Button>
      
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className="gap-1"
        >
          {filter.label}
          {filter.count !== undefined && (
            <Badge 
              variant={activeFilter === filter.key ? 'secondary' : 'outline'}
              className="ml-1 text-[11px] px-1.5 py-0"
            >
              {filter.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}

export default QuickFiltersBar;
