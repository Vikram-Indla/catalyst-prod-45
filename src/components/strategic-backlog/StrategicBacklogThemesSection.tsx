/**
 * Strategic Backlog - Themes Section
 * Pixel-perfect table matching mockups exactly
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
        className={cn(
          "text-xs font-medium px-2.5 py-0.5 border",
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        <Input
          placeholder="Search themes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 rounded-lg"
          style={{ 
            background: 'var(--surface-bg)', 
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="w-full table-fixed">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              <th 
                className="text-left px-4 py-3 cursor-pointer transition-colors"
                onClick={() => handleSort('name')}
                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
              >
                <button className="flex items-center hover:opacity-80">
                  Theme <SortIcon column="name" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 w-24 cursor-pointer transition-colors"
                onClick={() => handleSort('status')}
                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
              >
                <button className="flex items-center hover:opacity-80">
                  State <SortIcon column="status" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 w-28 cursor-pointer transition-colors"
                onClick={() => handleSort('objectives')}
                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
              >
                <button className="flex items-center hover:opacity-80">
                  Objectives <SortIcon column="objectives" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 w-32 cursor-pointer transition-colors"
                onClick={() => handleSort('updated')}
                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
              >
                <button className="flex items-center hover:opacity-80">
                  Updated <SortIcon column="updated" />
                </button>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredThemes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
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
                    className="cursor-pointer transition-colors group"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--row-selected)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--row-selected)' : 'transparent'; }}
                  >
                    <td className="px-4 py-3.5 min-w-0">
                      <span
                        className="text-sm font-medium block truncate"
                        style={{ color: 'var(--text-primary)' }}
                        title={theme.name}
                      >
                        {theme.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(theme.status)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <Target className="h-4 w-4" />
                        {objectiveCounts[theme.id] || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight 
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                        style={{ color: 'var(--text-muted)' }} 
                      />
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
