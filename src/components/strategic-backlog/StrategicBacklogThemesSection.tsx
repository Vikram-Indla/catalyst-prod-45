/**
 * Strategic Backlog - Themes Section
 * CLAUDE DESIGN - Enterprise table with Owner avatars
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Target, ChevronRight } from 'lucide-react';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { StrategicBacklogEmptyState } from './StrategicBacklogEmptyState';
import { useThemesObjectiveCounts } from '@/hooks/useThemeObjectiveLinks';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ThemesSectionProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
  searchQuery?: string;
}

const STATUS_STYLES: Record<string, string> = {
  'proposed': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
  'active': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  'done': 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-500/20 dark:text-stone-400 dark:border-stone-500/30',
  'cancelled': 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-500/20 dark:text-stone-400 dark:border-stone-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  'proposed': 'Draft',
  'active': 'Active',
  'done': 'Retired',
  'cancelled': 'Cancelled',
};

export function StrategicBacklogThemesSection({ themes, snapshotId, isArchived, searchQuery = '' }: ThemesSectionProps) {
  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | 'objectives' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: objectiveCounts = {} } = useThemesObjectiveCounts(themes.map(t => t.id));

  // Fetch owner profiles
  const ownerIds = themes.map(t => t.owner_id).filter(Boolean) as string[];
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', ownerIds],
    queryFn: async () => {
      if (ownerIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ownerIds);
      return data || [];
    },
    enabled: ownerIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, { name: string; avatar: string }> = {};
    profiles.forEach((p: any) => {
      map[p.id] = {
        name: p.full_name || 'Unknown',
        avatar: p.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
      };
    });
    return map;
  }, [profiles]);

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

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-3 h-3 ml-1 opacity-30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 ml-1 text-catalyst-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        {sortDirection === 'asc' 
          ? <path d="m18 15-6-6-6 6"/>
          : <path d="m6 9 6 6 6-6"/>
        }
      </svg>
    );
  };

  // Empty state
  if (themes.length === 0 && !searchQuery) {
    return (
      <StrategicBacklogEmptyState
        type="theme"
        hasSnapshot={!!snapshotId}
        hasThemes={true}
        isArchived={isArchived}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Card */}
      {filteredThemes.length === 0 ? (
        <div className="text-center py-12 text-catalyst-text-muted">
          No themes match your search.
        </div>
      ) : (
        <div className="border border-catalyst-border rounded-lg overflow-hidden bg-catalyst-surface shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-catalyst-table-header border-b border-catalyst-border">
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Theme <SortIcon column="name" />
                  </div>
                </th>
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-24 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    State <SortIcon column="status" />
                  </div>
                </th>
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-28 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('objectives')}
                >
                  <div className="flex items-center">
                    Objectives <SortIcon column="objectives" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-36">
                  Owner
                </th>
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-28 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('updated')}
                >
                  <div className="flex items-center">
                    Updated <SortIcon column="updated" />
                  </div>
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-catalyst-border">
              {filteredThemes.map((theme) => {
                const owner = theme.owner_id ? profileMap[theme.owner_id] : null;
                const statusStyle = STATUS_STYLES[theme.status || 'proposed'] || STATUS_STYLES['proposed'];
                const statusLabel = STATUS_LABELS[theme.status || 'proposed'] || 'Draft';

                return (
                  <tr
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className="cursor-pointer hover:bg-catalyst-green-tint transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-catalyst-text">{theme.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[11px] font-medium border", statusStyle)}>
                        {statusLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-catalyst-text-secondary">
                        <Target className="h-3.5 w-3.5" />
                        {objectiveCounts[theme.id] || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {owner ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-catalyst-gold text-white text-xs font-medium flex items-center justify-center">
                            {owner.avatar}
                          </div>
                          <span className="text-sm text-catalyst-text-secondary truncate max-w-[100px]">
                            {owner.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-catalyst-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-catalyst-text-muted">
                      {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-catalyst-text-muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Theme Details Drawer */}
      <ThemeDetailsDrawer
        theme={selectedTheme}
        isOpen={!!selectedTheme}
        onClose={() => setSelectedTheme(null)}
      />
    </div>
  );
}
