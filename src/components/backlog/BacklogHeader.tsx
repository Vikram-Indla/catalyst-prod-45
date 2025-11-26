import { Eye, Filter, Search, List, LayoutGrid, Circle } from 'lucide-react';
import { ViewingDropdown } from './ViewingDropdown';
import { ColumnsDropdown, ColumnConfig } from './ColumnsDropdown';
import { LabelsDropdown, LabelConfig } from './LabelsDropdown';
import { ViewingOption } from '@/types/backlog.types';

interface BacklogHeaderProps {
  viewingOptions: ViewingOption[];
  selectedViewingId: string;
  onViewingSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeView: 'list' | 'kanban' | 'unassigned';
  onViewChange: (view: 'list' | 'kanban' | 'unassigned') => void;
  columnConfig: ColumnConfig[];
  onColumnConfigChange: (config: ColumnConfig[]) => void;
  labelConfig: LabelConfig;
  onLabelConfigChange: (config: LabelConfig) => void;
}

export function BacklogHeader({
  viewingOptions,
  selectedViewingId,
  onViewingSelect,
  searchTerm,
  onSearchChange,
  activeView,
  onViewChange,
  columnConfig,
  onColumnConfigChange,
  labelConfig,
  onLabelConfigChange
}: BacklogHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE1E6] bg-white">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-[#6B778C] uppercase">Viewing:</span>
        <ViewingDropdown 
          options={viewingOptions}
          selectedId={selectedViewingId}
          onSelect={onViewingSelect}
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[#6B778C] hover:bg-[#F4F5F7] hover:text-[#172B4D] rounded transition-colors">
          <Eye className="w-4 h-4" />
          Orphan Objects
        </button>

        <ColumnsDropdown 
          columns={columnConfig}
          onChange={onColumnConfigChange}
        />

        <button className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[#6B778C] hover:bg-[#F4F5F7] hover:text-[#172B4D] rounded transition-colors">
          <Filter className="w-4 h-4" />
          Apply Filters
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[200px] pl-9 pr-3 py-2 border border-[#DFE1E6] rounded text-sm text-[#172B4D] placeholder:text-[#97A0AF] focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#DEEBFF]"
          />
        </div>

        <div className="flex border border-[#DFE1E6] rounded overflow-hidden">
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm border-r border-[#DFE1E6] transition-colors ${
              activeView === 'list' 
                ? 'bg-[#F4F5F7] text-[#172B4D] font-medium' 
                : 'bg-white text-[#6B778C] hover:bg-[#EBECF0]'
            }`}
            onClick={() => onViewChange('list')}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm border-r border-[#DFE1E6] transition-colors ${
              activeView === 'kanban' 
                ? 'bg-[#F4F5F7] text-[#172B4D] font-medium' 
                : 'bg-white text-[#6B778C] hover:bg-[#EBECF0]'
            }`}
            onClick={() => onViewChange('kanban')}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
              activeView === 'unassigned' 
                ? 'bg-[#F4F5F7] text-[#172B4D] font-medium' 
                : 'bg-white text-[#6B778C] hover:bg-[#EBECF0]'
            }`}
            onClick={() => onViewChange('unassigned')}
          >
            <Circle className="w-4 h-4" />
            Unassigned Backlog
          </button>
        </div>
      </div>
    </div>
  );
}