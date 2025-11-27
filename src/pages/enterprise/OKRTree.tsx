import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useOKRTree } from '@/hooks/useOKRTree';
import { Skeleton } from '@/components/ui/skeleton';

export default function OKRTree() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { data: okrTree, isLoading } = useOKRTree();

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderTreeItem = (item: any, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const paddingLeft = level * 24;

    return (
      <div key={item.id}>
        <div 
          className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
          style={{ paddingLeft: `${paddingLeft + 8}px`, height: 'var(--grid-row)' }}
          onClick={() => hasChildren && toggleExpand(item.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="w-4" />
          )}
          
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">({item.tier})</span>
            </div>
            
            <div className="flex items-center gap-4">
              {item.score !== undefined && (
                <span className={`text-sm font-medium ${getScoreColor(item.score)}`}>
                  {Math.round(item.score * 100)}%
                </span>
              )}
              {item.owner && (
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                    {item.ownerInitials}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.owner}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {item.children.map((child: any) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals/objectives/KRs..."
            className="pl-9"
            style={{ height: 'var(--grid-row)' }}
          />
        </div>
        
        <Select defaultValue="all-status">
          <SelectTrigger className="w-[180px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">All Status</SelectItem>
            <SelectItem value="on-track">On track</SelectItem>
            <SelectItem value="at-risk">At risk</SelectItem>
            <SelectItem value="off-track">Off track</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tree View */}
      <Card>
        <CardHeader>
          <CardTitle>OKR Tree</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : okrTree && okrTree.length > 0 ? (
            <div className="space-y-1">
              {okrTree.map((item) => renderTreeItem(item))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No OKR data available. Please select a snapshot.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}