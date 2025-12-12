import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Link2, Unlink, ChevronRight, Search, Filter, Zap, AlertCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EpicLinkDialog } from './EpicLinkDialog';
import { StrategicEpicDrawer } from './StrategicEpicDrawer';
import type { StrategicTheme, SnapshotStrategyLinks } from '@/types/strategicBacklog';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  status?: string;
  health?: string;
  owner_id?: string;
  primary_program_id?: string;
  updated_at?: string;
  programs?: { id: string; name: string } | null;
  profiles?: { id: string; full_name: string } | null;
}

interface ThemeEpicLink {
  id: string;
  theme_id: string;
  epic_id: string;
}

interface EpicsTabProps {
  snapshotId: string;
  links: SnapshotStrategyLinks | null;
  themes: StrategicTheme[];
  isArchived: boolean;
}

export function EpicsTab({ snapshotId, links, themes, isArchived }: EpicsTabProps) {
  const queryClient = useQueryClient();
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnalignedOnly, setShowUnalignedOnly] = useState(false);

  const linkedEpicIds = links?.epic_ids || [];

  // Fetch linked epics
  const { data: epics = [], isLoading } = useQuery({
    queryKey: ['strategic-backlog-epics', linkedEpicIds],
    queryFn: async () => {
      if (linkedEpicIds.length === 0) return [];
      const { data, error } = await supabase
        .from('epics')
        .select(`
          id,
          name,
          epic_key,
          status,
          health,
          owner_id,
          primary_program_id,
          updated_at,
          programs!primary_program_id(id, name)
        `)
        .in('id', linkedEpicIds)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      
      // Fetch owner profiles separately
      const ownerIds = (data || []).filter(e => e.owner_id).map(e => e.owner_id);
      let profilesMap: Record<string, { id: string; full_name: string }> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds);
        profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
      
      return (data || []).map(epic => ({
        ...epic,
        profiles: epic.owner_id ? profilesMap[epic.owner_id] || null : null
      })) as Epic[];
    },
    enabled: linkedEpicIds.length > 0,
  });

  // Fetch theme-epic links
  const { data: themeEpicLinks = [] } = useQuery({
    queryKey: ['theme-epic-links', snapshotId],
    queryFn: async () => {
      const themeIds = themes.map(t => t.id);
      if (themeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('theme_epic_links')
        .select('*')
        .in('theme_id', themeIds);
      if (error) throw error;
      return (data || []) as ThemeEpicLink[];
    },
    enabled: themes.length > 0,
  });

  // Get theme for an epic
  const getEpicTheme = (epicId: string) => {
    const link = themeEpicLinks.find(l => l.epic_id === epicId);
    if (!link) return null;
    return themes.find(t => t.id === link.theme_id) || null;
  };

  // Unlink epic from snapshot
  const unlinkEpicMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const newEpicIds = linkedEpicIds.filter(id => id !== epicId);
      const { error } = await supabase
        .from('snapshot_strategy_links')
        .update({ epic_ids: newEpicIds })
        .eq('snapshot_id', snapshotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-strategy-links'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-backlog-epics'] });
      toast.success('Epic unlinked from snapshot');
    },
    onError: () => toast.error('Failed to unlink epic'),
  });

  // Link epic to theme
  const linkToThemeMutation = useMutation({
    mutationFn: async ({ epicId, themeId }: { epicId: string; themeId: string }) => {
      // Remove existing theme link if any
      await supabase.from('theme_epic_links').delete().eq('epic_id', epicId);
      // Create new link
      const { error } = await supabase.from('theme_epic_links').insert({ epic_id: epicId, theme_id: themeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-epic-links'] });
      toast.success('Epic linked to theme');
    },
    onError: () => toast.error('Failed to link epic to theme'),
  });

  // Unlink epic from theme
  const unlinkFromThemeMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { error } = await supabase.from('theme_epic_links').delete().eq('epic_id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-epic-links'] });
      toast.success('Epic unlinked from theme');
    },
    onError: () => toast.error('Failed to unlink epic from theme'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEpics.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEpics.map(e => e.id));
    }
  };

  // Filter epics
  const filteredEpics = epics.filter(epic => {
    const matchesSearch = !searchQuery || 
      epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      epic.epic_key?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnaligned = !showUnalignedOnly || !getEpicTheme(epic.id);
    return matchesSearch && matchesUnaligned;
  });

  const getHealthBadge = (health?: string) => {
    switch (health?.toLowerCase()) {
      case 'green':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Green</Badge>;
      case 'amber':
      case 'yellow':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Amber</Badge>;
      case 'red':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Red</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'complete':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Done</Badge>;
      case 'in progress':
      case 'implementing':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Funnel'}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            {epics.length} epic{epics.length !== 1 ? 's' : ''} linked
          </Badge>
          {showUnalignedOnly && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unaligned only
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search epics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-[200px]"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant={showUnalignedOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowUnalignedOnly(!showUnalignedOnly)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Unaligned
          </Button>

          {!isArchived && (
            <>
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
                <Link2 className="h-4 w-4 mr-1" />
                Link Existing
              </Button>
              <Button 
                className="bg-brand-gold hover:bg-brand-gold/90" 
                size="sm"
                onClick={() => setCreateDrawerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Epic
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading epics...</div>
      ) : filteredEpics.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {linkedEpicIds.length === 0 
              ? 'No epics linked to this snapshot yet.'
              : searchQuery || showUnalignedOnly 
                ? 'No epics match your filters.'
                : 'No epics found.'}
          </p>
          {!isArchived && linkedEpicIds.length === 0 && (
            <Button onClick={() => setLinkDialogOpen(true)} variant="outline" size="sm">
              <Link2 className="h-3.5 w-3.5 mr-1" />
              Link your first epic
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
                    checked={selectedIds.length === filteredEpics.length && filteredEpics.length > 0}
                    onCheckedChange={toggleSelectAll}
                    disabled={isArchived}
                  />
                </TableHead>
                <TableHead>Epic</TableHead>
                <TableHead className="w-32">Program</TableHead>
                <TableHead className="w-32">Theme</TableHead>
                <TableHead className="w-28">Owner</TableHead>
                <TableHead className="w-20">Health</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Updated</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEpics.map((epic) => {
                const theme = getEpicTheme(epic.id);
                return (
                  <TableRow
                    key={epic.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedEpic(epic)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(epic.id)}
                        onCheckedChange={() => toggleSelect(epic.id)}
                        disabled={isArchived}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{epic.name}</span>
                        {epic.epic_key && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{epic.epic_key}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {epic.programs ? (
                        <Badge variant="outline" className="text-xs">
                          {epic.programs.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {theme ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                          />
                          <span className="text-xs truncate max-w-[80px]">{theme.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Unaligned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {epic.profiles?.full_name || '—'}
                    </TableCell>
                    <TableCell>{getHealthBadge(epic.health)}</TableCell>
                    <TableCell>{getStatusBadge(epic.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {epic.updated_at ? format(new Date(epic.updated_at), 'MMM d') : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!isArchived && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {theme ? (
                              <DropdownMenuItem onClick={() => unlinkFromThemeMutation.mutate(epic.id)}>
                                <Unlink className="h-4 w-4 mr-2" />
                                Unlink from theme
                              </DropdownMenuItem>
                            ) : (
                              themes.map(t => (
                                <DropdownMenuItem 
                                  key={t.id}
                                  onClick={() => linkToThemeMutation.mutate({ epicId: epic.id, themeId: t.id })}
                                >
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: t.color_tag || 'hsl(var(--brand-gold))' }}
                                  />
                                  Link to {t.name}
                                </DropdownMenuItem>
                              ))
                            )}
                            <DropdownMenuItem 
                              onClick={() => unlinkEpicMutation.mutate(epic.id)}
                              className="text-destructive"
                            >
                              <Unlink className="h-4 w-4 mr-2" />
                              Unlink from snapshot
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Link Dialog */}
      <EpicLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        snapshotId={snapshotId}
        linkedEpicIds={linkedEpicIds}
      />

      {/* Create/Edit Drawer */}
      <StrategicEpicDrawer
        open={createDrawerOpen || !!selectedEpic}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDrawerOpen(false);
            setSelectedEpic(null);
          }
        }}
        epic={selectedEpic}
        snapshotId={snapshotId}
        themes={themes}
        isArchived={isArchived}
        epicTheme={selectedEpic ? getEpicTheme(selectedEpic.id) : null}
      />
    </div>
  );
}