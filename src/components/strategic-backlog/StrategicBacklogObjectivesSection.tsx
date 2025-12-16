/**
 * Strategic Backlog - Objectives Section
 * Pixel-perfect table matching mockups exactly
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, ArrowUpDown, ArrowUp } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ObjectivesSectionProps {
  snapshotId: string;
  themes: StrategicTheme[];
  isArchived: boolean;
  onSelectItem: (item: any) => void;
  selectedItemId?: string;
}

interface Objective {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  overall_progress?: number | null;
  theme_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function StrategicBacklogObjectivesSection({ 
  snapshotId, 
  themes, 
  isArchived,
  onSelectItem,
  selectedItemId,
}: ObjectivesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'theme' | 'status' | 'krs' | 'progress'>('name');
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

  const { data: krCounts = {} } = useQuery({
    queryKey: ['objectives-kr-counts', objectives.map(o => o.id)],
    queryFn: async () => {
      if (objectives.length === 0) return {};
      const objectiveIds = objectives.map(o => o.id);
      const { data } = await supabase
        .from('key_results')
        .select('objective_id')
        .in('objective_id', objectiveIds);
      
      const counts: Record<string, number> = {};
      objectiveIds.forEach(id => counts[id] = 0);
      (data || []).forEach(kr => {
        if (kr.objective_id) counts[kr.objective_id] = (counts[kr.objective_id] || 0) + 1;
      });
      return counts;
    },
    enabled: objectives.length > 0,
  });

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
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'krs':
          aVal = krCounts[a.id] || 0;
          bVal = krCounts[b.id] || 0;
          break;
        case 'progress':
          aVal = a.overall_progress || 0;
          bVal = b.overall_progress || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [objectives, searchQuery, sortColumn, sortDirection, themeLookup, krCounts]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status?: string | null) => {
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search objectives..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-surface border-border rounded-lg"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr className="bg-muted/30">
              <th 
                className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('name')}
              >
                <button className="flex items-center">
                  Objective <SortIcon column="name" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-52 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('theme')}
              >
                <button className="flex items-center">
                  Theme <SortIcon column="theme" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                <button className="flex items-center">
                  State <SortIcon column="status" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-16 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('krs')}
              >
                <button className="flex items-center">
                  KRs <SortIcon column="krs" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-36 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('progress')}
              >
                <button className="flex items-center">
                  Progress <SortIcon column="progress" />
                </button>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Loading objectives...
                </td>
              </tr>
            ) : filteredObjectives.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No objectives found
                </td>
              </tr>
            ) : (
              filteredObjectives.map((obj) => {
                const isSelected = selectedItemId === obj.id;
                const progress = Math.round((obj.overall_progress || 0) * 100);
                return (
                  <tr
                    key={obj.id}
                    onClick={() => onSelectItem(obj)}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{obj.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {obj.theme_id ? themeLookup[obj.theme_id] || '—' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(obj.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-muted-foreground">
                      {krCounts[obj.id] || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden max-w-[80px]">
                          <div 
                            className="bg-secondary-green h-full rounded-full" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-10 text-right">
                          {progress}%
                        </span>
                      </div>
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
