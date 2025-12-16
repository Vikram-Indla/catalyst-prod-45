/**
 * Strategic Backlog - Themes Section
 * Pixel-perfect table matching mockups
 */
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Target, ChevronRight, ArrowUpDown, ArrowUp } from 'lucide-react';
import { useThemesObjectiveCounts } from '@/hooks/useThemeObjectiveLinks';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ThemesSectionProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
  onSelectItem: (item: StrategicTheme) => void;
  selectedItemId?: string;
}

export function StrategicBacklogThemesSection({ 
  themes, 
  snapshotId, 
  isArchived,
  onSelectItem,
  selectedItemId,
}: ThemesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | 'objectives' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: objectiveCounts = {} } = useThemesObjectiveCounts(themes.map(t => t.id));

  const filteredThemes = useMemo(() => {
    let result = themes;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(theme =>
        theme.name.toLowerCase().includes(query) ||
        theme.description?.toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'objectives':
          aVal = objectiveCounts[a.id] || 0;
          bVal = objectiveCounts[b.id] || 0;
          break;
        case 'updated':
          aVal = a.updated_at || '';
          bVal = b.updated_at || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [themes, searchQuery, sortColumn, sortDirection, objectiveCounts]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status?: string) => {
    const isActive = status === 'active';
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-[11px] font-medium px-2.5 py-1",
          isActive 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
        )}
      >
        {isActive ? 'Active' : 'Draft'}
      </Badge>
    );
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn === column) {
      return <ArrowUp className={cn("h-3 w-3 ml-1", sortDirection === 'desc' && "rotate-180")} />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search themes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-surface border-border"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('name')}
              >
                <button className="flex items-center">
                  Theme <SortIcon column="name" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                <button className="flex items-center">
                  State <SortIcon column="status" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('objectives')}
              >
                <button className="flex items-center">
                  Objectives <SortIcon column="objectives" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('updated')}
              >
                <button className="flex items-center">
                  Updated <SortIcon column="updated" />
                </button>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredThemes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No themes found
                </td>
              </tr>
            ) : (
              filteredThemes.map((theme) => {
                const isSelected = selectedItemId === theme.id;
                return (
                  <tr
                    key={theme.id}
                    onClick={() => onSelectItem(theme)}
                    className={cn(
                      "cursor-pointer hover:bg-[rgba(92,124,92,0.08)] transition-colors",
                      isSelected && "bg-[rgba(92,124,92,0.08)] border-l-2 border-l-brand-gold"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{theme.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(theme.status)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        {objectiveCounts[theme.id] || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
