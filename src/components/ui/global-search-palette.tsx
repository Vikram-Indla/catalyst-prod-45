import * as React from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Zap, Star, BookOpen, AlertTriangle, CheckSquare, Bug, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getValidatedWorkItemRoute } from "@/lib/workItemRoutes";

interface GlobalSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GlobalSearchWorkItemType = 
  | 'business-request' 
  | 'epic' 
  | 'feature' 
  | 'story' 
  | 'incident' 
  | 'task'
  | 'defect';

interface SearchResult {
  id: string;
  key: string;
  summary: string;
  type: GlobalSearchWorkItemType;
  scopeName: string;
  updatedAt: string;
}

// Type icons and colors
const TYPE_CONFIG: Record<GlobalSearchWorkItemType, { icon: React.ElementType; color: string; label: string }> = {
  'business-request': { icon: FileText, color: '#2563eb', label: 'Business Request' },
  'epic': { icon: Zap, color: '#904EE2', label: 'Epic' },
  'feature': { icon: Star, color: '#6554C0', label: 'Feature' },
  'story': { icon: BookOpen, color: '#36B37E', label: 'Story' },
  'incident': { icon: AlertTriangle, color: '#FF5630', label: 'Incident' },
  'task': { icon: CheckSquare, color: '#0065FF', label: 'Task' },
  'defect': { icon: Bug, color: '#FF5630', label: 'Defect' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export function GlobalSearchPalette({ open, onOpenChange }: GlobalSearchPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Search across multiple tables
  React.useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const searchItems = async () => {
      setIsLoading(true);
      const searchTerm = `%${search}%`;
      const searchResults: SearchResult[] = [];

      try {
        // Search epics
        const { data: epics } = await supabase
          .from('epics')
          .select('id, epic_key, name, updated_at')
          .or(`epic_key.ilike.${searchTerm},name.ilike.${searchTerm}`)
          .limit(5);
        
        epics?.forEach(e => searchResults.push({
          id: e.id,
          key: e.epic_key || '',
          summary: e.name,
          type: 'epic',
          scopeName: 'Epic',
          updatedAt: e.updated_at || new Date().toISOString(),
        }));

        // Search features
        const { data: features } = await supabase
          .from('features')
          .select('id, name, updated_at')
          .ilike('name', searchTerm)
          .limit(5);
        
        features?.forEach(f => searchResults.push({
          id: f.id,
          key: f.id.slice(0, 8).toUpperCase(),
          summary: f.name,
          type: 'feature',
          scopeName: 'Feature',
          updatedAt: f.updated_at || new Date().toISOString(),
        }));

        // Search stories
        const { data: stories } = await supabase
          .from('stories')
          .select('id, story_key, title, updated_at')
          .or(`story_key.ilike.${searchTerm},title.ilike.${searchTerm}`)
          .limit(5);
        
        stories?.forEach(s => searchResults.push({
          id: s.id,
          key: s.story_key || '',
          summary: s.title,
          type: 'story',
          scopeName: 'Story',
          updatedAt: s.updated_at || new Date().toISOString(),
        }));

        // Search incidents
        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, incident_key, title, updated_at')
          .or(`incident_key.ilike.${searchTerm},title.ilike.${searchTerm}`)
          .is('deleted_at', null)
          .limit(5);
        
        incidents?.forEach(i => searchResults.push({
          id: i.id,
          key: i.incident_key || '',
          summary: i.title,
          type: 'incident',
          scopeName: 'Incident',
          updatedAt: i.updated_at || new Date().toISOString(),
        }));

        // Search business requests
        const { data: requests } = await (supabase as any)
          .from('business_requests')
          .select('id, request_key, title, updated_at')
          .or(`request_key.ilike.${searchTerm},title.ilike.${searchTerm}`)
          .is('deleted_at', null)
          .limit(5);
        
        (requests as any[] || []).forEach((r: any) => searchResults.push({
          id: r.id,
          key: r.request_key || '',
          summary: r.title,
          type: 'business-request',
          scopeName: 'Business Request',
          updatedAt: r.updated_at,
        }));

        // Sort by updated_at
        searchResults.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setResults(searchResults.slice(0, 15));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch("");
      setResults([]);
    }
  }, [open]);

  const handleSelect = (item: SearchResult) => {
    // Use centralized route utility for consistent navigation
    const route = getValidatedWorkItemRoute({ 
      id: item.id, 
      key: item.key, 
      type: item.type === 'business-request' ? 'demand' : item.type 
    });
    if (route) {
      navigate(route);
    }
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="fixed left-1/2 top-[18%] -translate-x-1/2 w-full max-w-[680px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="rounded-xl border shadow-2xl overflow-hidden bg-popover border-border"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search work items…"
              style={{ outline: 'none', boxShadow: 'none' }}
              className={cn(
                "flex-1 h-7 bg-transparent text-sm text-foreground pl-1",
                "placeholder:text-muted-foreground",
                "!outline-none !border-none !ring-0 !shadow-none"
              )}
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Results List */}
          <Command.List className="max-h-[420px] overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Searching...
              </div>
            )}

            {!isLoading && search.trim() && results.length === 0 && (
              <Command.Empty className="py-12 text-center">
                <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No results found for "{search}"</p>
                <p className="text-xs text-muted-foreground mt-1 opacity-70">Try searching by key or title</p>
              </Command.Empty>
            )}

            {!isLoading && !search.trim() && (
              <div className="py-12 text-center">
                <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Start typing to search</p>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Results
                </div>
                <div className="px-2 pb-2">
                  {results.map((item) => {
                    const config = TYPE_CONFIG[item.type];
                    const Icon = config.icon;
                    return (
                      <Command.Item
                        key={`${item.type}-${item.id}`}
                        value={`${item.key} ${item.summary}`}
                        onSelect={() => handleSelect(item)}
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer",
                          "text-foreground",
                          "aria-selected:bg-accent",
                          "hover:bg-muted",
                          "transition-colors",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                      >
                        <div 
                          className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon className="w-3 h-3" style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-muted-foreground shrink-0">
                              {item.key}:
                            </span>
                            <span className="text-sm truncate text-foreground">
                              {item.summary}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{config.label}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(item.updatedAt)}
                        </div>
                      </Command.Item>
                    );
                  })}
                </div>
              </>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-background text-[10px]">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-background text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-background text-[10px]">Esc</kbd>
                Close
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {results.length} {results.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
