// ==============================================
// IDEATION HEADER COMPONENT
// Based on Jira Align Ideation screenshots
// ==============================================

import { Filter, BarChart3, Settings, Kanban, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IdeaGroup, IdeaStatus, IdeaSortField, SortDirection } from '@/types/ideation';

interface IdeationHeaderProps {
  groups: IdeaGroup[];
  selectedGroupId: string | null;
  onGroupChange: (groupId: string) => void;
  sortField: IdeaSortField;
  sortDirection: SortDirection;
  onSortChange: (field: IdeaSortField, direction: SortDirection) => void;
  statusFilter: IdeaStatus[];
  onStatusFilterChange: (statuses: IdeaStatus[]) => void;
  totalCount: number;
  filteredCount: number;
  onOpenFilters: () => void;
  onOpenMetrics: () => void;
  onOpenSetup: () => void;
  onOpenManageBacklog: () => void;
  onAddIdea: () => void;
}

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Create Date Descending' },
  { value: 'created_at-asc', label: 'Create Date Ascending' },
  { value: 'vote_score-desc', label: 'Vote Score Descending' },
  { value: 'vote_score-asc', label: 'Vote Score Ascending' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All States' },
  { value: 'new-open', label: 'New / Open' },
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'shelved', label: 'Shelved' },
];

export function IdeationHeader({
  groups,
  selectedGroupId,
  onGroupChange,
  sortField,
  sortDirection,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
  onOpenFilters,
  onOpenMetrics,
  onOpenSetup,
  onOpenManageBacklog,
  onAddIdea,
}: IdeationHeaderProps) {
  const handleSortChange = (value: string) => {
    const [field, direction] = value.split('-') as [IdeaSortField, SortDirection];
    onSortChange(field, direction);
  };

  const handleStatusChange = (value: string) => {
    switch (value) {
      case 'all':
        onStatusFilterChange([]);
        break;
      case 'new-open':
        onStatusFilterChange(['New', 'Open']);
        break;
      case 'new':
        onStatusFilterChange(['New']);
        break;
      case 'open':
        onStatusFilterChange(['Open']);
        break;
      case 'planned':
        onStatusFilterChange(['Planned']);
        break;
      case 'completed':
        onStatusFilterChange(['Completed']);
        break;
      case 'shelved':
        onStatusFilterChange(['Shelved']);
        break;
    }
  };

  const getStatusFilterValue = () => {
    if (statusFilter.length === 0) return 'all';
    if (statusFilter.length === 2 && statusFilter.includes('New') && statusFilter.includes('Open')) {
      return 'new-open';
    }
    if (statusFilter.length === 1) return statusFilter[0].toLowerCase();
    return 'all';
  };

  const getStatusFilterLabel = () => {
    const value = getStatusFilterValue();
    const option = STATUS_FILTER_OPTIONS.find(o => o.value === value);
    const count = statusFilter.length > 0 ? filteredCount : totalCount;
    return `${option?.label || 'All States'} (${count})`;
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Title and Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium">Ideation for</span>
          <Select value={selectedGroupId || ''} onValueChange={onGroupChange}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onOpenFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenMetrics}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Key Metrics
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenSetup}>
            <Settings className="h-4 w-4 mr-2" />
            Setup
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenManageBacklog}>
            <Kanban className="h-4 w-4 mr-2" />
            Manage Backlog
          </Button>
          <Button size="sm" onClick={onAddIdea}>
            <Plus className="h-4 w-4 mr-2" />
            Add Idea
          </Button>
        </div>
      </div>

      {/* Bottom Row: Sort and Filter */}
      <div className="flex items-center gap-4">
        <Select
          value={`${sortField}-${sortDirection}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={getStatusFilterValue()}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue>{getStatusFilterLabel()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
