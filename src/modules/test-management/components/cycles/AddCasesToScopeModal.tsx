/**
 * Add Cases to Scope Modal
 */

import React, { useState, useMemo } from 'react';
import { Search, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TestCase, Folder, CycleScope } from '../../api/types';

interface AddCasesToScopeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cases: TestCase[];
  folders?: Folder[];
  existingScope: CycleScope[];
  onSubmit: (caseIds: string[]) => void;
  isLoading?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-danger/10 text-danger border-danger/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  medium: 'bg-info/10 text-info border-info/20',
  low: 'bg-muted text-muted-foreground',
};

export function AddCasesToScopeModal({
  open,
  onOpenChange,
  cases,
  folders = [],
  existingScope,
  onSubmit,
  isLoading,
}: AddCasesToScopeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());

  // Get IDs of cases already in scope
  const existingScopeIds = useMemo(() => 
    new Set(existingScope.map(s => s.case_id)),
    [existingScope]
  );

  // Filter available cases
  const filteredCases = useMemo(() => {
    return cases.filter(tc => {
      // Exclude already in scope
      if (existingScopeIds.has(tc.id)) return false;
      
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!tc.title.toLowerCase().includes(q) && !tc.case_key.toLowerCase().includes(q)) {
          return false;
        }
      }
      
      // Folder filter
      if (selectedFolder !== 'all' && tc.folder_id !== selectedFolder) {
        return false;
      }
      
      // Approved only filter
      if (approvedOnly && tc.status !== 'approved') {
        return false;
      }
      
      return true;
    });
  }, [cases, existingScopeIds, searchQuery, selectedFolder, approvedOnly]);

  // Cases already in scope (for display)
  const inScopeCases = useMemo(() => 
    cases.filter(tc => existingScopeIds.has(tc.id)),
    [cases, existingScopeIds]
  );

  const toggleCase = (caseId: string) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit(Array.from(selectedCaseIds));
  };

  const handleClose = () => {
    setSelectedCaseIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Test Cases to Cycle</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={approvedOnly}
                onCheckedChange={(checked) => setApprovedOnly(checked as boolean)}
              />
              Approved Only
            </label>
          </div>

          {/* Case List */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2 space-y-1">
              {filteredCases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test cases available to add
                </div>
              ) : (
                <>
                  {filteredCases.map((tc) => {
                    const isSelected = selectedCaseIds.has(tc.id);
                    const priorityName = tc.priority?.name?.toLowerCase() || 'medium';
                    
                    return (
                      <div
                        key={tc.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => toggleCase(tc.id)}
                      >
                        <Checkbox checked={isSelected} />
                        <span className="font-mono text-sm text-muted-foreground w-20">
                          {tc.case_key}
                        </span>
                        <span className="flex-1 truncate">{tc.title}</span>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs capitalize', PRIORITY_COLORS[priorityName])}
                        >
                          {tc.priority?.name || 'Medium'}
                        </Badge>
                      </div>
                    );
                  })}
                </>
              )}
              
              {/* Already in scope section */}
              {inScopeCases.length > 0 && (
                <>
                  <div className="border-t my-3" />
                  <div className="text-xs font-medium text-muted-foreground px-2 mb-2">
                    Already in scope ({inScopeCases.length})
                  </div>
                  {inScopeCases.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center gap-3 p-2 rounded-md opacity-50"
                    >
                      <Check className="h-4 w-4 text-success" />
                      <span className="font-mono text-sm text-muted-foreground w-20">
                        {tc.case_key}
                      </span>
                      <span className="flex-1 truncate">{tc.title}</span>
                      <span className="text-xs text-muted-foreground">(added)</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedCaseIds.size} case(s) selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={selectedCaseIds.size === 0 || isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Adding...' : 'Add to Scope'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
