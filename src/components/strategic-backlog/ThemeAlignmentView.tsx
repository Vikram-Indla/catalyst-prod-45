import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Link as LinkIcon, Unlink, Target, Palette, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { useThemeObjectiveLinks, useThemesObjectiveCounts, useUnlinkObjectivesFromTheme } from '@/hooks/useThemeObjectiveLinks';
import { LinkObjectivesDrawer } from './LinkObjectivesDrawer';

interface ThemeAlignmentViewProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
}

export function ThemeAlignmentView({ themes, snapshotId, isArchived }: ThemeAlignmentViewProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false);
  const [confirmUnlinkOpen, setConfirmUnlinkOpen] = useState(false);

  const selectedTheme = themes.find(t => t.id === selectedThemeId);
  const { data: objectiveCounts = {} } = useThemesObjectiveCounts(themes.map(t => t.id));
  const { data: linkedObjectives = [], isLoading } = useThemeObjectiveLinks(selectedThemeId);
  const unlinkMutation = useUnlinkObjectivesFromTheme();

  // Filter themes by search
  const filteredThemes = useMemo(() => {
    if (!searchQuery) return themes;
    const q = searchQuery.toLowerCase();
    return themes.filter(t => t.name.toLowerCase().includes(q));
  }, [themes, searchQuery]);

  // Extract objective data from linked objects
  const linkedObjectivesData = useMemo(() => {
    return linkedObjectives.map((link: any) => ({
      linkId: link.id,
      objectiveId: link.objective_id,
      objective: link.objectives,
      createdAt: link.created_at,
    })).filter((item: any) => item.objective);
  }, [linkedObjectives]);

  const toggleSelectObjective = (id: string) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedObjectiveIds.length === linkedObjectivesData.length) {
      setSelectedObjectiveIds([]);
    } else {
      setSelectedObjectiveIds(linkedObjectivesData.map((item: any) => item.objectiveId));
    }
  };

  const handleUnlinkSelected = () => {
    if (selectedObjectiveIds.length > 10) {
      setConfirmUnlinkOpen(true);
    } else {
      performUnlink();
    }
  };

  const performUnlink = () => {
    if (!selectedThemeId || selectedObjectiveIds.length === 0) return;
    unlinkMutation.mutate(
      { themeId: selectedThemeId, objectiveIds: selectedObjectiveIds },
      { onSuccess: () => setSelectedObjectiveIds([]) }
    );
    setConfirmUnlinkOpen(false);
  };

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'good': return <Badge className="bg-green-100 text-green-700">Good</Badge>;
      case 'fair': return <Badge className="bg-amber-100 text-amber-700">Fair</Badge>;
      case 'poor': return <Badge className="bg-red-100 text-red-700">Poor</Badge>;
      case 'at_risk': return <Badge className="bg-orange-100 text-orange-700">At Risk</Badge>;
      default: return <Badge variant="outline">—</Badge>;
    }
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'portfolio': return <Badge variant="outline" className="text-purple-600 border-purple-300">Portfolio</Badge>;
      case 'program': return <Badge variant="outline" className="text-blue-600 border-blue-300">Program</Badge>;
      case 'team': return <Badge variant="outline" className="text-green-600 border-green-300">Team</Badge>;
      default: return <Badge variant="outline">—</Badge>;
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[400px]">
      {/* Left Panel - Theme List */}
      <div className="w-72 flex-shrink-0 border border-border rounded-lg bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredThemes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No themes found</p>
            ) : (
              filteredThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setSelectedThemeId(theme.id);
                    setSelectedObjectiveIds([]);
                  }}
                  className={`w-full text-left p-2.5 rounded-md transition-colors ${
                    selectedThemeId === theme.id
                      ? 'bg-brand-gold/10 border border-brand-gold/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">{theme.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-4">
                    <Target className="h-3 w-3" />
                    <span>{objectiveCounts[theme.id] || 0} objectives</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Objectives Table */}
      <div className="flex-1 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Objectives linked to{' '}
              <span className="text-brand-gold">{selectedTheme?.name || 'theme'}</span>
            </span>
            <Badge variant="outline" className="ml-1">
              {linkedObjectivesData.length}
            </Badge>
          </div>

          {!isArchived && (
            <div className="flex items-center gap-2">
              {selectedObjectiveIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlinkSelected}
                  disabled={unlinkMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="h-3.5 w-3.5 mr-1" />
                  Unlink ({selectedObjectiveIds.length})
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setLinkDrawerOpen(true)}
                disabled={!selectedThemeId}
                className="bg-brand-gold hover:bg-brand-gold/90"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
                Link Objectives
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Theme Selector */}
        <div className="p-3 border-b border-border md:hidden">
          <Select value={selectedThemeId} onValueChange={setSelectedThemeId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              {themes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                    />
                    {theme.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {!selectedThemeId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a theme to view linked objectives</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : linkedObjectivesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Target className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No objectives linked to this theme</p>
              {!isArchived && (
                <Button
                  size="sm"
                  onClick={() => setLinkDrawerOpen(true)}
                  className="bg-brand-gold hover:bg-brand-gold/90"
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Link Objectives
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedObjectiveIds.length === linkedObjectivesData.length && linkedObjectivesData.length > 0}
                      onCheckedChange={toggleSelectAll}
                      disabled={isArchived}
                    />
                  </TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead className="w-24">Level</TableHead>
                  <TableHead className="w-20">Score</TableHead>
                  <TableHead className="w-24">Health</TableHead>
                  <TableHead className="w-28">Updated</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedObjectivesData.map((item: any) => (
                  <TableRow key={item.linkId} className="hover:bg-muted/30">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedObjectiveIds.includes(item.objectiveId)}
                        onCheckedChange={() => toggleSelectObjective(item.objectiveId)}
                        disabled={isArchived}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{item.objective?.summary || '—'}</span>
                    </TableCell>
                    <TableCell>{getTierBadge(item.objective?.tier)}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {item.objective?.score != null ? `${item.objective.score}%` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>{getHealthBadge(item.objective?.health)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.objective?.updated_at
                        ? format(new Date(item.objective.updated_at), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {!isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            unlinkMutation.mutate({
                              themeId: selectedThemeId,
                              objectiveIds: [item.objectiveId],
                            });
                          }}
                          className="h-7 px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Link Objectives Drawer */}
      <LinkObjectivesDrawer
        open={linkDrawerOpen}
        onOpenChange={setLinkDrawerOpen}
        themeId={selectedThemeId}
        themeName={selectedTheme?.name || ''}
        snapshotId={snapshotId}
        existingObjectiveIds={linkedObjectivesData.map((item: any) => item.objectiveId)}
      />

      {/* Confirm Unlink Dialog */}
      <AlertDialog open={confirmUnlinkOpen} onOpenChange={setConfirmUnlinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {selectedObjectiveIds.length} objectives?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the alignment between these objectives and the theme "{selectedTheme?.name}".
              The objectives will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
