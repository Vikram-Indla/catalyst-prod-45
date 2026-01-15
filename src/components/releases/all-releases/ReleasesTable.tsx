// =====================================================
// RELEASES TABLE COMPONENT
// Main data table for All Releases page
// =====================================================

import { Release, ReleasesSort } from '@/types/releases';
import { ReleasesTableRow } from './ReleasesTableRow';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  releases: Release[];
  sort: ReleasesSort;
  onSort: (sort: ReleasesSort) => void;
  selected: Set<string>;
  onToggleSelect: (id: string, index: number, shiftKey: boolean) => void;
  onToggleSelectAll: () => void;
  selectAllState: 'none' | 'some' | 'all';
}

export function ReleasesTable({
  releases, sort, onSort, selected, onToggleSelect, onToggleSelectAll, selectAllState
}: Props) {
  
  const handleSort = (column: ReleasesSort['column']) => {
    onSort({
      column,
      direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };
  
  const SortHeader = ({ column, children, className }: { column: ReleasesSort['column']; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => handleSort(column)}
      className={cn(
        "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
        sort.column === column ? "text-primary" : "text-slate-500 hover:text-slate-700",
        className
      )}
    >
      {children}
      {sort.column === column && (
        sort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      )}
    </button>
  );
  
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div 
        className="grid gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200"
        style={{ gridTemplateColumns: '40px 1.5fr 100px 110px 80px 80px 80px 80px 80px 70px' }}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selectAllState === 'all'}
            // @ts-expect-error - indeterminate is valid but not in types
            indeterminate={selectAllState === 'some'}
            onCheckedChange={onToggleSelectAll}
          />
        </div>
        <SortHeader column="name">Release</SortHeader>
        <SortHeader column="status">Status</SortHeader>
        <SortHeader column="progress">Progress</SortHeader>
        <span className="text-xs font-bold uppercase text-slate-500 text-center">Tests</span>
        <span className="text-xs font-bold uppercase text-slate-500 text-center">Defects</span>
        <span className="text-xs font-bold uppercase text-slate-500 text-center">Coverage</span>
        <SortHeader column="health">Health</SortHeader>
        <SortHeader column="target_date">Days</SortHeader>
        <span className="text-xs font-bold uppercase text-slate-500 text-center">Owner</span>
      </div>
      
      {/* Body */}
      <div>
        {releases.map((release, index) => (
          <ReleasesTableRow
            key={release.id}
            release={release}
            index={index}
            isSelected={selected.has(release.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}
