import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Zap, Save, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StrategicTheme } from '@/types/strategicBacklog';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  status?: string;
  health?: string;
  owner_id?: string;
  primary_program_id?: string;
  description?: string;
}

interface StrategicEpicDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epic: Epic | null;
  snapshotId: string;
  themes: StrategicTheme[];
  isArchived: boolean;
  epicTheme: StrategicTheme | null;
}

export function StrategicEpicDrawer({ 
  open, 
  onOpenChange, 
  epic, 
  snapshotId, 
  themes, 
  isArchived,
  epicTheme 
}: StrategicEpicDrawerProps) {
  const queryClient = useQueryClient();
  const isCreate = !epic;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [health, setHealth] = useState('');
  const [status, setStatus] = useState('');
  const [linkedThemeId, setLinkedThemeId] = useState('');

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-epic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch users for owner selection
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-epic-owner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Reset form when epic changes
  useEffect(() => {
    if (epic) {
      setName(epic.name || '');
      setDescription(epic.description || '');
      setProgramId(epic.primary_program_id || '');
      setOwnerId(epic.owner_id || '');
      setHealth(epic.health || '');
      setStatus(epic.status || '');
      setLinkedThemeId(epicTheme?.id || '');
    } else {
      setName('');
      setDescription('');
      setProgramId('');
      setOwnerId('');
      setHealth('');
      setStatus('');
      setLinkedThemeId('');
    }
  }, [epic, epicTheme]);

  // Create epic mutation
  const createEpicMutation = useMutation({
    mutationFn: async () => {
      // Create epic - use any to bypass strict Supabase types
      const epicData = {
        name,
        description: description || null,
        primary_program_id: programId || null,
        owner_id: ownerId || null,
        health: health === 'amber' ? 'yellow' : health || null,
        status: status || 'analyzing',
      } as any;

      const { data: newEpic, error: epicError } = await supabase
        .from('epics')
        .insert(epicData)
        .select('id')
        .single();
      
      if (epicError) throw epicError;

      // Link to snapshot
      const { data: existingLinks } = await supabase
        .from('snapshot_strategy_links')
        .select('epic_ids')
        .eq('snapshot_id', snapshotId)
        .single();

      const currentEpicIds = existingLinks?.epic_ids || [];
      const newEpicIds = [...currentEpicIds, newEpic.id];

      if (existingLinks) {
        await supabase
          .from('snapshot_strategy_links')
          .update({ epic_ids: newEpicIds })
          .eq('snapshot_id', snapshotId);
      } else {
        await supabase
          .from('snapshot_strategy_links')
          .insert({ 
            snapshot_id: snapshotId, 
            epic_ids: newEpicIds,
            mission_ids: [],
            vision_ids: [],
            value_ids: [],
            goal_ids: [],
            theme_ids: []
          });
      }

      // Link to theme if selected
      if (linkedThemeId) {
        await supabase.from('theme_epic_links').insert({
          epic_id: newEpic.id,
          theme_id: linkedThemeId,
        });
      }

      return newEpic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-strategy-links'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-backlog-epics'] });
      queryClient.invalidateQueries({ queryKey: ['theme-epic-links'] });
      toast.success('Epic created and linked to snapshot');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to create epic'),
  });

  // Update epic mutation
  const updateEpicMutation = useMutation({
    mutationFn: async () => {
      if (!epic) return;

      const updateData = {
        name,
        description: description || null,
        primary_program_id: programId || null,
        owner_id: ownerId || null,
        health: health === 'amber' ? 'yellow' : health || null,
        status: status || null,
      } as any;

      const { error } = await supabase
        .from('epics')
        .update(updateData)
        .eq('id', epic.id);
      
      if (error) throw error;

      // Update theme link
      await supabase.from('theme_epic_links').delete().eq('epic_id', epic.id);
      if (linkedThemeId) {
        await supabase.from('theme_epic_links').insert({
          epic_id: epic.id,
          theme_id: linkedThemeId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-backlog-epics'] });
      queryClient.invalidateQueries({ queryKey: ['theme-epic-links'] });
      toast.success('Epic updated');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update epic'),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Epic name is required');
      return;
    }
    if (isCreate) {
      createEpicMutation.mutate();
    } else {
      updateEpicMutation.mutate();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto bg-background">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-gold" />
            {isCreate ? 'Create Epic' : epic?.name}
          </SheetTitle>
          {!isCreate && epic?.epic_key && (
            <Badge variant="outline" className="w-fit font-mono text-xs">
              {epic.epic_key}
            </Badge>
          )}
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Epic name"
              disabled={isArchived}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Epic description..."
              rows={3}
              disabled={isArchived}
            />
          </div>

          <Separator />

          {/* Program */}
          <div className="space-y-2">
            <Label htmlFor="program">Program {isCreate && '*'}</Label>
            <Select value={programId} onValueChange={setProgramId} disabled={isArchived}>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId} disabled={isArchived}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Health */}
            <div className="space-y-2">
              <Label htmlFor="health">Health</Label>
              <Select value={health} onValueChange={setHealth} disabled={isArchived}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isArchived}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funnel">Funnel</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="implementing">Implementing</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Theme Alignment */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Theme Alignment
            </Label>
            <Select value={linkedThemeId} onValueChange={setLinkedThemeId} disabled={isArchived}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No theme (Unaligned)</SelectItem>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.color_tag || 'hsl(var(--brand-gold))' }}
                      />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!linkedThemeId && (
              <p className="text-xs text-amber-600">
                Epic will be marked as "Unaligned" in the backlog.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isArchived && (
          <div className="pt-4 border-t border-border">
            <Button 
              onClick={handleSave} 
              className="w-full bg-brand-gold hover:bg-brand-gold/90"
              disabled={createEpicMutation.isPending || updateEpicMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isCreate ? 'Create Epic' : 'Save Changes'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}