import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Search across multiple entities
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', search],
    queryFn: async () => {
      if (search.length < 2) return { features: [], epics: [], stories: [], themes: [] };

      const [featuresRes, epicsRes, storiesRes, themesRes] = await Promise.all([
        supabase
          .from('features')
          .select('id, name')
          .ilike('name', `%${search}%`)
          .limit(5),
        supabase
          .from('epics')
          .select('id, name')
          .ilike('name', `%${search}%`)
          .limit(5),
        supabase
          .from('stories')
          .select('id, name')
          .ilike('name', `%${search}%`)
          .limit(5),
        supabase
          .from('strategic_themes')
          .select('id, name')
          .ilike('name', `%${search}%`)
          .limit(5),
      ]);

      return {
        features: featuresRes.data || [],
        epics: epicsRes.data || [],
        stories: storiesRes.data || [],
        themes: themesRes.data || [],
      };
    },
    enabled: search.length >= 2 && open,
  });

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    setSearch('');
    
    // Navigate to appropriate page based on type
    const routes: Record<string, string> = {
      feature: '/features',
      epic: '/epics',
      story: '/stories',
      theme: '/themes',
    };
    
    navigate(routes[type] || '/');
  };

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
          placeholder="Search features, epics, stories, themes..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? 'Searching...' : 'No results found.'}
          </CommandEmpty>

          {searchResults?.features && searchResults.features.length > 0 && (
            <CommandGroup heading="Features">
              {searchResults.features.map((item: any) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect('feature', item.id)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchResults?.epics && searchResults.epics.length > 0 && (
            <CommandGroup heading="Epics">
              {searchResults.epics.map((item: any) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect('epic', item.id)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchResults?.stories && searchResults.stories.length > 0 && (
            <CommandGroup heading="Stories">
              {searchResults.stories.map((item: any) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect('story', item.id)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchResults?.themes && searchResults.themes.length > 0 && (
            <CommandGroup heading="Strategic Themes">
              {searchResults.themes.map((item: any) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect('theme', item.id)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
