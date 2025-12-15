/**
 * Strategic Backlog - Objectives Section
 * CLAUDE DESIGN - Enterprise table with progress bars
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { ObjectiveDrawerV2 } from '@/modules/okr-v2';
import { StrategicBacklogEmptyState } from './StrategicBacklogEmptyState';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ObjectivesSectionProps {
  snapshotId: string;
  themes: StrategicTheme[];
  isArchived: boolean;
  searchQuery?: string;
}

interface Objective {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  overall_progress?: number | null;
  theme_id?: string | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  'draft': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
  'active': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  'archived': 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-500/20 dark:text-stone-400 dark:border-stone-500/30',
};

export function StrategicBacklogObjectivesSection({ snapshotId, themes, isArchived, searchQuery = '' }: ObjectivesSectionProps) {
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'theme' | 'progress' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const themeIds = themes.map(t => t.id);
  const themeLookup = useMemo(() => {
    const map: Record<string, string> = {};
    themes.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [themes]);

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['snapshot-objectives', snapshotId, themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .in('theme_id', themeIds)
        .order('name');
      if (error) throw error;
      return (data || []) as Objective[];
    },
    enabled: themeIds.length > 0,
  });

  // Fetch owner profiles
  const ownerIds = objectives.map(o => o.owner_id).filter(Boolean) as string[];
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-objectives', ownerIds],
    queryFn: async () => {
      if (ownerIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
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

  const filteredObjectives = useMemo(() => {
    let result = objectives;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(obj =>
        obj.name.toLowerCase().includes(query) ||
        obj.description?.toLowerCase().includes(query) ||
        (obj.theme_id && themeLookup[obj.theme_id]?.toLowerCase().includes(query))
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'theme':
          aVal = a.theme_id ? themeLookup[a.theme_id] || '' : '';
          bVal = b.theme_id ? themeLookup[b.theme_id] || '' : '';
          break;
        case 'progress':
          aVal = a.overall_progress || 0;
          bVal = b.overall_progress || 0;
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
  }, [objectives, searchQuery, sortColumn, sortDirection, themeLookup]);

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

  // Empty states
  if (themes.length === 0) {
    return (
      <StrategicBacklogEmptyState
        type="objective"
        hasSnapshot={!!snapshotId}
        hasThemes={false}
        isArchived={isArchived}
      />
    );
  }

  if (objectives.length === 0 && !searchQuery && !isLoading) {
    return (
      <StrategicBacklogEmptyState
        type="objective"
        hasSnapshot={!!snapshotId}
        hasThemes={true}
        isArchived={isArchived}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-catalyst-text-muted">Loading objectives...</div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12 text-catalyst-text-muted">
          No objectives match your search.
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
                    Objective <SortIcon column="name" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-40 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('theme')}
                >
                  <div className="flex items-center">
                    Theme <SortIcon column="theme" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-36 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center">
                    Progress <SortIcon column="progress" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-36">
                  Owner
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-24 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
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
              {filteredObjectives.map((obj) => {
                const owner = obj.owner_id ? profileMap[obj.owner_id] : null;
                const progressPercent = Math.round((obj.overall_progress || 0) * 100);

                return (
                  <tr
                    key={obj.id}
                    onClick={() => setSelectedObjectiveId(obj.id)}
                    className="cursor-pointer hover:bg-catalyst-green-tint transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-catalyst-text">{obj.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-catalyst-text-secondary truncate max-w-[160px]">
                      {obj.theme_id ? themeLookup[obj.theme_id] || '—' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={progressPercent} className="h-2 flex-1 bg-catalyst-surface-hover" />
                        <span className="text-xs text-catalyst-text-muted w-10 text-right">
                          {progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {owner ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-catalyst-gold text-white text-xs font-medium flex items-center justify-center">
                            {owner.avatar}
                          </div>
                          <span className="text-sm text-catalyst-text-secondary truncate max-w-[80px]">
                            {owner.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-catalyst-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-catalyst-text-muted">
                      {obj.updated_at ? format(new Date(obj.updated_at), 'MMM d') : '—'}
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

      {/* Objective Drawer */}
      {selectedObjectiveId && (
        <ObjectiveDrawerV2
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}
    </div>
  );
}
