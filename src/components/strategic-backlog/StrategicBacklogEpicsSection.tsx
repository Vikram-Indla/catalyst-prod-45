/**
 * Strategic Backlog - Epics Section
 * Pixel-perfect table matching mockups
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, ArrowUpDown, ArrowUp } from 'lucide-react';
import type { StrategicTheme, SnapshotStrategyLinks } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface EpicsSectionProps {
  snapshotId: string;
  themes: StrategicTheme[];
  links: SnapshotStrategyLinks | null;
  isArchived: boolean;
  onSelectItem: (item: any) => void;
  selectedItemId?: string;
}

interface Epic {
  id: string;
  name: string;
  epic_key?: string | null;
  status?: string | null;
  theme_id?: string | null;
  priority?: string | null;
  created_at: string;
  updated_at: string;
}

interface Objective {
  id: string;
  name: string;
  theme_id?: string | null;
}

export function StrategicBacklogEpicsSection({ 
  snapshotId, 
  themes, 
  links, 
  isArchived,
  onSelectItem,
  selectedItemId,
}: EpicsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'objective' | 'status' | 'features' | 'priority'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const themeIds = themes.map(t => t.id);

  // Fetch objectives for themes
  const { data: objectives = [] } = useQuery({
    queryKey: ['objectives-for-epics', themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, theme_id')
        .in('theme_id', themeIds);
      if (error) return [];
      return (data || []) as Objective[];
    },
    enabled: themeIds.length > 0,
  });

  const objectiveLookup = useMemo(() => {
    const map: Record<string, string> = {};
    objectives.forEach(o => { map[o.id] = o.name; });
    return map;
  }, [objectives]);

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

  // Get feature counts for epics
  const { data: featureCounts = {} } = useQuery({
    queryKey: ['epic-feature-counts', epics.map(e => e.id)],
    queryFn: async () => {
      if (epics.length === 0) return {};
      const epicIds = epics.map(e => e.id);
      const { data } = await supabase
        .from('features')
        .select('epic_id')
        .in('epic_id', epicIds);
      
      const counts: Record<string, number> = {};
      epicIds.forEach(id => counts[id] = 0);
      (data || []).forEach(f => {
        if (f.epic_id) counts[f.epic_id] = (counts[f.epic_id] || 0) + 1;
      });
      return counts;
    },
    enabled: epics.length > 0,
  });

  const filteredEpics = useMemo(() => {
    let result = epics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(epic =>
        epic.name.toLowerCase().includes(query) ||
        epic.epic_key?.toLowerCase().includes(query)
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
        case 'features':
          aVal = featureCounts[a.id] || 0;
          bVal = featureCounts[b.id] || 0;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { 'High': 0, 'Medium': 1, 'Low': 2 };
          aVal = priorityOrder[a.priority || 'Low'] ?? 3;
          bVal = priorityOrder[b.priority || 'Low'] ?? 3;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [epics, searchQuery, sortColumn, sortDirection, featureCounts]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const isActive = status === 'active' || status === 'in_progress';
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

  const getPriorityClass = (priority?: string | null) => {
    switch (priority) {
      case 'High':
        return 'text-rose-600 dark:text-rose-400';
      case 'Medium':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn === column) {
      return <ArrowUp className={cn("h-3 w-3 ml-1", sortDirection === 'desc' && "rotate-180")} />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  };

  // Find objective name for epic (via theme linkage)
  const getObjectiveForEpic = (epic: Epic): string => {
    // In a real implementation, you'd have epic -> objective linkage
    // For now, we'll find first objective with matching theme
    const obj = objectives.find(o => o.theme_id === epic.theme_id);
    return obj?.name || '—';
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
          placeholder="Search epics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "flex-1 bg-transparent text-sm outline-none",
            "text-[#24292F] dark:text-[#E6EDF3]",
            "placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]"
          )}
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
                  Epic <SortIcon column="name" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-52 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('objective')}
              >
                <button className="flex items-center">
                  Objective <SortIcon column="objective" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                <button className="flex items-center">
                  State <SortIcon column="status" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('features')}
              >
                <button className="flex items-center">
                  Features <SortIcon column="features" />
                </button>
              </th>
              <th 
                className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('priority')}
              >
                <button className="flex items-center">
                  Priority <SortIcon column="priority" />
                </button>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Loading epics...
                </td>
              </tr>
            ) : filteredEpics.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No epics found
                </td>
              </tr>
            ) : (
              filteredEpics.map((epic) => {
                const isSelected = selectedItemId === epic.id;
                return (
                  <tr
                    key={epic.id}
                    onClick={() => onSelectItem(epic)}
                    className={cn(
                      "cursor-pointer hover:bg-[rgba(92,124,92,0.08)] transition-colors",
                      isSelected && "bg-[rgba(92,124,92,0.08)] border-l-2 border-l-brand-gold"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{epic.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {getObjectiveForEpic(epic)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(epic.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {featureCounts[epic.id] || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm", getPriorityClass(epic.priority))}>
                        {epic.priority || 'Low'}
                      </span>
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
