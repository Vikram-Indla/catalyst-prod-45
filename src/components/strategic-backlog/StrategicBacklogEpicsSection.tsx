/**
 * Strategic Backlog - Epics Section
 * CLAUDE DESIGN - Enterprise table with status badges
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { EpicDetailsPanel } from '@/components/epic-backlog/EpicDetailsPanel';
import { StrategicBacklogEmptyState } from './StrategicBacklogEmptyState';
import { format } from 'date-fns';
import type { StrategicTheme, SnapshotStrategyLinks } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface EpicsSectionProps {
  snapshotId: string;
  themes: StrategicTheme[];
  links: SnapshotStrategyLinks | null;
  isArchived: boolean;
  searchQuery?: string;
}

interface Epic {
  id: string;
  name: string;
  epic_key?: string | null;
  status?: string | null;
  health?: string | null;
  theme_id?: string | null;
  primary_program_id?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  'proposed': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
  'analyzing': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  'approved': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  'in_progress': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  'done': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  'cancelled': 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-500/20 dark:text-stone-400 dark:border-stone-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  'proposed': 'Proposed',
  'analyzing': 'Analyzing',
  'approved': 'Approved',
  'in_progress': 'In Progress',
  'done': 'Done',
  'cancelled': 'Cancelled',
};

export function StrategicBacklogEpicsSection({ snapshotId, themes, links, isArchived, searchQuery = '' }: EpicsSectionProps) {
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'key' | 'name' | 'theme' | 'status' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showUnalignedOnly, setShowUnalignedOnly] = useState(false);

  const themeIds = themes.map(t => t.id);
  const themeLookup = useMemo(() => {
    const map: Record<string, string> = {};
    themes.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [themes]);

  const { data: epics = [], isLoading } = useQuery({
    queryKey: ['snapshot-epics', snapshotId, themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .in('theme_id', themeIds)
        .order('name');
      if (error) throw error;
      return (data || []) as Epic[];
    },
    enabled: themeIds.length > 0,
  });

  const { data: unalignedEpics = [] } = useQuery({
    queryKey: ['unaligned-epics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .is('theme_id', null)
        .order('name');
      if (error) return [];
      return (data || []) as Epic[];
    },
  });

  const allEpics = useMemo(() => {
    if (showUnalignedOnly) return unalignedEpics;
    return epics;
  }, [epics, unalignedEpics, showUnalignedOnly]);

  const filteredEpics = useMemo(() => {
    let result = allEpics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(epic =>
        epic.name.toLowerCase().includes(query) ||
        epic.epic_key?.toLowerCase().includes(query) ||
        (epic.theme_id && themeLookup[epic.theme_id]?.toLowerCase().includes(query))
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case 'key':
          aVal = a.epic_key || '';
          bVal = b.epic_key || '';
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'theme':
          aVal = a.theme_id ? themeLookup[a.theme_id] || '' : '';
          bVal = b.theme_id ? themeLookup[b.theme_id] || '' : '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
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
  }, [allEpics, searchQuery, sortColumn, sortDirection, themeLookup]);

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
        type="epic"
        hasSnapshot={!!snapshotId}
        hasThemes={false}
        isArchived={isArchived}
      />
    );
  }

  if (epics.length === 0 && unalignedEpics.length === 0 && !searchQuery && !isLoading) {
    return (
      <StrategicBacklogEmptyState
        type="epic"
        hasSnapshot={!!snapshotId}
        hasThemes={true}
        isArchived={isArchived}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar - Unaligned filter */}
      <div className="flex items-center gap-3">
        <Button
          variant={showUnalignedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowUnalignedOnly(!showUnalignedOnly)}
          className={cn(
            "text-sm",
            showUnalignedOnly 
              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
              : "border-catalyst-border text-catalyst-text hover:bg-catalyst-surface-hover"
          )}
        >
          Unaligned ({unalignedEpics.length})
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-catalyst-text-muted">Loading epics...</div>
      ) : filteredEpics.length === 0 ? (
        <div className="text-center py-12 text-catalyst-text-muted">
          {searchQuery 
            ? 'No epics match your search.' 
            : showUnalignedOnly 
              ? 'No unaligned epics found.'
              : 'No epics linked to themes in this snapshot.'}
        </div>
      ) : (
        <div className="border border-catalyst-border rounded-lg overflow-hidden bg-catalyst-surface shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-catalyst-table-header border-b border-catalyst-border">
                <th
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-24 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('key')}
                >
                  <div className="flex items-center">
                    Key <SortIcon column="key" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Epic <SortIcon column="name" />
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
                  className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider w-28 cursor-pointer hover:bg-catalyst-surface-hover transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status <SortIcon column="status" />
                  </div>
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
              {filteredEpics.map((epic) => {
                const statusStyle = STATUS_STYLES[epic.status || 'proposed'] || STATUS_STYLES['proposed'];
                const statusLabel = STATUS_LABELS[epic.status || 'proposed'] || 'Proposed';

                return (
                  <tr
                    key={epic.id}
                    onClick={() => setSelectedEpicId(epic.id)}
                    className="cursor-pointer hover:bg-catalyst-green-tint transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-catalyst-gold">{epic.epic_key || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-catalyst-text">{epic.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {epic.theme_id ? (
                        <span className="text-catalyst-text-secondary truncate block max-w-[150px]">
                          {themeLookup[epic.theme_id] || '—'}
                        </span>
                      ) : (
                        <Badge className="text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 border">
                          Unaligned
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[11px] font-medium border", statusStyle)}>
                        {statusLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-catalyst-text-muted">
                      {epic.updated_at ? format(new Date(epic.updated_at), 'MMM d') : '—'}
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

      {/* Epic Details Panel */}
      {selectedEpicId && (
        <EpicDetailsPanel
          epicId={selectedEpicId}
          onClose={() => setSelectedEpicId(null)}
          onRefetch={() => {}}
        />
      )}
    </div>
  );
}
