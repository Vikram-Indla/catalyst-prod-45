import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Plus, Minus, AlertCircle, Check, X } from 'lucide-react';
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
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([]);
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
    setSelectedToRemove([]);
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

  const handleRemoveSelected = async () => {
    if (isArchived || selectedToRemove.length === 0) return;
    setError(null);
    setSaving(true);
    
    try {
      const newThemeIds = linkedThemeIds.filter(id => !selectedToRemove.includes(id));
      await updateLinks.mutateAsync({
        snapshotId: snapshot.id,
        themeIds: newThemeIds,
      });
      setSelectedToRemove([]);
      catalystToast.success('Themes Removed', `${selectedToRemove.length} theme(s) unlinked from snapshot`);
    } catch (err: any) {
      setError(err.message || 'Failed to remove themes');
      catalystToast.error('Error', err.message || 'Failed to remove themes');
    } finally {
      setSaving(false);
    }
  };

  const toggleAddSelection = (themeId: string) => {
    setSelectedToAdd(prev => 
      prev.includes(themeId) ? prev.filter(id => id !== themeId) : [...prev, themeId]
    );
  };

  const toggleRemoveSelection = (themeId: string) => {
    setSelectedToRemove(prev => 
      prev.includes(themeId) ? prev.filter(id => id !== themeId) : [...prev, themeId]
    );
  };

  // Helper for status badge styling
  const getStatusBadgeStyles = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return "bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] border-transparent";
    if (s === 'proposed') return "bg-[rgba(212,184,150,0.3)] text-[#8B7355] border-transparent";
    if (s === 'archived') return "bg-[rgba(139,147,158,0.15)] text-[#8B949E] border-transparent";
    return "bg-[rgba(139,147,158,0.15)] text-[#8B949E] border-transparent";
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
      <div className="flex items-center gap-3 pb-4 border-b border-[#E8E4DC] dark:border-[#30363D]">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-base font-semibold text-[#24292F] dark:text-[#E6EDF3]">Manage Themes</h3>
          <p className="text-xs text-[#8B949E] dark:text-[#6E7681]">{snapshot.name}</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Gold Vertical Line + Content */}
      <div className="flex-1 flex overflow-hidden mt-4">
        {/* GOLD VERTICAL LINE — LOCKED STANDARD */}
        <div className="w-1 bg-[#C69C6D] flex-shrink-0" />
        
        {/* Two-column layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 pl-4">
          {/* Left: Available Themes */}
          <div className="flex flex-col min-h-0">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681] mb-2">
              Available Themes ({availableThemes.length})
            </Label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B949E]" />
            <Input
              placeholder="Search..."
              value={searchAvailable}
              onChange={(e) => setSearchAvailable(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
            <ScrollArea className="flex-1 border border-[#E8E4DC] dark:border-[#30363D] rounded-md">
              <div className="p-2 space-y-1">
                {themesLoading ? (
                  <p className="text-sm text-[#8B949E] text-center py-4">Loading...</p>
                ) : availableThemes.length === 0 ? (
                  <p className="text-sm text-[#8B949E] text-center py-4">
                    {searchAvailable ? 'No matching themes' : 'All themes linked'}
                  </p>
                ) : (
                  availableThemes.map((theme) => (
                    <label
                      key={theme.id}
                      className={cn(
                        'flex items-start gap-2 py-2 px-2.5 rounded-md cursor-pointer transition-colors',
                        selectedToAdd.includes(theme.id)
                          ? 'bg-[rgba(198,156,109,0.1)]'
                          : 'hover:bg-[rgba(198,156,109,0.06)]',
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
                        <span className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] line-clamp-1">{theme.name}</span>
                        {theme.status && (
                          <Badge className={cn("mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full", getStatusBadgeStyles(theme.status))}>
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
              className="mt-2 bg-[hsl(var(--brand-gold))] hover:bg-[hsl(var(--brand-gold-hover))] text-white"
              onClick={handleAddSelected}
              disabled={selectedToAdd.length === 0 || saving}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Selected ({selectedToAdd.length})
            </Button>
          )}
        </div>

            {/* Right: Included Themes */}
            <div className="flex flex-col min-h-0">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681] mb-2">
                Included in Snapshot ({includedThemes.length})
              </Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B949E]" />
                <Input
                  placeholder="Search..."
                  value={searchIncluded}
                  onChange={(e) => setSearchIncluded(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <ScrollArea className="flex-1 border border-[#E8E4DC] dark:border-[#30363D] rounded-md">
                <div className="p-2 space-y-1">
                  {filteredIncludedThemes.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-[#E8E4DC] dark:border-[#30363D] rounded-[10px] text-center">
                      <p className="text-sm text-[#8B949E] italic">
                        {searchIncluded ? 'No matching themes' : 'No themes linked yet'}
                      </p>
                    </div>
                  ) : (
                    filteredIncludedThemes.map((theme) => (
                      <div
                        key={theme.id}
                        className={cn(
                          "flex items-center justify-between p-3.5",
                          "bg-[rgba(92,124,92,0.08)] dark:bg-[rgba(92,124,92,0.12)]",
                          "border-b border-[#E8E4DC] dark:border-[#21262D] last:border-b-0 rounded-md"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] line-clamp-1">{theme.name}</span>
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
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[#8B949E] hover:bg-[#F5F3F0] dark:hover:bg-[#21262D] hover:text-[#24292F] dark:hover:text-[#E6EDF3] transition-colors"
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
        </div>

      {/* Summary */}
      <div className="pt-4 mt-4 border-t border-[#E8E4DC] dark:border-[#30363D]">
        <div className="flex items-center justify-between">
          <Badge className="text-xs bg-[#F5F3F0] dark:bg-[#21262D] text-[#57534E] dark:text-[#B0BAC6]">
            {linkedThemeIds.length} theme{linkedThemeIds.length !== 1 ? 's' : ''} linked
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="border-[#E8E4DC] dark:border-[#30363D] text-[#57534E] dark:text-[#B0BAC6] hover:bg-[#F5F3F0] dark:hover:bg-[#21262D]"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
