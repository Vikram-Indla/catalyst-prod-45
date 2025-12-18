import { useState, useMemo } from 'react';
import { Search, Plus, X, FileText, Layers, Square, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Mock work items - in production these would come from the database
const MOCK_WORK_ITEMS: WorkItem[] = [
  { id: '1', key: 'BAU-1001', title: 'Implement user authentication flow', type: 'story' as const, status: 'in_progress' },
  { id: '2', key: 'BAU-1002', title: 'Database migration for new schema', type: 'story' as const, status: 'done' },
  { id: '3', key: 'BAU-2001', title: 'Payment Processing Integration', type: 'feature' as const, status: 'in_progress' },
  { id: '4', key: 'BAU-2002', title: 'Multi-tenant Support', type: 'feature' as const, status: 'backlog' },
  { id: '5', key: 'BAU-3001', title: 'Platform Modernization', type: 'epic' as const, status: 'in_progress' },
  { id: '6', key: 'BAU-3002', title: 'Security Enhancement Initiative', type: 'epic' as const, status: 'planning' },
  { id: '7', key: 'BAU-1003', title: 'Fix login timeout issue', type: 'story' as const, status: 'backlog' },
  { id: '8', key: 'BAU-1004', title: 'Add password reset functionality', type: 'story' as const, status: 'in_progress' },
];

type WorkItemType = 'story' | 'feature' | 'epic';

interface WorkItem {
  id: string;
  key: string;
  title: string;
  type: WorkItemType;
  status: string;
}

interface LinkedWorkItemsPickerProps {
  linkedItems: WorkItem[];
  onLink: (item: WorkItem) => void;
  onUnlink: (itemId: string) => void;
  disabled?: boolean;
}

const TYPE_ICONS: Record<WorkItemType, React.ReactNode> = {
  story: <FileText className="h-3.5 w-3.5 text-blue-600" />,
  feature: <Layers className="h-3.5 w-3.5 text-purple-600" />,
  epic: <Square className="h-3.5 w-3.5 text-teal-600" />,
};

const TYPE_COLORS: Record<WorkItemType, string> = {
  story: 'bg-blue-100 text-blue-800 border-blue-200',
  feature: 'bg-purple-100 text-purple-800 border-purple-200',
  epic: 'bg-teal-100 text-teal-800 border-teal-200',
};

export function LinkedWorkItemsPicker({
  linkedItems,
  onLink,
  onUnlink,
  disabled = false,
}: LinkedWorkItemsPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkItemType | 'all'>('all');

  const linkedItemIds = linkedItems.map(i => i.id);

  const availableItems = useMemo(() => {
    let items = MOCK_WORK_ITEMS.filter(i => !linkedItemIds.includes(i.id));
    
    if (typeFilter !== 'all') {
      items = items.filter(i => i.type === typeFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => 
        i.key.toLowerCase().includes(q) || 
        i.title.toLowerCase().includes(q)
      );
    }
    
    return items;
  }, [linkedItemIds, typeFilter, searchQuery]);

  return (
    <>
      <div className="space-y-2">
        {/* Linked Items List */}
        {linkedItems.length > 0 ? (
          <div className="space-y-1">
            {linkedItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border hover:bg-muted/70 group"
              >
                {TYPE_ICONS[item.type]}
                <span className="font-mono text-xs font-medium text-brand-primary">{item.key}</span>
                <span className="text-xs text-foreground flex-1 truncate">{item.title}</span>
                <Badge variant="outline" className={cn("text-[9px] px-1 py-0 capitalize", TYPE_COLORS[item.type])}>
                  {item.type}
                </Badge>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onUnlink(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <X className="h-3 w-3 text-red-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic py-2">No linked work items</p>
        )}

        {/* Add Link Button */}
        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(true)}
            className="w-full h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Link Work Item
          </Button>
        )}
      </div>

      {/* Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Work Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by key or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'story', 'feature', 'epic'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "h-9 text-xs capitalize",
                      typeFilter === type && "bg-brand-primary"
                    )}
                  >
                    {type === 'all' ? 'All' : type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {availableItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No matching work items found
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onLink(item);
                        setShowPicker(false);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left transition-colors"
                    >
                      {TYPE_ICONS[item.type]}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-brand-primary">{item.key}</span>
                          <Badge variant="outline" className={cn("text-[9px] px-1 py-0 capitalize", TYPE_COLORS[item.type])}>
                            {item.type}
                          </Badge>
                        </div>
                        <span className="text-sm text-foreground line-clamp-1">{item.title}</span>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
