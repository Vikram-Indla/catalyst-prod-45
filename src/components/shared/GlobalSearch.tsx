import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Zap, BookOpen, Target, AlertTriangle, ClipboardList } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  key: string;
  name: string;
  type: 'epic' | 'feature' | 'story' | 'theme' | 'risk' | 'business_request';
  status?: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  epic: { icon: Zap, label: 'Epic', color: 'bg-purple-100 text-purple-700' },
  feature: { icon: FileText, label: 'Feature', color: 'bg-blue-100 text-blue-700' },
  story: { icon: BookOpen, label: 'Story', color: 'bg-green-100 text-green-700' },
  theme: { icon: Target, label: 'Theme', color: 'bg-amber-100 text-amber-700' },
  risk: { icon: AlertTriangle, label: 'Risk', color: 'bg-orange-100 text-orange-700' },
  business_request: { icon: ClipboardList, label: 'Demand', color: 'bg-brand-gold/20 text-brand-gold' },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search across multiple entities including key-based search
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', search],
    queryFn: async (): Promise<SearchResult[]> => {
      if (search.length < 2) return [];

      const searchTerm = search.trim();
      const isKeySearch = /^[A-Za-z]+-\d+$/.test(searchTerm) || /^\d+$/.test(searchTerm);

      const results: SearchResult[] = [];

      // Search epics
      const epicsQuery = supabase
        .from('epics')
        .select('id, name, epic_key, status')
        .or(isKeySearch 
          ? `epic_key.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`
          : `name.ilike.%${searchTerm}%`)
        .limit(5);
      
      // Search features
      const featuresQuery = supabase
        .from('features')
        .select('id, name, display_id, status')
        .or(isKeySearch
          ? `display_id.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`
          : `name.ilike.%${searchTerm}%`)
        .limit(5);

      // Search stories
      const storiesQuery = supabase
        .from('stories')
        .select('id, name, story_key, status')
        .or(isKeySearch
          ? `story_key.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`
          : `name.ilike.%${searchTerm}%`)
        .limit(5);

      // Search themes
      const themesQuery = supabase
        .from('strategic_themes')
        .select('id, name')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      // Search risks
      const risksQuery = supabase
        .from('risks')
        .select('id, title, risk_number, status')
        .or(isKeySearch
          ? `risk_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`
          : `title.ilike.%${searchTerm}%`)
        .limit(5);

      // Search business requests
      const businessRequestsQuery = supabase
        .from('business_requests')
        .select('id, title, request_key, process_step')
        .or(isKeySearch
          ? `request_key.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`
          : `title.ilike.%${searchTerm}%`)
        .limit(5);

      const [epics, features, stories, themes, risks, businessRequests] = await Promise.all([
        epicsQuery,
        featuresQuery,
        storiesQuery,
        themesQuery,
        risksQuery,
        businessRequestsQuery,
      ]);

      // Map results
      if (epics.data) {
        results.push(...epics.data.map(e => ({
          id: e.id,
          key: e.epic_key || `E-${e.id.slice(0, 4)}`,
          name: e.name,
          type: 'epic' as const,
          status: e.status || undefined,
        })));
      }

      if (features.data) {
        results.push(...features.data.map(f => ({
          id: f.id,
          key: f.display_id || `F-${f.id.slice(0, 4)}`,
          name: f.name,
          type: 'feature' as const,
          status: f.status || undefined,
        })));
      }

      if (stories.data) {
        results.push(...stories.data.map(s => ({
          id: s.id,
          key: s.story_key || `S-${s.id.slice(0, 4)}`,
          name: s.name,
          type: 'story' as const,
          status: s.status || undefined,
        })));
      }

      if (themes.data) {
        results.push(...themes.data.map(t => ({
          id: t.id,
          key: `T-${t.id.slice(0, 4)}`,
          name: t.name,
          type: 'theme' as const,
        })));
      }

      if (risks.data) {
        results.push(...risks.data.map(r => ({
          id: r.id,
          key: r.risk_number ? `R-${r.risk_number}` : `R-${r.id.slice(0, 4)}`,
          name: r.title,
          type: 'risk' as const,
          status: r.status || undefined,
        })));
      }

      if (businessRequests.data) {
        results.push(...businessRequests.data.map(br => ({
          id: br.id,
          key: br.request_key || `MIM-${br.id.slice(0, 4)}`,
          name: br.title,
          type: 'business_request' as const,
          status: br.process_step || undefined,
        })));
      }

      return results;
    },
    enabled: search.length >= 2 && open,
  });

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setSearch('');
    
    // Navigate to /browse/:key for universal work item viewing
    navigate(`/browse/${result.key}`);
  }, [navigate]);

  // Group results by type
  const groupedResults = searchResults?.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>) || {};

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search by name or key (e.g., E-101, F-234, MIM-001)..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : search.length < 2 ? (
              <div className="py-6 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Type to search work items</p>
                <p className="text-xs text-muted-foreground mt-1">Search by name or key (e.g., E-101)</p>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No results found for "{search}"</p>
              </div>
            )}
          </CommandEmpty>

          {Object.entries(groupedResults).map(([type, items], index) => {
            const config = TYPE_CONFIG[type];
            if (!config || items.length === 0) return null;
            
            const Icon = config.icon;
            
            return (
              <div key={type}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={config.label + 's'}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.key} ${item.name}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3 py-2"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Badge variant="outline" className={`${config.color} text-xs shrink-0`}>
                        {item.key}
                      </Badge>
                      <span className="truncate flex-1">{item.name}</span>
                      {item.status && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {item.status}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
