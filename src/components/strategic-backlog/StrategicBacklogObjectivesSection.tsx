/**
 * Strategic Backlog - Objectives Section
 * Enterprise-grade table for objectives management
 * NO duplicate CTAs - only search in toolbar
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, ChevronRight, AlertTriangle } from 'lucide-react';
import { ObjectiveDrawerV2 } from '@/modules/okr-v2';
import { StrategicBacklogEmptyState } from './StrategicBacklogEmptyState';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';

interface ObjectivesSectionProps {
  snapshotId: string;
  themes: StrategicTheme[];
  isArchived: boolean;
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

export function StrategicBacklogObjectivesSection({ snapshotId, themes, isArchived }: ObjectivesSectionProps) {
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const riskCounts: Record<string, number> = {};

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

  const SortIndicator = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) return <span className="text-muted-foreground/30 ml-1">⇅</span>;
    return <span className="text-brand-gold ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
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
      {/* Toolbar - Search only */}
      <div className="flex items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading objectives...</div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No objectives match your search.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gold/5 border-b border-border">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Objective <SortIndicator column="name" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('theme')}
                >
                  Theme <SortIndicator column="theme" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('progress')}
                >
                  Progress <SortIndicator column="progress" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                  Risks
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
              {filteredObjectives.map((obj) => (
                <tr
                  key={obj.id}
                  onClick={() => setSelectedObjectiveId(obj.id)}
                  className="cursor-pointer hover:bg-[rgba(92,124,92,0.06)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{obj.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[160px]">
                    {obj.theme_id ? themeLookup[obj.theme_id] || '—' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={(obj.overall_progress || 0) * 100} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {Math.round((obj.overall_progress || 0) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(riskCounts[obj.id] || 0) > 0 ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {riskCounts[obj.id]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {obj.updated_at ? format(new Date(obj.updated_at), 'MMM d') : '—'}
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
