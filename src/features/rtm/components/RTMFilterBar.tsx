/**
 * RTM Filter Bar Component
 * Provides Release, Type, and Coverage filter dropdowns
 */
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RTMFilters, RequirementType, CoverageStatus } from '../types';

interface Release {
  id: string;
  name: string;
}

interface RTMFilterBarProps {
  filters: RTMFilters;
  onFilterChange: <K extends keyof RTMFilters>(key: K, value: RTMFilters[K]) => void;
  onClearFilters: () => void;
  releases?: Release[];
}

const requirementTypes: { value: RequirementType; label: string }[] = [
  { value: 'epic', label: 'Epic' },
  { value: 'feature', label: 'Feature' },
  { value: 'story', label: 'Story' },
  { value: 'requirement', label: 'Requirement' },
];

const coverageOptions: { value: CoverageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Coverage' },
  { value: 'covered', label: 'Covered (≥80%)' },
  { value: 'partial', label: 'Partial (1-79%)' },
  { value: 'gap', label: 'Uncovered (0%)' },
];

// Mock releases - in production this would come from props
const defaultReleases: Release[] = [
  { id: 'rel1', name: 'Release 9.8' },
  { id: 'rel2', name: 'Release 9.7' },
  { id: 'rel3', name: 'Release 9.6' },
];

export const RTMFilterBar = ({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  releases = defaultReleases 
}: RTMFilterBarProps) => {
  const activeFilterCount = [
    filters.releaseId,
    filters.type,
    filters.coverageStatus,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      {/* Release Filter */}
      <Select 
        value={filters.releaseId || 'all'} 
        onValueChange={(v) => onFilterChange('releaseId', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="All Releases" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Releases</SelectItem>
          {releases.map(r => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select 
        value={filters.type || 'all'} 
        onValueChange={(v) => onFilterChange('type', v === 'all' ? null : v as RequirementType)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {requirementTypes.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Coverage Filter */}
      <Select 
        value={filters.coverageStatus || 'all'} 
        onValueChange={(v) => onFilterChange('coverageStatus', v === 'all' ? null : v as CoverageStatus)}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="All Coverage" />
        </SelectTrigger>
        <SelectContent>
          {coverageOptions.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active Filter Indicator & Clear */}
      {activeFilterCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onClearFilters}
        >
          <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
            {activeFilterCount}
          </Badge>
          <X className="w-3.5 h-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
};
