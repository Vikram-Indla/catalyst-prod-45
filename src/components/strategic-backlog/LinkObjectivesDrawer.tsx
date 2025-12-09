import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Target, Filter, X } from 'lucide-react';
import { useObjectives, type ObjectiveTier } from '@/hooks/useObjectives';
import { useLinkObjectivesToTheme } from '@/hooks/useThemeObjectiveLinks';

interface LinkObjectivesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeId: string;
  themeName: string;
  snapshotId: string;
  existingObjectiveIds: string[];
}

export function LinkObjectivesDrawer({
  open,
  onOpenChange,
  themeId,
  themeName,
  snapshotId,
  existingObjectiveIds,
}: LinkObjectivesDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tierFilter, setTierFilter] = useState<ObjectiveTier | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: allObjectives = [], isLoading } = useObjectives({});
  const linkMutation = useLinkObjectivesToTheme();

  // Filter out already linked objectives and apply search/filters
  const availableObjectives = useMemo(() => {
    return allObjectives.filter((obj) => {
      // Exclude already linked
      if (existingObjectiveIds.includes(obj.id)) return false;
      
      // Apply tier filter
      if (tierFilter !== 'all' && obj.tier !== tierFilter) return false;
      
      // Apply search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!obj.summary?.toLowerCase().includes(q)) return false;
      }
      
      return true;
    });
  }, [allObjectives, existingObjectiveIds, tierFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === availableObjectives.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableObjectives.map(o => o.id));
    }
  };

  const handleLink = () => {
    if (!themeId || selectedIds.length === 0) return;
    linkMutation.mutate(
      { themeId, objectiveIds: selectedIds },
      {
        onSuccess: () => {
          setSelectedIds([]);
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery('');
    setTierFilter('all');
    onOpenChange(false);
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'portfolio': return <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">Portfolio</Badge>;
      case 'program': return <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">Program</Badge>;
      case 'team': return <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Team</Badge>;
      default: return null;
    }
  };

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'good': return <Badge className="bg-green-100 text-green-700 text-xs">Good</Badge>;
      case 'fair': return <Badge className="bg-amber-100 text-amber-700 text-xs">Fair</Badge>;
      case 'poor': return <Badge className="bg-red-100 text-red-700 text-xs">Poor</Badge>;
      case 'at_risk': return <Badge className="bg-orange-100 text-orange-700 text-xs">At Risk</Badge>;
      default: return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-gold" />
            Link objectives to {themeName}
          </SheetTitle>
        </SheetHeader>

        {/* Search & Filters */}
        <div className="p-4 pb-2 space-y-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search objectives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-2">
              <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as ObjectiveTier | 'all')}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
              {tierFilter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setTierFilter('all')}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{availableObjectives.length} available objectives</span>
            {availableObjectives.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-brand-gold hover:underline"
              >
                {selectedIds.length === availableObjectives.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading objectives...</p>
          ) : availableObjectives.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {existingObjectiveIds.length > 0
                  ? 'All objectives are already linked to this theme'
                  : 'No objectives available'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {availableObjectives.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => toggleSelect(obj.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedIds.includes(obj.id)
                      ? 'border-brand-gold bg-brand-gold/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.includes(obj.id)}
                      onCheckedChange={() => toggleSelect(obj.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{obj.summary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getTierBadge(obj.tier)}
                        {getHealthBadge(obj.health)}
                        {obj.score != null && (
                          <span className="text-xs text-muted-foreground">{obj.score}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="p-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={selectedIds.length === 0 || linkMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            Link {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
