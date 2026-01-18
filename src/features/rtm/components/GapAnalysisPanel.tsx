/**
 * Gap Analysis Panel
 * Slide-over showing requirements with 0% test coverage
 */
import { useState, useMemo } from 'react';
import { X, AlertTriangle, Plus, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { RequirementTableRow, Priority } from '../types';
import { cn } from '@/lib/utils';

interface GapAnalysisItem extends RequirementTableRow {
  feature?: string;
  module?: string;
}

interface GapAnalysisPanelProps {
  open: boolean;
  onClose: () => void;
  requirements: RequirementTableRow[];
}

type GroupBy = 'feature' | 'priority' | 'module' | 'none';

const priorityColors: Record<Priority, string> = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

export const GapAnalysisPanel = ({ open, onClose, requirements }: GapAnalysisPanelProps) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('priority');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Filter to only gaps (0% coverage)
  const gapRequirements = useMemo(() => 
    requirements.filter(r => r.coveragePercentage === 0 || r.coverageStatus === 'gap'),
    [requirements]
  );

  // Calculate metrics
  const gapMetrics = useMemo(() => {
    const total = requirements.length;
    const uncovered = gapRequirements.length;
    const gapPercentage = total > 0 ? Math.round((uncovered / total) * 100) : 0;
    const criticalGaps = gapRequirements.filter(r => r.priority === 'critical').length;
    const highGaps = gapRequirements.filter(r => r.priority === 'high').length;
    return { total, uncovered, gapPercentage, criticalGaps, highGaps };
  }, [requirements, gapRequirements]);

  // Group requirements
  const groupedRequirements = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Requirements': gapRequirements };
    }

    const groups: Record<string, GapAnalysisItem[]> = {};
    
    gapRequirements.forEach(req => {
      let key: string;
      switch (groupBy) {
        case 'priority':
          key = req.priority.charAt(0).toUpperCase() + req.priority.slice(1);
          break;
        case 'feature':
          key = (req as GapAnalysisItem).feature || 'Uncategorized';
          break;
        case 'module':
          key = (req as GapAnalysisItem).module || 'Core';
          break;
        default:
          key = 'All';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(req as GapAnalysisItem);
    });

    return groups;
  }, [gapRequirements, groupBy]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === gapRequirements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(gapRequirements.map(r => r.id)));
    }
  };

  const handleBulkCreateTests = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one requirement');
      return;
    }

    setIsCreating(true);
    try {
      // Simulate API call to create test cases
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Created ${selectedIds.size} test case(s) for selected requirements`);
      setSelectedIds(new Set());
      onClose();
    } catch (error) {
      toast.error('Failed to create test cases');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[540px] sm:max-w-[540px] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold">Gap Analysis</SheetTitle>
                <p className="text-sm text-muted-foreground">Requirements without test coverage</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b border-border bg-muted/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{gapMetrics.uncovered}</div>
            <div className="text-xs text-muted-foreground">Uncovered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{gapMetrics.gapPercentage}%</div>
            <div className="text-xs text-muted-foreground">Gap Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{gapMetrics.criticalGaps + gapMetrics.highGaps}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedIds.size === gapRequirements.length && gapRequirements.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="module">Module</SelectItem>
                <SelectItem value="none">No Grouping</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Requirements List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {Object.entries(groupedRequirements).map(([group, items]) => (
              <div key={group} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">{group}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {items.length} gaps
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {items.map(req => (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
                        selectedIds.has(req.id) && "ring-2 ring-primary/50 bg-primary/5"
                      )}
                      onClick={() => handleToggleSelect(req.id)}
                    >
                      <Checkbox 
                        checked={selectedIds.has(req.id)} 
                        onCheckedChange={() => handleToggleSelect(req.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground">{req.key}</span>
                          <Badge className={cn("text-[10px] px-1.5", priorityColors[req.priority])}>
                            {req.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mt-1 truncate">{req.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Type: {req.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {gapRequirements.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No coverage gaps found</p>
                <p className="text-sm text-muted-foreground">All requirements have test coverage</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} requirement(s) selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkCreateTests}
                disabled={selectedIds.size === 0 || isCreating}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {isCreating ? 'Creating...' : 'Create Test Cases'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
