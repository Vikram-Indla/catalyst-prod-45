// ============================================================
// IDEAS FILTER BAR ADVANCED - World Class Design
// ============================================================

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LayoutGrid, List, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Initiative {
  id: string;
  title: string;
}

interface IdeasFilterBarAdvancedProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  initiativeFilter: string;
  onInitiativeChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  initiatives: Initiative[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

const categories = [
  { value: 'process_optimization', label: 'Process Optimization' },
  { value: 'reporting_analytics', label: 'Reporting & Analytics' },
  { value: 'digital_service', label: 'Digital Service' },
  { value: 'compliance_automation', label: 'Compliance Automation' },
  { value: 'investor_experience', label: 'Investor Experience' },
  { value: 'integration', label: 'Integration' },
  { value: 'data_quality', label: 'Data Quality' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'security_enhancement', label: 'Security Enhancement' },
  { value: 'mobile_capability', label: 'Mobile Capability' },
  { value: 'other', label: 'Other' },
];

export function IdeasFilterBarAdvanced({
  searchQuery,
  onSearchChange,
  initiativeFilter,
  onInitiativeChange,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  initiatives,
  hasActiveFilters,
  onClearFilters,
  className
}: IdeasFilterBarAdvancedProps) {
  return (
    <Card className={cn("p-4 bg-white border-slate-200 shadow-sm", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        {/* Initiative Filter */}
        <Select value={initiativeFilter} onValueChange={onInitiativeChange}>
          <SelectTrigger className="w-[160px] h-10 bg-white border-slate-200 hover:bg-slate-50">
            <SelectValue placeholder="All Initiatives" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Initiatives</SelectItem>
            {initiatives.map(init => (
              <SelectItem key={init.id} value={init.id}>{init.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[140px] h-10 bg-white border-slate-200 hover:bg-slate-50">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="quick_win">⚡ Quick Win</SelectItem>
            <SelectItem value="strategic">📦 Strategic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px] h-10 bg-white border-slate-200 hover:bg-slate-50">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200 hover:bg-slate-50">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />
        
        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[150px] h-10 bg-white border-slate-200 hover:bg-slate-50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="votes">Most Votes</SelectItem>
            <SelectItem value="impact">Highest IMPACT</SelectItem>
          </SelectContent>
        </Select>
        
        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "h-8 w-8 p-0 rounded-md",
              viewMode === 'grid' 
                ? "bg-white shadow-sm text-blue-600" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('list')}
            className={cn(
              "h-8 w-8 p-0 rounded-md",
              viewMode === 'list' 
                ? "bg-white shadow-sm text-blue-600" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-10 text-xs text-slate-500 hover:text-slate-700 gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>
    </Card>
  );
}
