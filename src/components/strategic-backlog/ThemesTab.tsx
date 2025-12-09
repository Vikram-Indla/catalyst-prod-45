import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Palette, AlertTriangle, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { ThemeDrawer } from './ThemeDrawer';
import { CreateThemeDialog } from './CreateThemeDialog';
import { format } from 'date-fns';

interface ThemesTabProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
}

export function ThemesTab({ themes, snapshotId, isArchived }: ThemesTabProps) {
  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === themes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(themes.map(t => t.id));
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="secondary">Active</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Required Warning */}
      {themes.length === 0 && !isArchived && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">At least 1 theme is required</p>
            <p className="text-sm text-amber-700 mt-1">
              You must create at least one theme before this snapshot can be activated.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Palette className="h-3 w-3" />
            {themes.length} theme{themes.length !== 1 ? 's' : ''}
          </Badge>
          {themes.length === 0 && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        {!isArchived && (
          <Button onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold/90">
            <Plus className="h-4 w-4 mr-1" />
            Create Theme
          </Button>
        )}
      </div>

      {/* Table */}
      {themes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Palette className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            No themes created yet for this snapshot.
          </p>
          {!isArchived && (
            <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create your first theme
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === themes.length && themes.length > 0}
                    onCheckedChange={toggleSelectAll}
                    disabled={isArchived}
                  />
                </TableHead>
                <TableHead>Theme</TableHead>
                <TableHead className="w-24">Color</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Updated</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {themes.map((theme) => (
                <TableRow
                  key={theme.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelectedTheme(theme)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(theme.id)}
                      onCheckedChange={() => toggleSelect(theme.id)}
                      disabled={isArchived}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                      />
                      <span className="font-medium text-foreground">{theme.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {theme.color_tag ? (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: theme.color_tag }}
                        />
                        <span className="text-xs text-muted-foreground font-mono">
                          {theme.color_tag}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Default</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(theme.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Theme Drawer */}
      <ThemeDrawer
        open={!!selectedTheme}
        onOpenChange={(open) => !open && setSelectedTheme(null)}
        theme={selectedTheme}
        isArchived={isArchived}
      />

      {/* Create Dialog */}
      <CreateThemeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        snapshotId={snapshotId}
      />
    </div>
  );
}
