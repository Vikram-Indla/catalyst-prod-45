import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Plus, AlertCircle, X, Check } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';

interface ManageThemesPanelProps {
  snapshot: StrategicSnapshot;
  onBack: () => void;
}

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
}

// Hook to update theme links
function useUpdateThemeLinks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ snapshotId, themeIds }: { snapshotId: string; themeIds: string[] }) => {
      const { error } = await supabase
        .from('snapshot_configurations')
        .upsert(
          { snapshot_id: snapshotId, themes: themeIds },
          { onConflict: 'snapshot_id' }
        );
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-strategy-links', variables.snapshotId] });
      queryClient.invalidateQueries({ queryKey: ['snapshot-configuration', variables.snapshotId] });
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
    },
  });
}

export function ManageThemesPanel({ snapshot, onBack }: ManageThemesPanelProps) {
  const queryClient = useQueryClient();
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const { data: links } = useSnapshotStrategyLinks(snapshot.id);
  const updateLinks = useUpdateThemeLinks();
  
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchIncluded, setSearchIncluded] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived = snapshot.status === 'ARCHIVED';
  const linkedThemeIds = configuration?.themes || links?.theme_ids || [];

  // Fetch all available themes
  const { data: allThemes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['all-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, description, status')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
      })) as Theme[];
    },
  });

  // Split themes into available and included
  const includedThemes = useMemo(() => {
    return allThemes.filter(t => linkedThemeIds.includes(t.id));
  }, [allThemes, linkedThemeIds]);

  const availableThemes = useMemo(() => {
    return allThemes
      .filter(t => !linkedThemeIds.includes(t.id))
      .filter(t => t.name.toLowerCase().includes(searchAvailable.toLowerCase()));
  }, [allThemes, linkedThemeIds, searchAvailable]);

  const filteredIncludedThemes = useMemo(() => {
    return includedThemes.filter(t => 
      t.name.toLowerCase().includes(searchIncluded.toLowerCase())
    );
  }, [includedThemes, searchIncluded]);

  // Reset selections when links change
  useEffect(() => {
    setSelectedToAdd([]);
  }, [linkedThemeIds.length]);

  const handleAddSelected = async () => {
    if (isArchived || selectedToAdd.length === 0) return;
    setError(null);
    setSaving(true);
    
    try {
      const newThemeIds = [...linkedThemeIds, ...selectedToAdd];
      await updateLinks.mutateAsync({
        snapshotId: snapshot.id,
        themeIds: newThemeIds,
      });
      setSelectedToAdd([]);
      catalystToast.success('Themes Added', `${selectedToAdd.length} theme(s) linked to snapshot`);
    } catch (err: any) {
      setError(err.message || 'Failed to add themes');
      catalystToast.error('Error', err.message || 'Failed to add themes');
    } finally {
      setSaving(false);
    }
  };

  const toggleAddSelection = (themeId: string) => {
    setSelectedToAdd(prev => 
      prev.includes(themeId) ? prev.filter(id => id !== themeId) : [...prev, themeId]
    );
  };

  // Helper for status badge styling
  const getStatusBadgeStyles = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return "bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] border-transparent";
    if (s === 'proposed') return "bg-brand-primary/15 text-brand-primary border-transparent";
    if (s === 'archived') return "bg-muted text-muted-foreground border-transparent";
    return "bg-muted text-muted-foreground border-transparent";
  };

  // Handle single theme removal
  const handleRemoveSingle = async (themeId: string) => {
    if (isArchived) return;
    setSaving(true);
    try {
      const newThemeIds = linkedThemeIds.filter(id => id !== themeId);
      await updateLinks.mutateAsync({
        snapshotId: snapshot.id,
        themeIds: newThemeIds,
      });
      catalystToast.success('Theme Removed', 'Theme unlinked from snapshot');
    } catch (err: any) {
      setError(err.message || 'Failed to remove theme');
      catalystToast.error('Error', err.message || 'Failed to remove theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-brand-primary">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-base font-semibold text-foreground">Manage Themes</h3>
          <p className="text-xs text-muted-foreground">{snapshot.name}</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 mt-4">
        {/* Left: Available Themes */}
        <div className="flex flex-col min-h-0">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Available Themes ({availableThemes.length})
          </Label>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchAvailable}
              onChange={(e) => setSearchAvailable(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <ScrollArea className="flex-1 border border-border rounded-lg">
            <div className="p-2 space-y-1">
              {themesLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : availableThemes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchAvailable ? 'No matching themes' : 'All themes linked'}
                </p>
              ) : (
                availableThemes.map((theme) => (
                  <label
                    key={theme.id}
                    className={cn(
                      'flex items-start gap-2.5 py-2.5 px-3 rounded-lg cursor-pointer transition-colors',
                      selectedToAdd.includes(theme.id)
                        ? 'bg-brand-primary/10 border border-brand-primary/30'
                        : 'hover:bg-muted/50 border border-transparent',
                      isArchived && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Checkbox
                      checked={selectedToAdd.includes(theme.id)}
                      onCheckedChange={() => !isArchived && toggleAddSelection(theme.id)}
                      disabled={isArchived}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">{theme.name}</span>
                      {theme.status && (
                        <Badge className={cn("mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full", getStatusBadgeStyles(theme.status))}>
                          {theme.status}
                        </Badge>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          {!isArchived && (
            <Button
              size="sm"
              className="mt-3 bg-brand-primary hover:bg-brand-primary-hover text-white"
              onClick={handleAddSelected}
              disabled={selectedToAdd.length === 0 || saving}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Selected ({selectedToAdd.length})
            </Button>
          )}
        </div>

        {/* Right: Included Themes */}
        <div className="flex flex-col min-h-0">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Included in Snapshot ({includedThemes.length})
          </Label>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchIncluded}
              onChange={(e) => setSearchIncluded(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <ScrollArea className="flex-1 border border-border rounded-lg bg-muted/30">
            <div className="p-2 space-y-1.5">
              {filteredIncludedThemes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                    <Check className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    {searchIncluded ? 'No matching themes' : 'No themes linked yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select themes from the left to include them
                  </p>
                </div>
              ) : (
                filteredIncludedThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <span className="text-sm font-medium text-foreground block truncate">{theme.name}</span>
                      {theme.status && (
                        <Badge className={cn("mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full", getStatusBadgeStyles(theme.status))}>
                          {theme.status}
                        </Badge>
                      )}
                    </div>
                    {/* Individual remove button */}
                    {!isArchived && (
                      <button
                        onClick={() => handleRemoveSingle(theme.id)}
                        disabled={saving}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {linkedThemeIds.length} theme{linkedThemeIds.length !== 1 ? 's' : ''} linked
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
