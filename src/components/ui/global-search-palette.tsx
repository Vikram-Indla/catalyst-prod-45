import * as React from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { 
  globalSearchItems, 
  getRecentSearchItems, 
  searchGlobalItems, 
  formatElapsedTime,
  getSearchItemTypeLabel,
  GlobalSearchItem 
} from "@/data/globalSearchData";
import { GlobalSearchTypeIcon } from "@/components/ja/icons/GlobalSearchTypeIcon";
import { cn } from "@/lib/utils";

interface GlobalSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEMS_PER_PAGE = 8;

// Unified focus ring class
const focusRingClass = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-1)]";

export function GlobalSearchPalette({ open, onOpenChange }: GlobalSearchPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [displayCount, setDisplayCount] = React.useState(ITEMS_PER_PAGE);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Get items based on search query
  const items = React.useMemo(() => {
    if (search.trim()) {
      return searchGlobalItems(search);
    }
    return getRecentSearchItems(displayCount);
  }, [search, displayCount]);

  // Handle keyboard shortcuts (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Focus input when opened, reset state when closed
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setDisplayCount(ITEMS_PER_PAGE);
    } else {
      setSearch("");
      setDisplayCount(ITEMS_PER_PAGE);
    }
  }, [open]);

  // Infinite scroll - load more when reaching bottom
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    
    if (bottom && !search.trim() && displayCount < globalSearchItems.length) {
      setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, globalSearchItems.length));
    }
  }, [search, displayCount]);

  const handleSelect = (item: GlobalSearchItem) => {
    // Navigate to work item details route
    navigate(`/work-item/${item.key}`);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-[var(--bg-overlay,rgba(0,0,0,0.5))] backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="fixed left-1/2 top-[18%] -translate-x-1/2 w-full max-w-[680px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className={cn(
            "rounded-xl border shadow-2xl overflow-hidden",
            "bg-[var(--surface-1)] border-[var(--border-color)]"
          )}
          shouldFilter={false} // We handle filtering ourselves
        >
          {/* Search Input - clean, no inner border */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--divider)]">
            <Search className="h-4 w-4 text-[var(--icon-muted)] shrink-0" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search work items…"
              className={cn(
                "flex-1 h-7 bg-transparent text-sm text-[var(--text-1)]",
                "placeholder:text-[var(--text-3)]",
                "outline-none border-none"
              )}
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border-color)] bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-3)]">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <Command.List 
            ref={listRef}
            className="max-h-[420px] overflow-y-auto"
            onScroll={handleScroll}
          >
            {/* Section Header */}
            {!search.trim() && (
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Recent
              </div>
            )}
            
            {search.trim() && items.length > 0 && (
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Results
              </div>
            )}

            {/* Empty State */}
            {search.trim() && items.length === 0 && (
              <Command.Empty className="py-12 text-center">
                <Search className="h-8 w-8 mx-auto mb-3 text-[var(--icon-muted)] opacity-50" />
                <p className="text-sm text-[var(--text-3)]">No results found for "{search}"</p>
                <p className="text-xs text-[var(--text-3)] mt-1 opacity-70">Try searching by key, title, or project name</p>
              </Command.Empty>
            )}

            {/* Results */}
            <div className="px-2 pb-2">
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.key} ${item.summary} ${item.scopeName}`}
                  onSelect={() => handleSelect(item)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer",
                    "text-[var(--text-1)]",
                    "aria-selected:bg-[var(--nav-hover-bg)]",
                    "hover:bg-[var(--surface-2)]",
                    "transition-colors",
                    focusRingClass
                  )}
                >
                  {/* Work Item Type Icon */}
                  <div className="shrink-0 mt-0.5">
                    <GlobalSearchTypeIcon type={item.type} size={18} />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Key + Summary */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-[var(--text-2)] shrink-0">
                        {item.key}:
                      </span>
                      <span className="text-sm truncate text-[var(--text-1)]">
                        {item.summary}
                      </span>
                    </div>
                    
                    {/* Meta Line */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-3)]">
                      <span>Catalyst</span>
                      <span className="opacity-50">•</span>
                      <span>{getSearchItemTypeLabel(item.type)}</span>
                      <span className="opacity-50">•</span>
                      <span>{item.scopeName}</span>
                    </div>
                  </div>

                  {/* Elapsed Time */}
                  <div className="shrink-0 text-[11px] text-[var(--text-3)] whitespace-nowrap">
                    {formatElapsedTime(item.lastActionAt, item.lastActionType)}
                  </div>
                </Command.Item>
              ))}
            </div>

            {/* Load More Indicator */}
            {!search.trim() && displayCount < globalSearchItems.length && (
              <div className="px-4 py-2 text-center text-[11px] text-[var(--text-3)] opacity-60">
                Scroll for more…
              </div>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--divider)] bg-[var(--surface-2)]">
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[10px]">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[10px]">Esc</kbd>
                Close
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-3)]">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
