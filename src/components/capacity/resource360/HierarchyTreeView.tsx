import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Layers,
  FileText,
  Zap,
  Target,
  Bug,
  Briefcase
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkItemAssignment } from '@/types/resource360';
import { CategoryColors } from '@/lib/capacity/work-item-tokens';

interface HierarchyTreeViewProps {
  workItems: WorkItemAssignment[];
}

type FilterTab = 'all' | 'current' | 'past';

export function HierarchyTreeView({ workItems }: HierarchyTreeViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Filter work items based on active filter
  const filteredItems = workItems.filter(item => {
    if (activeFilter === 'current') return item.status === 'current' || item.status === 'future';
    if (activeFilter === 'past') return item.status === 'completed' || item.status === 'cancelled';
    return true;
  });

  // Build nested hierarchy: group by parent relationships
  const buildHierarchy = () => {
    // Group items by their parent relationship
    const themes = filteredItems.filter(i => i.type === 'theme');
    const epics = filteredItems.filter(i => i.type === 'epic');
    const features = filteredItems.filter(i => i.type === 'feature');
    const stories = filteredItems.filter(i => i.type === 'story');
    const defects = filteredItems.filter(i => i.type === 'defect');
    
    return { themes, epics, features, stories, defects };
  };

  const { themes, epics, features, stories, defects } = buildHierarchy();

  const getWorkItemIcon = (type: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
      theme: { 
        icon: <Layers className="w-4 h-4 text-white" />, 
        bg: 'bg-[#4d8b4d]' 
      },
      epic: { 
        icon: <Zap className="w-4 h-4 text-white" />, 
        bg: 'bg-[var(--ds-text-brand, #2563eb)]' 
      },
      feature: { 
        icon: <Target className="w-4 h-4 text-white" />, 
        bg: 'bg-[#0d9488]' 
      },
      story: { 
        icon: <FileText className="w-3.5 h-3.5 text-white" />, 
        bg: 'bg-[#10b981]' 
      },
      defect: { 
        icon: <Bug className="w-4 h-4 text-white" />, 
        bg: 'bg-[var(--ds-text-danger, #dc2626)]' 
      },
      business_request: { 
        icon: <Briefcase className="w-4 h-4 text-white" />, 
        bg: 'bg-[var(--ds-text-success, #22c55e)]' 
      },
    };
    return iconMap[type] || iconMap.story;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      current: { bg: 'bg-[#0d9488]/10', text: 'text-[#0d9488]', label: 'CURRENT' },
      future: { bg: 'bg-[var(--ds-text-brand, #2563eb)]/10', text: 'text-[var(--ds-text-brand, #2563eb)]', label: 'FUTURE' },
      completed: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'COMPLETED' },
    };
    const config = statusMap[status] || statusMap.current;
    return (
      <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded uppercase', config.bg, config.text)}>
        {config.label}
      </span>
    );
  };

  const getCategoryBorderColor = (type: string) => {
    if (['theme', 'objective', 'key_result'].includes(type)) return CategoryColors.enterprise.border;
    if (['epic', 'feature'].includes(type)) return CategoryColors.program.border;
    if (['story', 'defect', 'incident'].includes(type)) return CategoryColors.project.border;
    return CategoryColors.product.border;
  };

  const renderWorkItem = (item: WorkItemAssignment, depth: number = 0, children?: React.ReactNode) => {
    const { icon, bg } = getWorkItemIcon(item.type);
    const borderColor = getCategoryBorderColor(item.type);
    const isLeaf = item.type === 'story' || item.type === 'defect';
    
    return (
      <div 
        key={item.id} 
        className={cn(
          "relative",
          depth > 0 && "ml-6"
        )}
      >
        {/* Connecting line */}
        {depth > 0 && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: borderColor, marginLeft: '-12px' }}
          />
        )}
        
        <div 
          className={cn(
            "relative rounded-lg border bg-card mb-2 transition-all hover:shadow-sm",
            isLeaf ? "border-l-4" : "border-l-4"
          )}
          style={{ borderLeftColor: borderColor }}
        >
          <div className="p-4 flex items-start gap-3">
            {/* Icon */}
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-medium text-primary">{item.item_id}</span>
                <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {getStatusBadge(item.status)}
                <span className="capitalize">{item.type}</span>
                {item.project && <span>· {item.project.name}</span>}
              </div>
            </div>

            {/* Right side - Story points & Version */}
            <div className="flex items-center gap-2 text-right flex-shrink-0">
              {item.story_points && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[#10b981]/10 text-[#10b981] rounded">
                  {item.story_points} SP
                </span>
              )}
              {item.release_version && (
                <span className="text-xs text-muted-foreground">{item.release_version}</span>
              )}
            </div>
          </div>

          {/* Children */}
          {children}
        </div>
      </div>
    );
  };

  // Render hierarchical tree
  const renderHierarchy = () => {
    // For now, render flat but organized by type with visual nesting
    const allItems = [...themes, ...epics, ...features, ...stories, ...defects];
    
    // Group stories by their parent feature
    const getChildrenForParent = (parentId: string, parentType: string) => {
      return filteredItems.filter(item => 
        item.parent?.id === parentId || 
        (parentType === 'feature' && item.type === 'story' && item.parent?.id === parentId)
      );
    };

    // Render epics with their features and stories
    return (
      <div className="space-y-2">
        {epics.map(epic => {
          const epicFeatures = features.filter(f => f.parent?.id === epic.id);
          
          return renderWorkItem(epic, 0, 
            epicFeatures.length > 0 && (
              <div className="pl-4 pb-2">
                {epicFeatures.map(feature => {
                  const featureStories = stories.filter(s => s.parent?.id === feature.id);
                  
                  return renderWorkItem(feature, 1,
                    featureStories.length > 0 && (
                      <div className="pl-4 pb-2">
                        {featureStories.map(story => renderWorkItem(story, 2))}
                      </div>
                    )
                  );
                })}
              </div>
            )
          );
        })}

        {/* Standalone features */}
        {features.filter(f => !f.parent).map(feature => {
          const featureStories = stories.filter(s => s.parent?.id === feature.id);
          return renderWorkItem(feature, 0,
            featureStories.length > 0 && (
              <div className="pl-4 pb-2">
                {featureStories.map(story => renderWorkItem(story, 1))}
              </div>
            )
          );
        })}

        {/* Standalone stories */}
        {stories.filter(s => !s.parent).map(story => renderWorkItem(story, 0))}

        {/* Defects */}
        {defects.map(defect => renderWorkItem(defect, 0))}
      </div>
    );
  };

  if (filteredItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">No Work Items</p>
        <p className="text-sm text-muted-foreground">
          No work items are currently assigned to this resource.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-b border-border/40">
      {/* Filter Header */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border/40 bg-muted/30">
        <h3 className="text-base font-semibold text-foreground">Work Context Hierarchy</h3>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['all', 'current', 'past'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activeFilter === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {renderHierarchy()}
        </div>
      </ScrollArea>
    </div>
  );
}
