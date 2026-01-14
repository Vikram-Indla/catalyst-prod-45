import { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { DefectTableRow } from './DefectTableRow';
import { Skeleton } from '@/components/ui/skeleton';
import type { DefectSummary, DefectStatus } from '@/types/defect.types';

interface DefectTableProps {
  defects: DefectSummary[];
  isLoading: boolean;
  selectedIds: string[];
  focusIndex: number;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onRowClick: (id: string) => void;
  onStatusChange: (id: string, status: DefectStatus) => void;
}

export const DefectTable = memo(function DefectTable({
  defects,
  isLoading,
  selectedIds,
  focusIndex,
  onToggleSelect,
  onSelectAll,
  onRowClick,
  onStatusChange,
}: DefectTableProps) {
  const allSelected = defects.length > 0 && selectedIds.length === defects.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < defects.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(defects.map(d => d.id));
    }
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50">
          <div className="grid grid-cols-[40px_90px_1fr_100px_110px_120px_100px_80px_50px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div />
            <div>ID</div>
            <div>Title</div>
            <div>Severity</div>
            <div>Status</div>
            <div>Assignee</div>
            <div>Component</div>
            <div>Age</div>
            <div />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[40px_90px_1fr_100px_110px_120px_100px_80px_50px] gap-2 px-3 py-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
              <div />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (defects.length === 0) {
    return (
      <div className="border border-border rounded-lg p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No defects found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new defect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <th className="w-10 px-3 py-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected ? 'data-[state=checked]:bg-primary' : ''}
              />
            </th>
            <th className="w-[90px] px-2 py-2 text-left">ID</th>
            <th className="px-2 py-2 text-left">Title</th>
            <th className="w-[100px] px-2 py-2 text-left">Severity</th>
            <th className="w-[110px] px-2 py-2 text-left">Status</th>
            <th className="w-[120px] px-2 py-2 text-left">Assignee</th>
            <th className="w-[100px] px-2 py-2 text-left">Component</th>
            <th className="w-[80px] px-2 py-2 text-left">Age</th>
            <th className="w-[50px] px-2 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {defects.map((defect, index) => (
            <DefectTableRow
              key={defect.id}
              defect={defect}
              isSelected={selectedIds.includes(defect.id)}
              isFocused={focusIndex === index}
              onSelect={() => onToggleSelect(defect.id)}
              onClick={() => onRowClick(defect.id)}
              onStatusChange={(status) => onStatusChange(defect.id, status)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
