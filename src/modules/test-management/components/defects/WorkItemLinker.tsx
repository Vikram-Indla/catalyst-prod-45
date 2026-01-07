/**
 * WorkItemLinker - Smart search component for linking Catalyst work items
 * Supports Epic, Feature, Story, Test Case, Test Execution
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface LinkedWorkItem {
  id: string;
  key: string;
  title: string;
  type: 'epic' | 'feature' | 'story' | 'test_case' | 'test_execution';
  link_type: string;
}

interface WorkItemLinkerProps {
  value: LinkedWorkItem[];
  onChange: (items: LinkedWorkItem[]) => void;
  projectId?: string | null;
}

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  epic: { color: 'bg-purple-500', label: 'Epic' },
  feature: { color: 'bg-blue-500', label: 'Feature' },
  story: { color: 'bg-green-500', label: 'Story' },
  test_case: { color: 'bg-teal-500', label: 'Test Case' },
  test_execution: { color: 'bg-orange-500', label: 'Execution' },
};

const LINK_TYPES = [
  { value: 'discovered_by', label: 'Discovered by' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'blocked_by', label: 'Is blocked by' },
  { value: 'relates_to', label: 'Relates to' },
  { value: 'duplicates', label: 'Duplicates' },
];

export function WorkItemLinker({ value, onChange, projectId }: WorkItemLinkerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [linkType, setLinkType] = useState('relates_to');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search work items across tables
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['work-item-search', debouncedQuery, projectId],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const results: Array<{ id: string; key: string; title: string; type: string }> = [];
      
      // Search epics (uses 'name' column)
      const { data: epics } = await supabase
        .from('epics')
        .select('id, epic_key, name')
        .or(`epic_key.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`)
        .limit(5);
      
      epics?.forEach(e => results.push({
        id: e.id,
        key: e.epic_key || `EPIC-${e.id.slice(0, 4)}`,
        title: e.name,
        type: 'epic',
      }));

      // Search features (uses 'name' column)
      const { data: features } = await supabase
        .from('features')
        .select('id, name')
        .ilike('name', `%${debouncedQuery}%`)
        .limit(5);
      
      features?.forEach(f => results.push({
        id: f.id,
        key: `FEAT-${f.id.slice(0, 4).toUpperCase()}`,
        title: f.name,
        type: 'feature',
      }));

      // Search stories (has both 'name' and 'title')
      const { data: stories } = await supabase
        .from('stories')
        .select('id, story_key, title, name')
        .or(`story_key.ilike.%${debouncedQuery}%,title.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`)
        .limit(5);
      
      stories?.forEach(s => results.push({
        id: s.id,
        key: s.story_key || `STORY-${s.id.slice(0, 4)}`,
        title: s.title || s.name,
        type: 'story',
      }));

      // Search test cases
      const { data: testCases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title')
        .or(`case_key.ilike.%${debouncedQuery}%,title.ilike.%${debouncedQuery}%`)
        .limit(5);
      
      testCases?.forEach(tc => results.push({
        id: tc.id,
        key: tc.case_key || `TC-${tc.id.slice(0, 4)}`,
        title: tc.title,
        type: 'test_case',
      }));

      return results;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleAddItem = useCallback((item: { id: string; key: string; title: string; type: string }) => {
    if (value.some(v => v.id === item.id)) return;
    
    onChange([
      ...value,
      {
        id: item.id,
        key: item.key,
        title: item.title,
        type: item.type as LinkedWorkItem['type'],
        link_type: linkType,
      },
    ]);
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [value, linkType, onChange]);

  const handleRemoveItem = useCallback((id: string) => {
    onChange(value.filter(v => v.id !== id));
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search Catalyst items (Epic, Feature, Story, Test Case...)"
            className="pl-9 pr-4"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
        </div>
        
        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.length >= 2 && (
          <div 
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
            style={{ background: 'var(--bg-card)' }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleAddItem(item)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                >
                  <Circle 
                    className={cn(
                      "h-2.5 w-2.5 shrink-0",
                      TYPE_CONFIG[item.type]?.color
                    )} 
                    fill="currentColor"
                    style={{ color: TYPE_CONFIG[item.type]?.color.replace('bg-', '') }}
                  />
                  <span className="font-mono text-xs text-primary shrink-0">{item.key}</span>
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {TYPE_CONFIG[item.type]?.label}
                  </Badge>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No items found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Linked Items List */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border"
            >
              <div 
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  TYPE_CONFIG[item.type]?.color
                )} 
              />
              <span className="font-mono text-xs text-primary shrink-0">{item.key}</span>
              <span className="text-sm truncate flex-1">{item.title}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {LINK_TYPES.find(l => l.value === item.link_type)?.label || item.link_type}
              </Badge>
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Link Type Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Link type:</span>
        <Select value={linkType} onValueChange={setLinkType}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINK_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value} className="text-xs">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default WorkItemLinker;
