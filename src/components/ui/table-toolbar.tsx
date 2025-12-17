import * as React from "react";
import { Search, Filter, ArrowUpDown, Columns3, LayoutGrid, LayoutList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortOptions?: { label: string; value: string }[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  columns?: { id: string; label: string; visible: boolean }[];
  onColumnToggle?: (id: string) => void;
  density?: "compact" | "comfortable";
  onDensityChange?: (density: "compact" | "comfortable") => void;
  filterContent?: React.ReactNode;
  activeFilters?: number;
  className?: string;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortOptions,
  sortValue,
  onSortChange,
  columns,
  onColumnToggle,
  density = "comfortable",
  onDensityChange,
  filterContent,
  activeFilters = 0,
  className,
}: TableToolbarProps) {
  const [searchFocused, setSearchFocused] = React.useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-lg",
        "bg-[var(--surface-2)] border border-[var(--border-color)]",
        className
      )}
    >
      {/* Search */}
      <div
        className={cn(
          "flex items-center gap-2 flex-1 max-w-xs px-2 py-1.5 rounded-md transition-all",
          "border border-transparent",
          searchFocused && "border-[var(--border-accent)] bg-[var(--surface-1)]"
        )}
      >
        <Search className="h-4 w-4 text-[var(--icon-muted)] shrink-0" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            "flex-1 bg-transparent text-sm text-[var(--text-1)]",
            "placeholder:text-[var(--text-3)]",
            "outline-none border-none"
          )}
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange("")}
            className="p-0.5 rounded hover:bg-[var(--surface-3)]"
          >
            <X className="h-3 w-3 text-[var(--icon-muted)]" />
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-[var(--divider)]" />

      {/* Filter */}
      {filterContent && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                "text-[var(--text-2)] hover:bg-[var(--nav-hover-bg)]",
                activeFilters > 0 && "text-[var(--accent-color)]"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {activeFilters > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent-color)] text-[var(--text-inverse)]">
                  {activeFilters}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 p-3 bg-[var(--surface-1)] border-[var(--border-color)]"
          >
            {filterContent}
          </PopoverContent>
        </Popover>
      )}

      {/* Sort */}
      {sortOptions && onSortChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                "text-[var(--text-2)] hover:bg-[var(--nav-hover-bg)]"
              )}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-[var(--surface-1)] border-[var(--border-color)]"
          >
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  "cursor-pointer text-[var(--text-1)]",
                  sortValue === option.value && "bg-[var(--nav-hover-bg)]"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Columns */}
      {columns && onColumnToggle && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                "text-[var(--text-2)] hover:bg-[var(--nav-hover-bg)]"
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-[var(--surface-1)] border-[var(--border-color)]"
          >
            <DropdownMenuLabel className="text-xs text-[var(--text-3)]">
              Toggle columns
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.visible}
                onCheckedChange={() => onColumnToggle(col.id)}
                className="text-[var(--text-1)]"
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Density */}
      {onDensityChange && (
        <div className="flex items-center rounded-md border border-[var(--border-color)] overflow-hidden">
          <button
            onClick={() => onDensityChange("compact")}
            className={cn(
              "h-7 px-2 inline-flex items-center justify-center transition-colors",
              density === "compact"
                ? "bg-[var(--nav-active-bg)] text-[var(--text-1)]"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            )}
            title="Compact"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-[var(--divider)]" />
          <button
            onClick={() => onDensityChange("comfortable")}
            className={cn(
              "h-7 px-2 inline-flex items-center justify-center transition-colors",
              density === "comfortable"
                ? "bg-[var(--nav-active-bg)] text-[var(--text-1)]"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            )}
            title="Comfortable"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
