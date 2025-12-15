/**
 * Strategic Backlog - Themes Section
 * Enterprise-grade table for themes management
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Link as LinkIcon, Target, ChevronRight } from 'lucide-react';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { CreateThemeDialog } from './CreateThemeDialog';
import { LinkExistingThemesDialog } from './LinkExistingThemesDialog';
import { StrategicBacklogEmptyState } from './StrategicBacklogEmptyState';
import { useThemesObjectiveCounts } from '@/hooks/useThemeObjectiveLinks';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';

interface ThemesSectionProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
}

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

  // Empty state
  if (themes.length === 0 && !searchQuery) {
    return (
      <>
        <StrategicBacklogEmptyState
          type="theme"
          hasSnapshot={!!snapshotId}
          hasThemes={true}
          isArchived={isArchived}
          onCreate={() => setCreateOpen(true)}
          onLink={() => setLinkOpen(true)}
        />
        <CreateThemeDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          snapshotId={snapshotId}
        />
        <LinkExistingThemesDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          snapshotId={snapshotId}
          existingThemeIds={[]}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
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
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Link existing
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredThemes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No themes match your search.
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
                  Theme <SortIndicator column="name" />
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  State <SortIndicator column="status" />
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 cursor-pointer hover:bg-brand-gold/10 transition-colors"
                  onClick={() => handleSort('objectives')}
                >
                  Objectives <SortIndicator column="objectives" />
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 cursor-pointer hover:bg-brand-gold/10 transition-colors"
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
                  className="cursor-pointer hover:bg-[rgba(92,124,92,0.06)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{theme.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(theme.status)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1 text-xs font-medium">
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

      {/* Dialogs */}
      <ThemeDetailsDrawer
        theme={selectedTheme}
        isOpen={!!selectedTheme}
        onClose={() => setSelectedTheme(null)}
      />
      <CreateThemeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        snapshotId={snapshotId}
      />
      <LinkExistingThemesDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        snapshotId={snapshotId}
        existingThemeIds={themes.map(t => t.id)}
      />
    </div>
  );
}
