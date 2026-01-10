/**
 * Cases Toolbar Component
 * Search, filters, view toggle, column selector, and bulk actions
 */

import React, { useState, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  LayoutList,
  Plus,
  ChevronDown,
  Copy,
  FolderInput,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  User,
  Users,
  UserX,
  UserPlus,
  CheckCircle2,
  Flag,
  FileType,
} from 'lucide-react';
import { ColumnSelector } from './ColumnSelector';
import { AISearchSuggestions } from './AISearchSuggestions';
import { MoreFiltersPanel, type MoreFiltersState } from './MoreFiltersPanel';
import { SortDropdown } from './SortDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CaseStatus } from '../../api/types';
import type { SortField, SortDirection } from './CasesDataTable';

export interface CasesFilters {
  status: CaseStatus[];
  priorityIds: string[];
  typeIds: string[];
  assignedTo: string | null; // 'me' | 'unassigned' | userId
  search: string;
  // Extended filters
  moreFilters?: MoreFiltersState;
}

interface CasesToolbarProps {
  filters: CasesFilters;
  onFiltersChange: (filters: CasesFilters) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  selectedCount: number;
  onCreateCase: () => void;
  onGenerateWithAI?: () => void;
  onBulkCopy: () => void;
  onBulkMove: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  onBulkAssignTo?: (userId: string | null) => void;
  onBulkType?: (typeId: string) => void;
  onBulkPriority?: (priorityId: string) => void;
  onBulkStatus?: (status: CaseStatus) => void;
  onClearSelection: () => void;
  onImport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  priorities?: { id: string; name: string; color: string }[];
  caseTypes?: { id: string; name: string }[];
  teamMembers?: { id: string; full_name: string; avatar_url?: string | null }[];
  currentUserId?: string;
  // Sort props
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField) => void;
}

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_update', label: 'Needs Update' },
  { value: 'deprecated', label: 'Deprecated' },
];

const DEFAULT_MORE_FILTERS: MoreFiltersState = {
  dateField: 'updated_at',
  dateFrom: '',
  dateTo: '',
  tags: [],
  hasLinkedItemsOnly: false,
  aiGeneratedOnly: false,
};

export function CasesToolbar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  onCreateCase,
  onGenerateWithAI,
  onBulkCopy,
  onBulkMove,
  onBulkDelete,
  onBulkExport,
  onBulkAssignTo,
  onBulkType,
  onBulkPriority,
  onBulkStatus,
  onClearSelection,
  onImport,
  onRefresh,
  isRefreshing = false,
  priorities = [],
  caseTypes = [],
  teamMembers = [],
  currentUserId,
  sortField = 'updated_at',
  sortDirection = 'desc',
  onSortChange,
}: CasesToolbarProps) {
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [moreFilters, setMoreFilters] = useState<MoreFiltersState>(DEFAULT_MORE_FILTERS);
  const searchRef = useRef<HTMLInputElement>(null);

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.priorityIds.length > 0 ||
    filters.typeIds.length > 0 ||
    filters.assignedTo !== null;

  const toggleStatus = (status: CaseStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const togglePriority = (priorityId: string) => {
    const newPriorities = filters.priorityIds.includes(priorityId)
      ? filters.priorityIds.filter((p) => p !== priorityId)
      : [...filters.priorityIds, priorityId];
    onFiltersChange({ ...filters, priorityIds: newPriorities });
  };

  const toggleType = (typeId: string) => {
    const newTypes = filters.typeIds.includes(typeId)
      ? filters.typeIds.filter((t) => t !== typeId)
      : [...filters.typeIds, typeId];
    onFiltersChange({ ...filters, typeIds: newTypes });
  };

  const setAssigned = (value: string) => {
    onFiltersChange({ ...filters, assignedTo: value === 'all' ? null : value });
  };

  const getAssignedLabel = () => {
    if (!filters.assignedTo) return 'Assigned';
    if (filters.assignedTo === 'me') return 'Assigned to me';
    if (filters.assignedTo === 'unassigned') return 'Unassigned';
    const member = teamMembers.find(m => m.id === filters.assignedTo);
    return member?.full_name?.split(' ')[0] || 'Assigned';
  };

  const clearFilters = () => {
    onFiltersChange({ ...filters, status: [], priorityIds: [], typeIds: [], assignedTo: null });
    setMoreFilters(DEFAULT_MORE_FILTERS);
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
    if (value.length >= 2) {
      setAiSuggestionsOpen(true);
    } else {
      setAiSuggestionsOpen(false);
    }
  };

  const handleAISuggestionSelect = (suggestion: string) => {
    onFiltersChange({ ...filters, search: suggestion });
    setAiSuggestionsOpen(false);
  };

  const handleMoreFiltersChange = (newFilters: MoreFiltersState) => {
    setMoreFilters(newFilters);
  };

  const handleMoreFiltersApply = () => {
    onFiltersChange({ ...filters, moreFilters });
  };

  const handleMoreFiltersClear = () => {
    setMoreFilters(DEFAULT_MORE_FILTERS);
    onFiltersChange({ ...filters, moreFilters: undefined });
  };

  return (
    <div
      className="flex items-center gap-3 px-3 bg-surface-0"
      style={{
        height: '52px',
        borderBottom: '1px solid var(--divider, hsl(var(--border)))',
      }}
    >
      {/* Search with AI Suggestions */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Search test cases..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => filters.search.length >= 2 && setAiSuggestionsOpen(true)}
          className="pl-9 pr-9 h-9"
        />
        <Sparkles className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
        
        <AISearchSuggestions
          query={filters.search}
          onSelect={handleAISuggestionSelect}
          isOpen={aiSuggestionsOpen}
          onOpenChange={setAiSuggestionsOpen}
        />
      </div>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.status.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status.includes(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Priority
            {filters.priorityIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.priorityIds.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {priorities.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority.id}
              checked={filters.priorityIds.includes(priority.id)}
              onCheckedChange={() => togglePriority(priority.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: priority.color }}
                />
                {priority.name}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Type
            {filters.typeIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.typeIds.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {caseTypes.map((type) => (
            <DropdownMenuCheckboxItem
              key={type.id}
              checked={filters.typeIds.includes(type.id)}
              onCheckedChange={() => toggleType(type.id)}
            >
              {type.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Assigned To Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <User className="h-4 w-4" />
            {getAssignedLabel()}
            {filters.assignedTo && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                1
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by Assigned</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={filters.assignedTo || 'all'} onValueChange={setAssigned}>
            <DropdownMenuRadioItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Users
              </div>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="me">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned to me
              </div>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="unassigned">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Unassigned
              </div>
            </DropdownMenuRadioItem>
            {teamMembers.length > 0 && <DropdownMenuSeparator />}
            {teamMembers.map((member) => (
              <DropdownMenuRadioItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-brand-primary/20 text-brand-primary font-medium">
                      {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{member.full_name || 'No name'}</span>
                  {member.id === currentUserId && (
                    <span className="text-xs text-muted-foreground">(me)</span>
                  )}
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* More Filters */}
      <MoreFiltersPanel
        filters={moreFilters}
        onFiltersChange={handleMoreFiltersChange}
        onApply={handleMoreFiltersApply}
        onClear={handleMoreFiltersClear}
      />

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      <div className="flex-1" />

      {/* Bulk Actions (when items selected) */}
      {selectedCount > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-7 px-2">
              {selectedCount} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Assign To submenu */}
              {onBulkAssignTo && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign To
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start" className="w-48">
                    <DropdownMenuItem onClick={() => onBulkAssignTo(null)}>
                      <UserX className="h-4 w-4 mr-2" />
                      Unassigned
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {teamMembers.map((member) => (
                      <DropdownMenuItem key={member.id} onClick={() => onBulkAssignTo(member.id)}>
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-brand-primary/20 text-brand-primary font-medium">
                            {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {member.full_name || 'No name'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Type submenu */}
              {onBulkType && caseTypes.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                    <FileType className="h-4 w-4 mr-2" />
                    Type
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start" className="w-48">
                    {caseTypes.map((type) => (
                      <DropdownMenuItem key={type.id} onClick={() => onBulkType(type.id)}>
                        {type.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Priority submenu */}
              {onBulkPriority && priorities.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                    <Flag className="h-4 w-4 mr-2" />
                    Priority
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start" className="w-48">
                    {priorities.map((priority) => (
                      <DropdownMenuItem key={priority.id} onClick={() => onBulkPriority(priority.id)}>
                        <span 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: priority.color }}
                        />
                        {priority.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Status submenu */}
              {onBulkStatus && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Status
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start" className="w-48">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuItem key={status.value} onClick={() => onBulkStatus(status.value)}>
                        {status.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={onBulkCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkMove}>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onBulkDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Sort Dropdown */}
      {onSortChange && (
        <SortDropdown
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />
      )}

      {/* View Toggle */}
      <div className="flex items-center border border-border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('list')}
          className={cn(
            'h-8 px-2 rounded-r-none',
            viewMode === 'list' && 'bg-accent'
          )}
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'h-8 px-2 rounded-l-none',
            viewMode === 'grid' && 'bg-accent'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      {/* Column Selector */}
      <ColumnSelector />

      {/* Refresh Button */}
      {onRefresh && (
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      )}


      {/* New Case Button with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Case
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCreateCase}>
            <Plus className="h-4 w-4 mr-2" />
            New Test Case
          </DropdownMenuItem>
          {onGenerateWithAI && (
            <DropdownMenuItem onClick={onGenerateWithAI}>
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              Generate with AI
            </DropdownMenuItem>
          )}
          {onImport && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import from File
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default CasesToolbar;
