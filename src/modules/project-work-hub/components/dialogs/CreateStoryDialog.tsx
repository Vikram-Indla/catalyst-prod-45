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
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import {
  Loader2,
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
  User,
} from 'lucide-react';

// ─── Priority Config (Jira icons + colors) ───────────────
const PRIORITIES = [
  { value: 'highest', label: 'Highest', icon: ChevronsUp, color: '#CF2600' },
  { value: 'high',    label: 'High',    icon: ChevronUp,  color: '#E56910' },
  { value: 'medium',  label: 'Medium',  icon: Minus,      color: '#CF7B00' },
  { value: 'low',     label: 'Low',     icon: ChevronDown, color: '#1868DB' },
  { value: 'lowest',  label: 'Lowest',  icon: ChevronsDown, color: '#1868DB' },
] as const;

// ─── Status category colors ──────────────────────────────
const STATUS_CATEGORY_STYLES: Record<string, { dot: string; label: string }> = {
  todo:        { dot: '#DFE1E6', label: 'To Do' },
  in_progress: { dot: '#0C66E4', label: 'In Progress' },
  done:        { dot: '#1B7F37', label: 'Done' },
};

// ─── Avatar Helper ───────────────────────────────────────
const AVATAR_COLORS = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A', '#0284C7', '#BE123C'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function UserAvatar({ name, url, size = 24 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, backgroundColor: getAvatarColor(name), fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────
interface WorkflowStatus {
  id: string;
  name: string;
  slug?: string;
  status_category?: string;
  position?: number;
}

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

  // Form state (FIX 1: no description, FIX 2: no storyPoints)
  const [title, setTitle] = useState('');
  const [featureId, setFeatureId] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusId, setStatusId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [releaseId, setReleaseId] = useState('');
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

  // Team members (profiles) with avatars
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

  // Current user for "Assign to me" and Reporter auto-fill
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    enabled: isOpen,
  });

  // Workflow statuses for this project (FIX 3)
  const { data: workflowStatuses } = useQuery({
    queryKey: ['ph-workflow-statuses', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_workflow_statuses')
        .select('id, name, slug, status_category, position')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw error;
      return (data || []) as WorkflowStatus[];
    },
    enabled: isOpen && !!projectId,
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

  // Auto-fill Reporter with current user (FIX 5b)
  useEffect(() => {
    if (currentUser?.id && !reporterId) {
      setReporterId(currentUser.id);
    }
  }, [currentUser?.id, reporterId]);

  // Auto-set default status to "IN REQUIREMENTS" or first todo status (FIX 3)
  useEffect(() => {
    if (workflowStatuses && workflowStatuses.length > 0 && !statusId) {
      const inReq = workflowStatuses.find(s =>
        s.name?.toLowerCase().replace(/\s+/g, '_') === 'in_requirements' ||
        s.slug === 'in_requirements' ||
        s.name?.toLowerCase() === 'in requirements'
      );
      if (inReq) {
        setStatusId(inReq.id);
      } else {
        const firstTodo = workflowStatuses.find(s => s.status_category === 'todo');
        if (firstTodo) setStatusId(firstTodo.id);
        else setStatusId(workflowStatuses[0].id);
      }
    }
  }, [workflowStatuses, statusId]);

  // Group statuses by category
  const groupedStatuses = React.useMemo(() => {
    if (!workflowStatuses) return { todo: [], in_progress: [], done: [] };
    const groups: Record<string, WorkflowStatus[]> = { todo: [], in_progress: [], done: [] };
    for (const s of workflowStatuses) {
      const cat = s.status_category || 'todo';
      if (groups[cat]) groups[cat].push(s);
      else groups.todo.push(s);
    }
    return groups;
  }, [workflowStatuses]);

  // ─── Mutation ────────────────────────────────────────────

  const createStory = useMutation({
    mutationFn: async (storyData: {
      title: string;
      name: string;
      feature_id: string;
      acceptance_criteria?: string;
      priority?: string;
      assignee_id?: string;
      owner_id?: string;
      status_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: storyData.title,
          name: storyData.name,
          feature_id: storyData.feature_id,
          acceptance_criteria: storyData.acceptance_criteria || null,
          priority: storyData.priority || 'medium',
          assignee_id: storyData.assignee_id || null,
          owner_id: storyData.owner_id || null,
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
    setFeatureId('');
    setAcceptanceCriteria('');
    setPriority('medium');
    setStatusId('');
    setAssigneeId('');
    setReporterId(currentUser?.id || '');
    setReleaseId('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !featureId || !reporterId) return;

    createStory.mutate({
      title: title.trim(),
      name: title.trim(),
      feature_id: featureId,
      acceptance_criteria: acceptanceCriteria.trim() || undefined,
      priority: priority || 'medium',
      assignee_id: assigneeId && assigneeId !== '__none__' ? assigneeId : undefined,
      owner_id: reporterId && reporterId !== '__none__' ? reporterId : undefined,
      status_id: statusId || undefined,
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

  const isValid = title.trim().length >= 3 && featureId && reporterId;

  // Helper to find profile by id
  const findProfile = (id: string) => profiles?.find(p => p.id === id);
  const selectedReporter = findProfile(reporterId);
  const selectedAssignee = findProfile(assigneeId);
  const selectedStatus = workflowStatuses?.find(s => s.id === statusId);

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
            Stories must belong to a Feature. Fields marked with <span className="text-[#AE2E24]">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6 space-y-5">

          {/* ── ROW 1: Feature (half) + Priority (half) ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Feature */}
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>
                Feature <span style={{ color: '#AE2E24' }}>*</span>
              </Label>
              <Select value={featureId} onValueChange={setFeatureId} disabled={featuresLoading || createStory.isPending}>
                <SelectTrigger className="h-10" style={{ border: '1px solid #8C8F97', borderRadius: 3 }}>
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
              <p className="text-[12px]" style={{ color: '#6B6E76' }}>
                Stories must belong to a Feature
              </p>
            </div>

            {/* Priority (FIX 4: correct Jira icons + colors) */}
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority} disabled={createStory.isPending}>
                <SelectTrigger className="h-10" style={{ border: '1px solid #8C8F97', borderRadius: 3 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => {
                    const Icon = p.icon;
                    return (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <Icon size={16} style={{ color: p.color }} />
                          <span>{p.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── ROW 2: Status dropdown (FIX 3) ── */}
          <div className="space-y-1">
            <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>
              Status
            </Label>
            <Select value={statusId} onValueChange={setStatusId} disabled={createStory.isPending}>
              <SelectTrigger className="h-10 w-auto min-w-[200px] inline-flex" style={{ border: '1px solid #8C8F97', borderRadius: 3 }}>
                <SelectValue placeholder="Select status">
                  {selectedStatus && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_CATEGORY_STYLES[selectedStatus.status_category || 'todo']?.dot || '#DFE1E6' }}
                      />
                      <span>{selectedStatus.name?.toUpperCase()}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* To Do group */}
                {groupedStatuses.todo.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">To Do</SelectLabel>
                    {groupedStatuses.todo.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#DFE1E6' }} />
                          <span>{s.name?.toUpperCase()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {groupedStatuses.todo.length > 0 && groupedStatuses.in_progress.length > 0 && <SelectSeparator />}
                {/* In Progress group */}
                {groupedStatuses.in_progress.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">In Progress</SelectLabel>
                    {groupedStatuses.in_progress.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#0C66E4' }} />
                          <span>{s.name?.toUpperCase()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {groupedStatuses.in_progress.length > 0 && groupedStatuses.done.length > 0 && <SelectSeparator />}
                {/* Done group */}
                {groupedStatuses.done.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Done</SelectLabel>
                    {groupedStatuses.done.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#1B7F37' }} />
                          <span>{s.name?.toUpperCase()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <p className="text-[12px]" style={{ color: '#6B6E76' }}>
              This is the initial status upon creation
            </p>
          </div>

          {/* ── ROW 3: Summary (full width) ── */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="story-title" className="text-[12px] font-semibold" style={{ color: '#505258' }}>
                Summary <span style={{ color: '#AE2E24' }}>*</span>
              </Label>
              <span className="text-[12px]" style={{ color: '#6B6E76' }}>{title.length}/200</span>
            </div>
            <Input
              ref={titleRef}
              id="story-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="What needs to be done?"
              disabled={createStory.isPending}
              className="h-9"
              style={{ borderBottom: '0.5px solid #8C8F97', borderRadius: '0 0 3px 3px', fontSize: 14, color: '#292A2E' }}
            />
            {title.length > 0 && title.length < 3 && (
              <p className="text-[12px]" style={{ color: '#AE2E24' }}>
                Title must be at least 3 characters
              </p>
            )}
          </div>

          {/* ── ROW 4: Acceptance Criteria (full width) ── */}
          <div className="space-y-1">
            <Label htmlFor="story-ac" className="text-[12px] font-semibold" style={{ color: '#505258' }}>
              Acceptance Criteria
            </Label>
            <Textarea
              id="story-ac"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="Enter acceptance criteria (optional)"
              rows={3}
              disabled={createStory.isPending}
              style={{ fontSize: 14, color: '#292A2E' }}
            />
          </div>

          {/* ── ROW 5: Reporter (half) + Target Release (half) ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Reporter (FIX 5: renamed from Owner, auto-filled, with avatars) */}
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>
                Reporter <span style={{ color: '#AE2E24' }}>*</span>
              </Label>
              <Select value={reporterId} onValueChange={setReporterId} disabled={createStory.isPending}>
                <SelectTrigger className="h-10" style={{ border: '1px solid #8C8F97', borderRadius: 3 }}>
                  <SelectValue placeholder="Select reporter">
                    {selectedReporter && (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={selectedReporter.full_name} url={selectedReporter.avatar_url} size={20} />
                        <span>{selectedReporter.full_name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={p.full_name} url={p.avatar_url} size={24} />
                        <span>{p.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Release (FIX 7) */}
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>
                Target Release
              </Label>
              <Select value={releaseId} onValueChange={setReleaseId} disabled={createStory.isPending}>
                <SelectTrigger className="h-10" style={{ border: '1px solid #8C8F97', borderRadius: 3 }}>
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

          {/* ── ROW 6: Assignee (full width, with avatars) (FIX 6) ── */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>
                Assignee
              </Label>
              {currentUser?.id && (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: '#1868DB' }}
                >
                  Assign to me
                </button>
              )}
            </div>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={createStory.isPending}>
              <SelectTrigger className="h-10" style={{ border: '1px solid #8C8F97', borderRadius: 3 }}>
                <SelectValue placeholder="Automatic">
                  {selectedAssignee ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={selectedAssignee.full_name} url={selectedAssignee.avatar_url} size={20} />
                      <span>{selectedAssignee.full_name}</span>
                    </div>
                  ) : assigneeId === '__none__' ? (
                    <span className="text-muted-foreground">Unassigned</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <span>Automatic</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Unassigned</span>
                  </div>
                </SelectItem>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={p.full_name} url={p.avatar_url} size={24} />
                      <span>{p.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer (FIX 8: button color #1868DB) */}
        <div
          className="flex items-center justify-between pt-4 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl flex-shrink-0
            border-t border-border/60"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-another"
              checked={createAnother}
              onCheckedChange={(checked) => setCreateAnother(checked === true)}
            />
            <Label htmlFor="create-another" className="text-[14px] cursor-pointer select-none" style={{ color: '#292A2E' }}>
              Create another
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={createStory.isPending}
              style={{ color: '#505258', height: 32, borderRadius: 3, fontSize: 14, fontWeight: 500 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createStory.isPending}
              style={{ backgroundColor: '#1868DB', color: '#FFFFFF', height: 32, borderRadius: 3, fontSize: 14, fontWeight: 500 }}
              className="hover:opacity-90"
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
