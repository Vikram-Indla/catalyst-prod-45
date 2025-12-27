// src/components/features/CreateFeatureModal.tsx
// Enterprise-grade Create Feature modal following Catalyst Design System
// Matches the style of CreateBusinessRequestModal

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Save, FileText, Layers, User, FolderTree, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { 
  ProgressRing, 
  KeyboardShortcuts, 
  AutoSaveIndicator, 
  type AutoSaveStatus 
} from '@/components/business-requests/create-form';

interface CreateFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (featureId: string) => void;
  defaultEpicId?: string;
  defaultProjectId?: string;
}

interface FormState {
  featureName: string;
  description: string;
  parentEpicId: string;
  assigneeId: string;
  projectId: string;
  projectName: string;
}

const DRAFT_KEY = 'catalyst_feature_draft';

const getInitialFormData = (defaultEpicId?: string, defaultProjectId?: string): FormState => ({
  featureName: '',
  description: '',
  parentEpicId: defaultEpicId || '',
  assigneeId: '',
  projectId: defaultProjectId || '',
  projectName: '',
});

// Generate initials from a full name
function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Section header component
function SectionHeader({ 
  icon: Icon, 
  title 
}: { 
  icon: React.ElementType; 
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-[#2563eb]" />
      <span className="text-sm font-semibold text-[#2563eb]">{title}</span>
    </div>
  );
}

export function CreateFeatureModal({
  isOpen,
  onClose,
  onSuccess,
  defaultEpicId,
  defaultProjectId,
}: CreateFeatureModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormState>(() => getInitialFormData(defaultEpicId, defaultProjectId));
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  // Fetch epics for dropdown
  const { data: epics = [], isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-for-feature-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name, program_id')
        .is('deleted_at', null)
        .order('epic_key', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch projects for mapping
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-feature-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, program_id');
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch users for assignee dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-for-feature-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Calculate completion percentage
  const completionPercent = useMemo(() => {
    let filled = 0;
    const totalFields = 4;
    
    if (formData.featureName.trim().length >= 3) filled++;
    if (formData.description.replace(/<[^>]*>/g, '').trim().length > 0) filled++;
    if (formData.parentEpicId) filled++;
    if (formData.assigneeId) filled++;
    
    return Math.round((filled / totalFields) * 100);
  }, [formData]);

  // Validation
  const isValid = useMemo(() => {
    return (
      formData.featureName.trim().length >= 3 &&
      formData.description.replace(/<[^>]*>/g, '').trim().length > 0 &&
      formData.parentEpicId.length > 0 &&
      formData.assigneeId.length > 0
    );
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    if (!isOpen) return;
    
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && !defaultEpicId && !defaultProjectId) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [isOpen, defaultEpicId, defaultProjectId]);

  // Save draft on change (debounced)
  useEffect(() => {
    if (!isOpen) return;
    
    setAutoSaveStatus('saving');
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [formData, isOpen]);

  // Auto-populate project when epic is selected
  useEffect(() => {
    if (formData.parentEpicId && epics.length > 0 && projects.length > 0) {
      const selectedEpic = epics.find(e => e.id === formData.parentEpicId);
      if (selectedEpic?.program_id) {
        // Find a project that belongs to the same program
        const matchingProject = projects.find(p => p.program_id === selectedEpic.program_id);
        if (matchingProject) {
          setFormData(prev => ({ 
            ...prev, 
            projectId: matchingProject.id,
            projectName: matchingProject.name || 'Unknown Project'
          }));
        }
      }
    }
  }, [formData.parentEpicId, epics, projects]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Create feature mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      // Generate display_id
      const { data: lastFeature } = await supabase
        .from('features')
        .select('display_id')
        .like('display_id', 'FTR-%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let nextNumber = 1;
      if (lastFeature?.display_id) {
        const match = lastFeature.display_id.match(/FTR-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const displayId = `FTR-${String(nextNumber).padStart(3, '0')}`;
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert feature
      const { data: newFeature, error } = await supabase
        .from('features')
        .insert({
          display_id: displayId,
          name: data.featureName.trim(),
          description: data.description.trim(),
          epic_id: data.parentEpicId || null,
          project_id: data.projectId || null, // Send null instead of empty string
          owner_id: data.assigneeId || null,
          assignee_id: data.assigneeId || null,
          status: 'funnel',
          workflow_status: 'draft',
          health: 'green',
          progress_pct: 0,
          blocked: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newFeature;
    },
    onSuccess: (data) => {
      // Invalidate all feature-related queries including backlog
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['program'] }); // Invalidates feature-backlog queries
      queryClient.invalidateQueries({ queryKey: ['feature-backlog'] });
      
      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      
      toast.success('Feature created successfully', {
        description: `${data.display_id}: ${data.name}`,
      });
      
      onSuccess?.(data.id);
      handleClose();
    },
    onError: (error: any) => {
      toast.error('Failed to create feature', {
        description: error.message || 'An unexpected error occurred',
      });
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘+S or Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isValid && !createMutation.isPending) {
          createMutation.mutate(formData);
        }
      }
      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValid, createMutation.isPending, formData]);

  const handleClose = () => {
    setFormData(getInitialFormData(defaultEpicId, defaultProjectId));
    setAutoSaveStatus('idle');
    onClose();
  };

  const handleSubmit = () => {
    if (!isValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  // Get selected assignee for display
  const selectedAssignee = users.find(u => u.id === formData.assigneeId);

  // Word count for description
  const descriptionWordCount = useMemo(() => {
    const text = formData.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  }, [formData.description]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-[#171717]",
        "rounded-lg",
        "shadow-xl",
        "border-0",
        "[&>button]:hidden"
      )}>
        {/* Accent Bar - Catalyst brand gradient */}
        <div className="h-1 bg-gradient-to-r from-[#5c7c5c] via-[#c69c6d] to-[#d4b896] flex-shrink-0" />

        {/* Header with Progress Ring */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-[#171717]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing percent={completionPercent} />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Create feature
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Add a new feature to track delivery progress
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className={cn(
                "p-1.5 rounded-md",
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-colors"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Details Section */}
          <div>
            <SectionHeader icon={FileText} title="Details" />
            <div className="space-y-4">
              {/* Feature Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    Feature Name<span className="text-[#ef4444] ml-0.5">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formData.featureName.length} / 200
                  </span>
                </div>
                <Input
                  value={formData.featureName}
                  onChange={(e) => handleFieldChange('featureName', e.target.value)}
                  placeholder="Brief title of the feature"
                  maxLength={200}
                  className={cn(
                    "h-10 bg-background border-border",
                    "focus:border-[#c69c6d] focus:ring-[3px] focus:ring-[#c69c6d]/15",
                    "placeholder:text-muted-foreground/60"
                  )}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    Description<span className="text-[#ef4444] ml-0.5">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {descriptionWordCount} / 2000 words
                  </span>
                </div>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => handleFieldChange('description', value)}
                  placeholder="Describe the feature, its purpose, and key outcomes..."
                  minHeight="120px"
                  className="border-border focus-within:border-[#c69c6d] focus-within:ring-[3px] focus-within:ring-[#c69c6d]/15"
                />
              </div>
            </div>
          </div>

          {/* Hierarchy Section */}
          <div>
            <SectionHeader icon={Layers} title="Hierarchy" />
            <div className="grid grid-cols-2 gap-4">
              {/* Parent Epic */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Parent Epic<span className="text-[#ef4444] ml-0.5">*</span>
                </Label>
                <Select 
                  value={formData.parentEpicId} 
                  onValueChange={(value) => handleFieldChange('parentEpicId', value)}
                >
                  <SelectTrigger className={cn(
                    "h-10 bg-background border-border",
                    "focus:border-[#c69c6d] focus:ring-[3px] focus:ring-[#c69c6d]/15"
                  )}>
                    <SelectValue placeholder={epicsLoading ? "Loading..." : "Select an epic"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#262626] border-border z-[500] max-h-60">
                    {epics.map(epic => (
                      <SelectItem 
                        key={epic.id} 
                        value={epic.id}
                        className="cursor-pointer hover:bg-muted focus:bg-muted"
                      >
                        <span className="text-[#8b7355] dark:text-[#d4a855] font-mono text-xs mr-2">
                          {epic.epic_key}
                        </span>
                        <span className="truncate">{epic.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project (Auto-populated) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Project
                </Label>
                <div className={cn(
                  "h-10 px-3 flex items-center gap-2 rounded-md",
                  "bg-muted/50 border border-border",
                  "text-sm text-foreground"
                )}>
                  <FolderTree className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 truncate">
                    {formData.projectName || 'Auto-populated from epic'}
                  </span>
                  {formData.projectId && (
                    <span className={cn(
                      "px-1.5 py-0.5 text-[10px] font-medium rounded",
                      "bg-[#5c7c5c]/15 text-[#5c7c5c] dark:text-[#8aab8a]"
                    )}>
                      Auto
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div>
            <SectionHeader icon={User} title="Assignment" />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Assignee<span className="text-[#ef4444] ml-0.5">*</span>
              </Label>
              <Select 
                value={formData.assigneeId} 
                onValueChange={(value) => handleFieldChange('assigneeId', value)}
              >
                <SelectTrigger className={cn(
                  "h-10 bg-background border-border",
                  "focus:border-[#c69c6d] focus:ring-[3px] focus:ring-[#c69c6d]/15"
                )}>
                  <SelectValue placeholder={usersLoading ? "Loading..." : "Select assignee"}>
                    {selectedAssignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          {selectedAssignee.avatar_url && (
                            <AvatarImage src={selectedAssignee.avatar_url} />
                          )}
                          <AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a] text-white">
                            {getInitials(selectedAssignee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedAssignee.full_name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#262626] border-border z-[500] max-h-60">
                  {users.map(user => (
                    <SelectItem 
                      key={user.id} 
                      value={user.id}
                      className="cursor-pointer hover:bg-muted focus:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                          <AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a] text-white">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer with Keyboard Shortcuts */}
        <div className={cn(
          "flex items-center justify-between",
          "px-5 py-3",
          "bg-[#f5f5f5] dark:bg-[#262626]",
          "border-t border-gray-200 dark:border-gray-700",
          "flex-shrink-0"
        )}>
          <div className="flex items-center gap-4">
            <KeyboardShortcuts />
            <AutoSaveIndicator status={autoSaveStatus} />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md",
                "border-gray-200 dark:border-gray-600",
                "text-gray-700 dark:text-gray-300",
                "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isValid || createMutation.isPending}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                "text-white bg-[#2563eb] hover:bg-[#1d4ed8]",
                "rounded-md shadow-sm",
                "flex items-center gap-1.5",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Create Feature
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
