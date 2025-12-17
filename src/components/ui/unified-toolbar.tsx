import * as React from "react";
import { Search, Filter, ArrowUpDown, LayoutGrid, LayoutList, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Unified focus ring class - single source of truth
const focusRingClass = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-1)]";

interface UnifiedToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortOptions?: { label: string; value: string }[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  density?: "compact" | "comfortable";
  onDensityChange?: (density: "compact" | "comfortable") => void;
  filterContent?: React.ReactNode;
  activeFilters?: number;
  className?: string;
}

export function UnifiedToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortOptions,
  sortValue,
  onSortChange,
  density = "comfortable",
  onDensityChange,
  filterContent,
  activeFilters = 0,
  className,
}: UnifiedToolbarProps) {
  const [searchFocused, setSearchFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle ⌘K shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-2 h-10 px-2 rounded-lg",
        // Champagne surface with gold border
        "bg-[var(--surface-champagne)] border border-[var(--border-gold)]",
        className
      )}
    >
      {/* LEFT CLUSTER: Search + Filter + Sort */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {/* Search Input */}
        <div
          className={cn(
            "flex items-center gap-2 flex-1 min-w-0 max-w-xs h-7 px-2 rounded-md transition-all",
            searchFocused && "ring-2 ring-[var(--focus-ring)] ring-offset-1 ring-offset-[var(--surface-1)]"
          )}
        >
          <Search className="h-3.5 w-3.5 text-[var(--brand-gold)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "flex-1 min-w-0 bg-transparent text-sm text-[var(--text-1)]",
              "placeholder:text-[var(--text-3)]",
              "outline-none border-none"
            )}
          />
          {searchValue ? (
            <button
              onClick={() => onSearchChange("")}
              className={cn("p-0.5 rounded hover:bg-[var(--surface-2)]", focusRingClass)}
            >
              <X className="h-3 w-3 text-[var(--icon-muted)]" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border-gold)]">
              {navigator.platform.includes("Mac") ? "⌘" : "⌃"}K
            </kbd>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--border-gold)]" />

        {/* Filter Button */}
        {filterContent && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-7 px-2 inline-flex items-center gap-1 rounded-md text-xs font-medium transition-colors",
                  "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                  focusRingClass,
                  // Olive when active
                  activeFilters > 0 && "text-[var(--brand-primary)]"
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilters > 0 && (
                  // Olive badge
                  <span className="ml-0.5 px-1 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--brand-primary)] text-[var(--text-inverse)]">
                    {activeFilters}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-72 p-3 bg-[var(--surface-1)] border-[var(--border-gold)]"
            >
              {filterContent}
            </PopoverContent>
          </Popover>
        )}

        {/* Sort Button */}
        {sortOptions && onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "h-7 px-2 inline-flex items-center gap-1 rounded-md text-xs font-medium transition-colors",
                  "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                  focusRingClass
                )}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sort</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[var(--surface-1)] border-[var(--border-gold)]"
            >
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    "cursor-pointer text-[var(--text-1)]",
                    sortValue === option.value && "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* RIGHT CLUSTER: View dropdown */}
      {onDensityChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "h-7 px-2 inline-flex items-center gap-1 rounded-md text-xs font-medium transition-colors",
                "text-[var(--text-2)] hover:bg-[var(--surface-2)] border border-[var(--border-gold)]",
                focusRingClass
              )}
            >
              {density === "compact" ? (
                <LayoutList className="h-3.5 w-3.5" />
              ) : (
                <LayoutGrid className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">View</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[var(--surface-1)] border-[var(--border-gold)] min-w-[140px]"
          >
            <DropdownMenuItem
              onClick={() => onDensityChange("compact")}
              className={cn(
                "cursor-pointer text-[var(--text-1)] flex items-center gap-2",
                density === "compact" && "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Compact
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDensityChange("comfortable")}
              className={cn(
                "cursor-pointer text-[var(--text-1)] flex items-center gap-2",
                density === "comfortable" && "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Comfortable
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
