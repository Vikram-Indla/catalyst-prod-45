/**
 * Strategic Backlog - Themes Section
 * Pixel-perfect table matching mockups exactly
 */
import { useState, useMemo } from 'react';
import { Search, Target, ChevronRight, ArrowUpDown, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ThemesSectionProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
  onSelectItem: (item: StrategicTheme) => void;
  selectedItemId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  objectiveCounts: Record<string, number>;
}

export function StrategicBacklogThemesSection({ 
  themes, 
  snapshotId, 
  isArchived,
  onSelectItem,
  selectedItemId,
  searchQuery,
  onSearchChange,
  objectiveCounts,
}: ThemesSectionProps) {
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | 'objectives' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
      <span className={cn(
        "inline-flex px-2 py-0.5 rounded",
        "text-[10px] font-semibold uppercase tracking-wider",
        isActive 
          ? "bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] dark:text-[#7DA37D] border border-[rgba(92,124,92,0.3)]"
          : "bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D]"
      )}>
        {isActive ? 'ACTIVE' : 'DRAFT'}
      </span>
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
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg max-w-md",
        "bg-white dark:bg-[#0D1117]",
        "border border-[#E1E4E8] dark:border-[#30363D]",
        "focus-within:border-[#C69C6D] focus-within:ring-1 focus-within:ring-[rgba(198,156,109,0.3)]"
      )}>
        <Search className="h-4 w-4 text-[#8B949E] dark:text-[#6E7681]" />
        <input
          type="text"
          placeholder="Search themes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "flex-1 bg-transparent text-sm outline-none",
            "text-[#24292F] dark:text-[#E6EDF3]",
            "placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]"
          )}
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
