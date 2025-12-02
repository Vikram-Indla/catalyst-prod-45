import { useState } from 'react';
import { ChevronRight, ChevronDown, Target, FileText, CheckSquare, ListTodo, Star, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface WorkTreeHierarchyProps {
  view: string;
  data: any;
  isLoading: boolean;
  narrowToProgram: boolean;
}

interface TreeNode {
  id: string;
  type: 'goal' | 'theme-group' | 'theme' | 'epic' | 'feature' | 'story' | 'task' | 'section';
  title: string;
  health?: 'green' | 'yellow' | 'red' | 'gray';
  points?: number;
  itemCount?: number;
  progress?: number;
  children?: TreeNode[];
  hasMultiplePrograms?: boolean;
  hasLinks?: boolean;
  hasDiscussions?: boolean;
  hasQuestions?: boolean;
  hasTags?: boolean;
}

export function WorkTreeHierarchy({ view, data, isLoading, narrowToProgram }: WorkTreeHierarchyProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Star className="h-4 w-4" />;
      case 'theme-group': return <Target className="h-4 w-4" />;
      case 'theme': return <Target className="h-4 w-4" />;
      case 'epic': return <FileText className="h-4 w-4" />;
      case 'feature': return <CheckSquare className="h-4 w-4" />;
      case 'story': return <FileText className="h-4 w-4" />;
      case 'task': return <ListTodo className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getHealthColor = (health?: string) => {
    switch (health) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 hover:bg-muted/50 cursor-pointer group",
            "border-b border-border"
          )}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 flex items-center justify-center">
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            )}
          </div>

          {/* Work Item Icon */}
          <div className="w-5 flex items-center justify-center text-muted-foreground">
            {getIcon(node.type)}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{node.title}</span>
          </div>

          {/* Health Indicator - always render container for alignment */}
          <div className="w-12 flex items-center justify-center">
            {node.health ? (
              <div className={cn("w-3 h-3 rounded-full", getHealthColor(node.health))} />
            ) : (
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            )}
          </div>

          {/* Points - always render for alignment */}
          <div className="text-sm text-muted-foreground w-16 text-right">
            {node.points ?? '-'}
          </div>

          {/* Item Count - always render for alignment */}
          <div className="text-sm text-muted-foreground w-16 text-right">
            {node.itemCount ?? '-'}
          </div>

          {/* Progress - always render for alignment */}
          <div className="w-24">
            <Progress value={node.progress ?? 0} className="h-2" />
          </div>

          {/* Indicators */}
          <div className="flex items-center gap-1">
            {node.hasMultiplePrograms && (
              <Badge variant="outline" className="h-5 px-1 text-xs">MP</Badge>
            )}
            {node.hasLinks && (
              <Badge variant="outline" className="h-5 px-1 text-xs">🔗</Badge>
            )}
            {node.hasDiscussions && (
              <Badge variant="outline" className="h-5 px-1 text-xs">💬</Badge>
            )}
            {node.hasQuestions && (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            {node.hasTags && (
              <Badge variant="outline" className="h-5 px-1 text-xs">🏷️</Badge>
            )}
          </div>
        </div>

        {/* Render Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading work tree...</div>
      </div>
    );
  }

  if (!data?.tree || data.tree.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">No work items found</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Column Headers */}
      <div className="bg-muted/50 border-b px-2 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <div className="w-4" />
        <div className="w-5" />
        <div className="flex-1">Title</div>
        <div className="w-12">Health</div>
        <div className="w-16 text-right">Points</div>
        <div className="w-16 text-right">Items</div>
        <div className="w-24 text-center">Progress</div>
        <div className="w-32" />
      </div>

      {/* Tree Nodes */}
      <div>
        {data.tree.map((node: TreeNode) => renderNode(node))}
      </div>
    </div>
  );
}
