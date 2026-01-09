/**
 * More Filters Panel Component
 * Extended filters: date range, tags, linked items, AI-generated
 */

import { useState } from 'react';
import { X, Sparkles, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface MoreFiltersState {
  dateField: 'updated_at' | 'created_at';
  dateFrom: string;
  dateTo: string;
  tags: string[];
  hasLinkedItemsOnly: boolean;
  aiGeneratedOnly: boolean;
}

interface MoreFiltersPanelProps {
  filters: MoreFiltersState;
  onFiltersChange: (filters: MoreFiltersState) => void;
  onApply: () => void;
  onClear: () => void;
  availableTags?: string[];
}

export function MoreFiltersPanel({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  availableTags = [],
}: MoreFiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.tags.length > 0 || 
    filters.hasLinkedItemsOnly || 
    filters.aiGeneratedOnly;

  const addTag = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      onFiltersChange({
        ...filters,
        tags: [...filters.tags, tag],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags.filter((t) => t !== tag),
    });
  };

  const handleApply = () => {
    onApply();
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Calendar className="h-4 w-4" />
          More
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {(filters.dateFrom || filters.dateTo ? 1 : 0) + 
               (filters.tags.length > 0 ? 1 : 0) + 
               (filters.hasLinkedItemsOnly ? 1 : 0) + 
               (filters.aiGeneratedOnly ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <Select
              value={filters.dateField}
              onValueChange={(v) => onFiltersChange({ ...filters, dateField: v as 'updated_at' | 'created_at' })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Updated</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                className="h-8 text-sm"
                placeholder="From"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                className="h-8 text-sm"
                placeholder="To"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <Input
              placeholder="Type to add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput.trim());
                }
              }}
              className="h-8 text-sm"
            />
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {filters.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Has Linked Items */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasLinked"
              checked={filters.hasLinkedItemsOnly}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, hasLinkedItemsOnly: checked === true })
              }
            />
            <Label htmlFor="hasLinked" className="text-sm cursor-pointer">
              Has linked items only
            </Label>
          </div>

          {/* AI Generated */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="aiGenerated"
              checked={filters.aiGeneratedOnly}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, aiGeneratedOnly: checked === true })
              }
            />
            <Label htmlFor="aiGenerated" className="text-sm cursor-pointer flex items-center gap-1.5">
              AI-generated only
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
            Clear all
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
