/**
 * TM Global Search - Command palette for Test Management
 * Search across test cases, cycles, defects with quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  RefreshCw,
  Bug,
  Plus,
  Clock,
  Command,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'case' | 'cycle' | 'defect';
  key: string;
  title: string;
  status?: string;
}

interface TMGlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock recent items
const mockRecentItems: SearchResult[] = [
  { id: '1', type: 'case', key: 'TC-045', title: 'Login with valid credentials', status: 'Ready' },
  { id: '2', type: 'cycle', key: 'CY-015', title: 'Sprint 24 Regression', status: 'In Progress' },
  { id: '3', type: 'defect', key: 'DEF-089', title: 'Login button unresponsive', status: 'Open' },
];

// Mock search results
const mockSearchData: SearchResult[] = [
  { id: '1', type: 'case', key: 'TC-001', title: 'User registration flow', status: 'Ready' },
  { id: '2', type: 'case', key: 'TC-002', title: 'Password reset functionality', status: 'Draft' },
  { id: '3', type: 'case', key: 'TC-045', title: 'Login with valid credentials', status: 'Ready' },
  { id: '4', type: 'cycle', key: 'CY-014', title: 'Sprint 23 Smoke Tests', status: 'Completed' },
  { id: '5', type: 'cycle', key: 'CY-015', title: 'Sprint 24 Regression', status: 'In Progress' },
  { id: '6', type: 'defect', key: 'DEF-088', title: 'Form validation errors', status: 'Fixed' },
  { id: '7', type: 'defect', key: 'DEF-089', title: 'Login button unresponsive', status: 'Open' },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'case':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'cycle':
      return <RefreshCw className="h-4 w-4 text-teal-500" />;
    case 'defect':
      return <Bug className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getTypePath = (type: string, id: string) => {
  switch (type) {
    case 'case':
      return `/test-management/cases?caseId=${id}`;
    case 'cycle':
      return `/test-management/cycles/${id}`;
    case 'defect':
      return `/test-management/defects?defectId=${id}`;
    default:
      return '/test-management';
  }
};

export function TMGlobalSearch({ open, onOpenChange }: TMGlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Filter results based on query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = mockSearchData.filter(
      (item) =>
        item.key.toLowerCase().includes(query.toLowerCase()) ||
        item.title.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      navigate(getTypePath(item.type, item.id));
      onOpenChange(false);
      setQuery('');
    },
    [navigate, onOpenChange]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'create-case':
          navigate('/test-management/cases?create=true');
          break;
        case 'create-cycle':
          navigate('/test-management/cycles?create=true');
          break;
        case 'create-defect':
          navigate('/test-management/defects?create=true');
          break;
      }
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Group results by type
  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search cases, cycles, defects..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center py-6">
            <Search className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No results found</p>
          </div>
        </CommandEmpty>

        {!query.trim() && (
          <>
            {/* Recent Items */}
            <CommandGroup heading="Recent">
              {mockRecentItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-2"
                >
                  {getTypeIcon(item.type)}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.key}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => handleQuickAction('create-case')}
                className="flex items-center gap-3"
              >
                <Plus className="h-4 w-4 text-blue-500" />
                <span>Create Test Case</span>
                <CommandShortcut>⌘⇧C</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleQuickAction('create-cycle')}
                className="flex items-center gap-3"
              >
                <Plus className="h-4 w-4 text-teal-500" />
                <span>Create Cycle</span>
                <CommandShortcut>⌘⇧Y</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleQuickAction('create-defect')}
                className="flex items-center gap-3"
              >
                <Plus className="h-4 w-4 text-red-500" />
                <span>Create Defect</span>
                <CommandShortcut>⌘⇧D</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Search Results */}
        {query.trim() && groupedResults.case && (
          <CommandGroup heading="Test Cases">
            {groupedResults.case.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 py-2"
              >
                {getTypeIcon(item.type)}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.key}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.trim() && groupedResults.cycle && (
          <CommandGroup heading="Test Cycles">
            {groupedResults.cycle.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 py-2"
              >
                {getTypeIcon(item.type)}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.key}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.trim() && groupedResults.defect && (
          <CommandGroup heading="Defects">
            {groupedResults.defect.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 py-2"
              >
                {getTypeIcon(item.type)}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.key}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
