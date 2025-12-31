import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  ChevronRight,
  Layers,
  FileText,
  Zap,
  AlertTriangle,
  AlertCircle,
  Target,
  Briefcase,
  Bug
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { HierarchyNode, WorkItemAssignment } from '@/types/resource360';

interface HierarchyTreeViewProps {
  nodes: HierarchyNode[];
  workItems: WorkItemAssignment[];
}

type FilterTab = 'all' | 'current' | 'past';

export function HierarchyTreeView({ nodes, workItems }: HierarchyTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Filter work items based on active filter
  const filteredItems = workItems.filter(item => {
    if (activeFilter === 'current') return item.status === 'current' || item.status === 'future';
    if (activeFilter === 'past') return item.status === 'completed' || item.status === 'cancelled';
    return true;
  });

  const getWorkItemIcon = (type: string) => {
    switch (type) {
      case 'theme':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#4d8b4d] flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
        );
      case 'epic':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
        );
      case 'feature':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
        );
      case 'story':
        return (
          <div className="w-6 h-6 rounded bg-[#8b7355] flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
        );
      case 'defect':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#dc2626] flex items-center justify-center">
            <Bug className="w-4 h-4 text-white" />
          </div>
        );
      case 'incident':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#d97706] flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        );
      case 'business_request':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#22c55e] flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-[#6b7280] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">
            Current
          </span>
        );
      case 'future':
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#2563eb]/10 text-[#2563eb] uppercase">
            Future
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#6b7280]/10 text-[#6b7280] uppercase">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const renderNode = (item: WorkItemAssignment, depth: number = 0) => {
    const hasChildren = item.parent !== undefined;
    const isExpanded = expandedIds.has(item.id);
    const paddingLeft = depth * 24 + 20;

    return (
      <div key={item.id} className="border-b border-[#f5f5f4] last:border-0">
        <div
          className={cn(
            "flex items-center gap-3 py-3 px-5 hover:bg-[#fafafa] transition-colors",
            depth > 0 && "border-l-2 border-[#e5e5e5] ml-5"
          )}
          style={{ paddingLeft }}
        >
          {/* Expand/Collapse button - only for items with potential children */}
          {item.type !== 'story' && item.type !== 'defect' ? (
            <button
              onClick={() => toggleExpand(item.id)}
              className="w-5 h-5 flex items-center justify-center text-[#737373] hover:text-[#0a0a0a]"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Work Item Icon */}
          {getWorkItemIcon(item.type)}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-[#2563eb]">{item.item_id}</span>
              <span className="text-sm text-[#0a0a0a] truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              {getStatusBadge(item.status)}
              <span className="capitalize">{item.type}</span>
              {item.project && <span>· {item.project.name}</span>}
            </div>
          </div>

          {/* Story Points / Version */}
          {(item.story_points || item.release_version) && (
            <div className="flex items-center gap-2 text-right">
              {item.story_points && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[#8b7355]/10 text-[#8b7355] rounded">
                  {item.story_points} SP
                </span>
              )}
              {item.release_version && (
                <span className="text-xs text-[#737373]">{item.release_version}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (filteredItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f5f5f4] flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-[#a3a3a3]" />
        </div>
        <p className="text-lg font-medium text-[#0a0a0a] mb-1">No Work Items</p>
        <p className="text-sm text-[#737373]">
          No work items are currently assigned to this resource.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-[#e5e5e5]">
        <h3 className="text-base font-semibold text-[#0a0a0a]">Work Context Hierarchy</h3>
        <div className="flex gap-1 bg-[#f5f5f4] p-1 rounded-lg">
          {(['all', 'current', 'past'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activeFilter === tab
                  ? "bg-[#2563eb] text-white"
                  : "text-[#737373] hover:text-[#0a0a0a]"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {filteredItems.map(item => renderNode(item, 0))}
        </div>
      </ScrollArea>
    </div>
  );
}
