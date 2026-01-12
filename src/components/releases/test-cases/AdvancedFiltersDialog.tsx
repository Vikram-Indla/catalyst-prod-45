/**
 * Advanced Filters Dialog
 * Comprehensive filtering with saved filter presets
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  Save,
  Trash2,
  Star,
  Calendar,
  User,
  Tag,
  FolderOpen,
  Clock,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdvancedFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters?: (filters: FilterState) => void;
}

interface FilterState {
  search?: string;
  releases: string[];
  statuses: string[];
  priorities: string[];
  types: string[];
  tags: string[];
  assignees: string[];
  folders: string[];
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  executionStatus: string[];
  automationStatus: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  isDefault?: boolean;
  createdAt: string;
}

const DEFAULT_FILTERS: FilterState = {
  releases: [],
  statuses: [],
  priorities: [],
  types: [],
  tags: [],
  assignees: [],
  folders: [],
  executionStatus: [],
  automationStatus: [],
};

const FILTER_OPTIONS = {
  statuses: [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'ready', label: 'Ready', color: 'bg-blue-100 text-blue-800' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
    { value: 'deprecated', label: 'Deprecated', color: 'bg-red-100 text-red-800' },
  ],
  priorities: [
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  ],
  types: [
    { value: 'functional', label: 'Functional' },
    { value: 'regression', label: 'Regression' },
    { value: 'smoke', label: 'Smoke' },
    { value: 'integration', label: 'Integration' },
    { value: 'e2e', label: 'End-to-End' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security' },
  ],
  executionStatus: [
    { value: 'passed', label: 'Passed', color: 'bg-green-100 text-green-800' },
    { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
    { value: 'blocked', label: 'Blocked', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'not_run', label: 'Not Run', color: 'bg-gray-100 text-gray-800' },
  ],
  automationStatus: [
    { value: 'automated', label: 'Automated' },
    { value: 'manual', label: 'Manual' },
    { value: 'partial', label: 'Partially Automated' },
  ],
};

const MOCK_SAVED_FILTERS: SavedFilter[] = [
  {
    id: '1',
    name: 'Critical Blockers',
    filters: { ...DEFAULT_FILTERS, priorities: ['critical'], statuses: ['ready'] },
    isDefault: true,
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    name: 'My Pending Reviews',
    filters: { ...DEFAULT_FILTERS, statuses: ['ready'], assignees: ['current-user'] },
    createdAt: '2024-01-08',
  },
  {
    id: '3',
    name: 'Failed Last Run',
    filters: { ...DEFAULT_FILTERS, executionStatus: ['failed'] },
    createdAt: '2024-01-05',
  },
];

export function AdvancedFiltersDialog({
  open,
  onOpenChange,
  onApplyFilters,
}: AdvancedFiltersDialogProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(MOCK_SAVED_FILTERS);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }).length;

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const arr = (prev[key] as string[]) || [];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const handleApply = () => {
    onApplyFilters?.(filters);
    onOpenChange(false);
    toast.success(`Applied ${activeFilterCount} filter(s)`);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    toast.info('Filters reset');
  };

  const handleLoadSavedFilter = (saved: SavedFilter) => {
    setFilters(saved.filters);
    toast.success(`Loaded filter: ${saved.name}`);
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    const newSaved: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString().split('T')[0],
    };

    setSavedFilters((prev) => [...prev, newSaved]);
    setNewFilterName('');
    setShowSaveInput(false);
    toast.success(`Filter "${newSaved.name}" saved`);
  };

  const handleDeleteSavedFilter = (id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    toast.success('Filter deleted');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Filter className="w-5 h-5" />
            </div>
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Create complex filter combinations and save them for quick access
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Saved Filters Sidebar */}
          <div className="w-56 shrink-0 border-r pr-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Saved Filters</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setShowSaveInput(true)}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save current filter</TooltipContent>
              </Tooltip>
            </div>

            {showSaveInput && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 space-y-2"
              >
                <Input
                  placeholder="Filter name..."
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveFilter();
                    if (e.key === 'Escape') setShowSaveInput(false);
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7" onClick={handleSaveFilter}>
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowSaveInput(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            )}

            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {savedFilters.map((saved) => (
                  <div
                    key={saved.id}
                    className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleLoadSavedFilter(saved)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">{saved.name}</span>
                        {saved.isDefault && (
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{saved.createdAt}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSavedFilter(saved.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Filter Options */}
          <ScrollArea className="flex-1">
            <Accordion type="multiple" defaultValue={['status', 'priority', 'type']} className="w-full">
              {/* Status Filter */}
              <AccordionItem value="status">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Status
                    {filters.statuses.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.statuses.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {FILTER_OPTIONS.statuses.map((opt) => (
                      <div
                        key={opt.value}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                          filters.statuses.includes(opt.value) && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => toggleArrayFilter('statuses', opt.value)}
                      >
                        <Checkbox checked={filters.statuses.includes(opt.value)} />
                        <Badge className={cn("text-xs", opt.color)}>{opt.label}</Badge>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Priority Filter */}
              <AccordionItem value="priority">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Priority
                    {filters.priorities.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.priorities.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {FILTER_OPTIONS.priorities.map((opt) => (
                      <div
                        key={opt.value}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                          filters.priorities.includes(opt.value) && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => toggleArrayFilter('priorities', opt.value)}
                      >
                        <Checkbox checked={filters.priorities.includes(opt.value)} />
                        <Badge className={cn("text-xs", opt.color)}>{opt.label}</Badge>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Type Filter */}
              <AccordionItem value="type">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Test Type
                    {filters.types.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.types.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {FILTER_OPTIONS.types.map((opt) => (
                      <div
                        key={opt.value}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                          filters.types.includes(opt.value) && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => toggleArrayFilter('types', opt.value)}
                      >
                        <Checkbox checked={filters.types.includes(opt.value)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Execution Status Filter */}
              <AccordionItem value="execution">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last Execution
                    {filters.executionStatus.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.executionStatus.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {FILTER_OPTIONS.executionStatus.map((opt) => (
                      <div
                        key={opt.value}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                          filters.executionStatus.includes(opt.value) && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => toggleArrayFilter('executionStatus', opt.value)}
                      >
                        <Checkbox checked={filters.executionStatus.includes(opt.value)} />
                        <Badge className={cn("text-xs", opt.color)}>{opt.label}</Badge>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Date Range Filters */}
              <AccordionItem value="dates">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date Range
                    {(filters.createdAfter || filters.createdBefore) && (
                      <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Created After</Label>
                      <Input
                        type="date"
                        value={filters.createdAfter || ''}
                        onChange={(e) => setFilters((p) => ({ ...p, createdAfter: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Created Before</Label>
                      <Input
                        type="date"
                        value={filters.createdBefore || ''}
                        onChange={(e) => setFilters((p) => ({ ...p, createdBefore: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Modified After</Label>
                      <Input
                        type="date"
                        value={filters.modifiedAfter || ''}
                        onChange={(e) => setFilters((p) => ({ ...p, modifiedAfter: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Modified Before</Label>
                      <Input
                        type="date"
                        value={filters.modifiedBefore || ''}
                        onChange={(e) => setFilters((p) => ({ ...p, modifiedBefore: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Automation Status */}
              <AccordionItem value="automation">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Automation Status
                    {filters.automationStatus.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.automationStatus.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {FILTER_OPTIONS.automationStatus.map((opt) => (
                      <div
                        key={opt.value}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                          filters.automationStatus.includes(opt.value) && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => toggleArrayFilter('automationStatus', opt.value)}
                      >
                        <Checkbox checked={filters.automationStatus.includes(opt.value)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </div>

        <Separator />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
