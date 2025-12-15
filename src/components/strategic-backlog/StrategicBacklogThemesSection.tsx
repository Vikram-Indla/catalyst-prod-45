/**
 * Strategic Backlog - Themes Section
 * Enterprise-grade table for themes management
 * Columns: Theme Name, Status, Objectives, Updated
 * NO Color column per architecture directive
 */
import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Link as LinkIcon, Target, ChevronRight, AlertTriangle } from 'lucide-react';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { CreateThemeDialog } from './CreateThemeDialog';
import { LinkExistingThemesDialog } from './LinkExistingThemesDialog';
import { useThemesObjectiveCounts } from '@/hooks/useThemeObjectiveLinks';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ThemesSectionProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
}

// Strategic state labels (maps DB values to clean labels)
const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'proposed': { label: 'Draft', variant: 'secondary' },
  'active': { label: 'Active', variant: 'default' },
  'done': { label: 'Retired', variant: 'outline' },
  'cancelled': { label: 'Cancelled', variant: 'outline' },
};

export function StrategicBacklogThemesSection({ themes, snapshotId, isArchived }: ThemesSectionProps) {
  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | 'objectives' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: objectiveCounts = {} } = useThemesObjectiveCounts(themes.map(t => t.id));

  // Filter themes
  const filteredThemes = useMemo(() => {
    let result = themes;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(theme =>
        theme.name.toLowerCase().includes(query) ||
        theme.description?.toLowerCase().includes(query)
      );
    }

    // Sort
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
    const config = STATUS_LABELS[status || 'proposed'] || STATUS_LABELS['proposed'];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const SortIndicator = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) return <span className="text-muted-foreground/30 ml-1">⇅</span>;
    return <span className="text-brand-gold ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Warning when no themes */}
      {themes.length === 0 && !isArchived && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              This snapshot cannot be activated until at least 1 Theme is linked.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              Link existing
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Theme
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {!isArchived && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              Link existing
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredThemes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-surface">
          <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? 'No themes match your search.' : 'No themes in this snapshot yet.'}
          </p>
          {!isArchived && !searchQuery && (
            <div className="flex justify-center gap-2">
              <Button onClick={() => setLinkOpen(true)} variant="outline" size="sm">
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
                Link existing theme
              </Button>
              <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create theme
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Theme <SortIndicator column="name" />
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIndicator column="status" />
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('objectives')}
                >
                  Objectives <SortIndicator column="objectives" />
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('updated')}
                >
                  Updated <SortIndicator column="updated" />
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredThemes.map((theme) => (
                <tr
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{theme.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(theme.status)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Target className="h-3 w-3" />
                      {objectiveCounts[theme.id] || 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
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

      {/* Theme Details Drawer */}
      <ThemeDetailsDrawer
        theme={selectedTheme}
        isOpen={!!selectedTheme}
        onClose={() => setSelectedTheme(null)}
      />

      {/* Create Dialog */}
      <CreateThemeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        snapshotId={snapshotId}
      />

      {/* Link Existing Dialog */}
      <LinkExistingThemesDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        snapshotId={snapshotId}
        existingThemeIds={themes.map(t => t.id)}
      />
    </div>
  );
}
