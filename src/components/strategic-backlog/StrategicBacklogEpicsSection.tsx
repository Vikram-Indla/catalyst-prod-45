/**
 * Strategic Backlog - Epics Section
 * Enterprise-grade table for epics alignment
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, Link as LinkIcon } from 'lucide-react';
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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  'proposed': { label: 'Proposed', className: 'bg-muted text-muted-foreground' },
  'analyzing': { label: 'Analyzing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  'approved': { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  'in_progress': { label: 'In Progress', className: 'bg-brand-gold/20 text-brand-gold' },
  'done': { label: 'Done', className: 'bg-secondary-green/20 text-secondary-green' },
  'cancelled': { label: 'Cancelled', className: 'bg-muted text-muted-foreground line-through' },
};

export function StrategicBacklogEpicsSection({ snapshotId, themes, links, isArchived }: EpicsSectionProps) {
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const SortIndicator = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) return <span className="text-muted-foreground/30 ml-1">⇅</span>;
    return <span className="text-brand-gold ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const getStatusBadge = (status?: string) => {
    const config = STATUS_LABELS[status || 'proposed'] || STATUS_LABELS['proposed'];
    return (
      <Badge className={cn("text-xs", config.className)}>
        {config.label}
      </Badge>
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
        onLink={() => {/* TODO: Open link epic dialog */}}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search epics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Unaligned filter */}
        <Button
          variant={showUnalignedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowUnalignedOnly(!showUnalignedOnly)}
          className={cn(
            showUnalignedOnly && 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
          )}
        >
          Unaligned ({unalignedEpics.length})
        </Button>

        {!isArchived && unalignedEpics.length > 0 && (
          <Button variant="outline" size="sm">
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
            Link to theme
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading epics...</div>
      ) : filteredEpics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery 
            ? 'No epics match your search.' 
            : showUnalignedOnly 
              ? 'No unaligned epics found.'
              : 'No epics linked to themes in this snapshot.'}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gold/5 border-b border-border">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('key')}
                >
                  Key <SortIndicator column="key" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Epic <SortIndicator column="name" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('theme')}
                >
                  Theme <SortIndicator column="theme" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIndicator column="status" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('updated')}
                >
                  Updated <SortIndicator column="updated" />
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEpics.map((epic) => (
                <tr
                  key={epic.id}
                  onClick={() => setSelectedEpicId(epic.id)}
                  className="cursor-pointer hover:bg-[rgba(92,124,92,0.06)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-brand-gold">{epic.epic_key || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{epic.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {epic.theme_id ? (
                      <span className="text-muted-foreground truncate block max-w-[150px]">
                        {themeLookup[epic.theme_id] || '—'}
                      </span>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50">
                        Unaligned
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(epic.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {epic.updated_at ? format(new Date(epic.updated_at), 'MMM d') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
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
