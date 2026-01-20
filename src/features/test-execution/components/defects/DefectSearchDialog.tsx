/**
 * Module 3A-4: Defect Search Dialog
 * Search and link existing defects to a step
 */

import { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DefectCard } from './DefectCard';
import { useDefectSearch } from '../../hooks/useDefectSearch';
import type { DefectStatus, DefectSearchResult } from '../../types/defect-linking';

interface DefectSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  linkedDefectIds: string[];
  isLinking: boolean;
  onLink: (defect: DefectSearchResult) => void;
}

const STATUS_FILTERS: { value: DefectStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'reopened', label: 'Reopened' },
];

export function DefectSearchDialog({
  open,
  onOpenChange,
  projectId,
  linkedDefectIds,
  isLinking,
  onLink,
}: DefectSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DefectStatus[]>([]);

  const { results, isSearching } = useDefectSearch(projectId, {
    query,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    limit: 20,
  });

  // Filter out already linked defects
  const availableDefects = results.filter(d => !linkedDefectIds.includes(d.id));

  const toggleStatusFilter = (status: DefectStatus) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Existing Defect</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID (DEF-001) or title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter:</span>
            {STATUS_FILTERS.map(({ value, label }) => (
              <Badge
                key={value}
                variant={statusFilter.includes(value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStatusFilter(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableDefects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query ? 'No matching defects found' : 'Start typing to search defects'}
              </div>
            ) : (
              availableDefects.map((defect) => (
                <DefectCard
                  key={defect.id}
                  defect={defect}
                  showLink
                  isLinking={isLinking}
                  onLink={() => onLink(defect)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
