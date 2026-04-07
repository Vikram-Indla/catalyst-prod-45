import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import {
  Loader2,
  ChevronsUp,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';

// ─── Priority Config ─────────────────────────────────────
const PRIORITIES = [
  { value: 'critical', label: 'Critical', icon: ChevronsUp, color: '#EF4444' },
  { value: 'high', label: 'High', icon: ArrowUp, color: '#F59E0B' },
  { value: 'medium', label: 'Medium', icon: ArrowRight, color: '#3B82F6' },
  { value: 'low', label: 'Low', icon: ArrowDown, color: '#737373' },
] as const;

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projectId: string;
}

export const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featureId, setFeatureId] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [createAnother, setCreateAnother] = useState(false);

  // Auto-focus title on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // ─── Data Queries ────────────────────────────────────────

  // Features for this project
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['features-for-story', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!projectId,
  });

  // Team members (profiles)
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Current user for "Assign to me"
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    enabled: isOpen,
  });

  // Releases for this project
  const { data: releases } = useQuery({
    queryKey: ['releases-for-story', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, name, status')
        .order('release_date');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // ─── Mutation ────────────────────────────────────────────

  const createStory = useMutation({
    mutationFn: async (storyData: {
      title: string;
      name: string;
      description?: string;
      feature_id: string;
      acceptance_criteria?: string;
      priority?: string;
      assignee_id?: string;
      owner_id?: string;
      estimate_points?: number;
    }) => {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: storyData.title,
          name: storyData.name,
          description: storyData.description || null,
          feature_id: storyData.feature_id,
          acceptance_criteria: storyData.acceptance_criteria || null,
          priority: storyData.priority || 'medium',
          assignee_id: storyData.assignee_id || null,
          owner_id: storyData.owner_id || null,
          estimate_points: storyData.estimate_points || null,
          status: 'todo',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Story created', 'The story has been created successfully.');

      if (createAnother) {
        resetForm();
        setTimeout(() => titleRef.current?.focus(), 100);
      } else {
        resetForm();
        onClose();
        onSuccess?.();
      }
    },
    onError: (error: any) => {
      toast.error('Failed to create story', error.message);
    },
  });

  // ─── Form Helpers ────────────────────────────────────────

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFeatureId('');
    setAcceptanceCriteria('');
    setPriority('medium');
    setAssigneeId('');
    setOwnerId('');
    setReleaseId('');
    setStoryPoints('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !featureId) return;

    createStory.mutate({
      title: title.trim(),
      name: title.trim(),
      description: description.trim() || undefined,
      feature_id: featureId,
      acceptance_criteria: acceptanceCriteria.trim() || undefined,
      priority: priority || 'medium',
      assignee_id: assigneeId || undefined,
      owner_id: ownerId || undefined,
      estimate_points: storyPoints ? parseInt(storyPoints, 10) : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAssignToMe = () => {
    if (currentUser?.id) {
      setAssigneeId(currentUser.id);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid = title.trim().length >= 3 && featureId;

  // ─── Render ──────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        size="lg"
        className="max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.01em]" style={{ fontFamily: 'Sora, sans-serif' }}>
            Create Story
          </DialogTitle>
          <DialogDescription className="text-[13px] mt-1">
            Stories must belong to a Feature. Fields marked with <span className="text-[#AE2E24] dark:text-[#F87171]">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6 space-y-5">
          {/* ── Row 1: Feature (half) + Priority (half) ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Feature */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Feature <span className="text-[#AE2E24] dark:text-[#F87171]">*</span>
              </Label>
              <Select value={featureId} onValueChange={setFeatureId} disabled={featuresLoading || createStory.isPending}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={featuresLoading ? 'Loading...' : 'Select parent feature'} />
                </SelectTrigger>
                <SelectContent>
                  {features?.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.display_id ? `${feature.display_id}: ` : ''}{feature.name}
                    </SelectItem>
                  ))}
                  {features?.length === 0 && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      No features found. Create a feature first.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground dark:text-[#878787]">
                Stories must belong to a Feature
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority} disabled={createStory.isPending}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => {
                    const Icon = p.icon;
                    return (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: p.color }} />
                          <span>{p.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Row 2: Status (read-only badge) ── */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
              Status
            </Label>
            <div
              className="inline-flex items-center h-8 px-2.5 rounded text-sm font-medium
                bg-[#DFE1E6] text-[#253858]
                dark:bg-[rgba(255,255,255,0.06)] dark:text-[#A1A1A1]"
            >
              TO DO
            </div>
            <p className="text-[11px] text-muted-foreground dark:text-[#878787]">
              This is the initial status upon creation
            </p>
          </div>

          {/* ── Row 3: Title (full width) ── */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="story-title" className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Summary <span className="text-[#AE2E24] dark:text-[#F87171]">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground dark:text-[#878787]">{title.length}/200</span>
            </div>
            <Input
              ref={titleRef}
              id="story-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="What needs to be done?"
              disabled={createStory.isPending}
              className="h-10"
            />
            {title.length > 0 && title.length < 3 && (
              <p className="text-[11px] text-[#AE2E24] dark:text-[#F87171]">
                Title must be at least 3 characters
              </p>
            )}
          </div>

          {/* ── Row 4: Description (full width) ── */}
          <div className="space-y-1">
            <Label htmlFor="story-desc" className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
              Description
            </Label>
            <Textarea
              id="story-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this story (optional)"
              rows={3}
              disabled={createStory.isPending}
            />
          </div>

          {/* ── Row 5: Acceptance Criteria (full width) ── */}
          <div className="space-y-1">
            <Label htmlFor="story-ac" className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
              Acceptance Criteria
            </Label>
            <Textarea
              id="story-ac"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="Enter acceptance criteria (optional)"
              rows={3}
              disabled={createStory.isPending}
            />
          </div>

          {/* ── Row 6: Owner (half) + Story Points (half) ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Owner */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Owner
              </Label>
              <Select value={ownerId} onValueChange={setOwnerId} disabled={createStory.isPending}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {profiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Story Points */}
            <div className="space-y-1">
              <Label htmlFor="story-points" className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Story Points
              </Label>
              <Input
                id="story-points"
                type="number"
                min={0}
                max={100}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="0"
                disabled={createStory.isPending}
                className="h-10"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
          </div>

          {/* ── Row 7: Assignee (full width) ── */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Assignee
              </Label>
              {currentUser?.id && (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                >
                  Assign to me
                </button>
              )}
            </div>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={createStory.isPending}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Automatic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Row 8: Target Release (half) ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground dark:text-[#A1A1A1]">
                Target Release
              </Label>
              <Select value={releaseId} onValueChange={setReleaseId} disabled={createStory.isPending}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select release" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {releases?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-4 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl flex-shrink-0
            border-t border-border/60 dark:border-white/[0.035]
            bg-muted/30 dark:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-another"
              checked={createAnother}
              onCheckedChange={(checked) => setCreateAnother(checked === true)}
            />
            <Label htmlFor="create-another" className="text-sm cursor-pointer select-none">
              Create another
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={createStory.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createStory.isPending}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              {createStory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
