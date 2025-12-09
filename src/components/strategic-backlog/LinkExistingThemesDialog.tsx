import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Palette } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpsertSnapshotLinks, useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { catalystToast } from '@/lib/catalystToast';

interface LinkExistingThemesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  existingThemeIds: string[];
}

export function LinkExistingThemesDialog({ 
  open, 
  onOpenChange, 
  snapshotId,
  existingThemeIds 
}: LinkExistingThemesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const upsertLinks = useUpsertSnapshotLinks();
  const { data: links } = useSnapshotStrategyLinks(snapshotId);

  // Fetch all active themes not already linked to this snapshot
  const { data: availableThemes = [], isLoading } = useQuery({
    queryKey: ['all-themes-for-linking', snapshotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .neq('snapshot_id', snapshotId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filteredThemes = availableThemes.filter(theme => {
    // Exclude already linked themes
    if (existingThemeIds.includes(theme.id)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return theme.name.toLowerCase().includes(query);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLink = async () => {
    if (selectedIds.length === 0) return;

    try {
      const currentThemeIds = links?.theme_ids || [];
      await upsertLinks.mutateAsync({
        snapshot_id: snapshotId,
        theme_ids: [...currentThemeIds, ...selectedIds],
      });
      catalystToast.success('Themes Linked', `${selectedIds.length} theme(s) linked to snapshot`);
      setSelectedIds([]);
      setSearchQuery('');
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link existing themes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="border border-border rounded-lg max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading themes...</div>
            ) : filteredThemes.length === 0 ? (
              <div className="p-8 text-center">
                <Palette className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No themes match your search.' : 'No themes available to link.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredThemes.map((theme) => (
                  <label
                    key={theme.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(theme.id)}
                      onCheckedChange={() => toggleSelect(theme.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{theme.name}</p>
                      {theme.description && (
                        <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {theme.status || 'active'}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} theme{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={selectedIds.length === 0 || upsertLinks.isPending}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {upsertLinks.isPending ? 'Linking...' : `Link selected (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
