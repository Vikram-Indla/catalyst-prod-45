/**
 * AI Generator - From Requirements Tab
 * Select stories, features, epics, defects, or incidents to generate test cases
 */

import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  BookOpen, 
  Layers, 
  Target, 
  Bug, 
  AlertTriangle, 
  X,
  Link2
} from 'lucide-react';
import { useLinkedItemsForAI, LinkedItem, LinkedItemType } from '@/hooks/test-management/useLinkedItemsForAI';
import { cn } from '@/lib/utils';

interface AIFromRequirementsProps {
  projectId: string;
  selectedItems: LinkedItem[];
  onSelectionChange: (items: LinkedItem[]) => void;
}

const ITEM_TYPES: { value: LinkedItemType; label: string; icon: typeof BookOpen; color: string }[] = [
  { value: 'story', label: 'Story', icon: BookOpen, color: 'text-blue-600' },
  { value: 'feature', label: 'Feature', icon: Layers, color: 'text-purple-600' },
  { value: 'epic', label: 'Epic', icon: Target, color: 'text-indigo-600' },
  { value: 'defect', label: 'Defect', icon: Bug, color: 'text-red-600' },
  { value: 'incident', label: 'Incident', icon: AlertTriangle, color: 'text-orange-600' },
];

export function AIFromRequirements({
  projectId,
  selectedItems,
  onSelectionChange,
}: AIFromRequirementsProps) {
  const [itemType, setItemType] = useState<LinkedItemType>('story');
  const { items, loading, searchQuery, setSearchQuery } = useLinkedItemsForAI(projectId, itemType);

  const toggleItem = (item: LinkedItem) => {
    const exists = selectedItems.find(i => i.id === item.id);
    if (exists) {
      onSelectionChange(selectedItems.filter(i => i.id !== item.id));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  const removeItem = (itemId: string) => {
    onSelectionChange(selectedItems.filter(i => i.id !== itemId));
  };

  const currentTypeConfig = ITEM_TYPES.find(t => t.value === itemType);

  return (
    <div className="space-y-5">
      {/* Source Selection Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
          <Link2 className="w-4 h-4 text-primary" />
          SELECT REQUIREMENT SOURCE
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              ITEM TYPE
            </label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as LinkedItemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              SEARCH ITEMS
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${itemType}s...`}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b">
            Available Items (filtered by project)
          </div>
          <ScrollArea className="h-[240px]">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                Loading {itemType}s...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No {itemType}s found in this project
              </div>
            ) : (
              <div className="divide-y">
                {items.map(item => {
                  const isSelected = selectedItems.some(i => i.id === item.id);
                  const Icon = currentTypeConfig?.icon || BookOpen;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 cursor-pointer transition-colors hover:bg-gray-50",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                      onClick={() => toggleItem(item)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(item)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4 shrink-0", currentTypeConfig?.color)} />
                            <span className="font-mono text-xs text-gray-500">{item.key}</span>
                            <span className="font-medium text-sm truncate">{item.title}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <Badge variant="secondary" className="mt-1.5 text-[10px]">
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-t">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </div>
        </div>
      </div>

      {/* Selected Items Preview */}
      {selectedItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
            <Target className="w-4 h-4 text-primary" />
            SELECTED REQUIREMENTS PREVIEW
          </div>

          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {selectedItems.map(item => {
              const typeConfig = ITEM_TYPES.find(t => t.value === item.type);
              const Icon = typeConfig?.icon || BookOpen;
              return (
                <div
                  key={item.id}
                  className="relative bg-gray-50 rounded-lg p-4 border"
                >
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-3 right-3 p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("h-4 w-4", typeConfig?.color)} />
                    <span className="font-medium text-sm">
                      {item.key}: {item.title}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
