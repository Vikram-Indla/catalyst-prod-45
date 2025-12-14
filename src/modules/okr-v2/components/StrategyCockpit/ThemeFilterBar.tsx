// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Theme Filter Bar Component
// Horizontal chip filter for strategic themes
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface ThemeChip {
  id: string;
  name: string;
  color: string;
}

interface ThemeFilterBarProps {
  themes: ThemeChip[];
  selectedThemeIds: string[];
  onThemeToggle: (themeId: string | null) => void;
}

export function ThemeFilterBar({ themes, selectedThemeIds, onThemeToggle }: ThemeFilterBarProps) {
  const isAllSelected = selectedThemeIds.length === 0;

  return (
    <div className="flex items-center gap-2.5 px-6 py-3 bg-card border-b border-border overflow-x-auto">
      <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider mr-1 flex-shrink-0">
        Themes:
      </span>

      {/* All Themes Button */}
      <button
        onClick={() => onThemeToggle(null)}
        className={cn(
          "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
          isAllSelected
            ? "border-2 border-brand-gold bg-brand-gold/10 text-brand-gold"
            : "border border-border bg-card text-muted-foreground hover:bg-muted"
        )}
      >
        All Themes
      </button>

      {/* Theme Chips */}
      {themes.map((theme) => {
        const isSelected = selectedThemeIds.includes(theme.id);
        return (
          <button
            key={theme.id}
            onClick={() => onThemeToggle(theme.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              isSelected
                ? "border-2 bg-opacity-10"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
            style={{
              borderColor: isSelected ? theme.color : undefined,
              backgroundColor: isSelected ? `${theme.color}10` : undefined,
              color: isSelected ? theme.color : undefined,
            }}
          >
            <span
              className={cn("w-2.5 h-2.5 rounded-full", isSelected && "ring-2 ring-opacity-30")}
              style={{
                backgroundColor: theme.color,
                boxShadow: isSelected ? `0 0 0 3px ${theme.color}30` : undefined,
              }}
            />
            {theme.name}
          </button>
        );
      })}
    </div>
  );
}
