// Requirements Tree Component
import React, { useState, useMemo } from 'react';
import { ChevronRight, Search, Minimize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RequirementWithCoverage, TYPE_CONFIG, getCoverageColor, getCoverageBgClass } from '../../types/requirements';

interface RequirementTreeItemProps {
  requirement: RequirementWithCoverage;
  level: number;
  selectedId: string | null;
  onSelect: (req: RequirementWithCoverage) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

function RequirementTreeItem({
  requirement,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: RequirementTreeItemProps) {
  const isExpanded = expandedIds.has(requirement.id);
  const isSelected = selectedId === requirement.id;
  const hasChildren = requirement.has_children && requirement.children && requirement.children.length > 0;
  const typeConfig = TYPE_CONFIG[requirement.type];
  const coverageLevel = getCoverageColor(requirement.coverage_percentage);

  return (
    <div className="mb-0.5">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted'
        )}
        onClick={() => onSelect(requirement)}
        style={{ paddingLeft: `${12 + level * 20}px` }}
      >
        {/* Expand toggle */}
        <button
          className={cn(
            'w-5 h-5 flex items-center justify-center text-muted-foreground transition-transform',
            isExpanded && 'rotate-90',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(requirement.id);
          }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Type icon */}
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
        >
          {requirement.type === 'epic' ? 'E' : requirement.type === 'feature' ? 'F' : 'S'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-muted-foreground font-mono">
            {requirement.requirement_key}
          </div>
          <div className="text-sm text-foreground truncate">{requirement.title}</div>
        </div>

        {/* Coverage bar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-10 h-1 bg-muted rounded overflow-hidden">
            <div
              className={cn('h-full rounded', getCoverageBgClass(coverageLevel))}
              style={{ width: `${requirement.coverage_percentage}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground min-w-[28px]">
            {requirement.coverage_percentage}%
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {requirement.children!.map(child => (
            <RequirementTreeItem
              key={child.id}
              requirement={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RequirementsTreeProps {
  requirements: RequirementWithCoverage[];
  selectedRequirement: RequirementWithCoverage | null;
  onSelectRequirement: (req: RequirementWithCoverage) => void;
  isLoading?: boolean;
}

export function RequirementsTree({
  requirements,
  selectedRequirement,
  onSelectRequirement,
  isLoading,
}: RequirementsTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filter requirements by search
  const filteredRequirements = useMemo(() => {
    if (!searchQuery.trim()) return requirements;
    
    const query = searchQuery.toLowerCase();
    
    const filterRecursive = (reqs: RequirementWithCoverage[]): RequirementWithCoverage[] => {
      return reqs.filter(req => {
        const matches = 
          req.title.toLowerCase().includes(query) ||
          req.requirement_key.toLowerCase().includes(query);
        
        if (matches) return true;
        
        if (req.children && req.children.length > 0) {
          const filteredChildren = filterRecursive(req.children);
          if (filteredChildren.length > 0) {
            req.children = filteredChildren;
            return true;
          }
        }
        return false;
      });
    };
    
    return filterRecursive([...requirements]);
  }, [requirements, searchQuery]);

  // Auto-expand all when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const getAllIds = (reqs: RequirementWithCoverage[]): string[] => {
        return reqs.flatMap(r => [r.id, ...getAllIds(r.children || [])]);
      };
      setExpandedIds(new Set(getAllIds(requirements)));
    }
  }, [searchQuery, requirements]);

  return (
    <aside className="w-80 bg-card border-r flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Requirements Hierarchy</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCollapseAll}>
          <Minimize2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : filteredRequirements.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No requirements found
          </div>
        ) : (
          filteredRequirements.map(req => (
            <RequirementTreeItem
              key={req.id}
              requirement={req}
              level={0}
              selectedId={selectedRequirement?.id || null}
              onSelect={onSelectRequirement}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
            />
          ))
        )}
      </div>
    </aside>
  );
}
