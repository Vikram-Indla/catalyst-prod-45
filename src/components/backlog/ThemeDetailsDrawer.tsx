/**
 * =====================================================
 * Theme Details Drawer - Unified with Canonical Shell
 * =====================================================
 * 
 * Uses the CanonicalDrawerShell for unified drawer structure.
 * Module-specific content: Theme details, objectives, children, links, milestones
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Copy, Lock, Unlock } from 'lucide-react';
import { CanonicalDrawerShell, DrawerTab, KebabMenuItem } from '@/components/shared/CanonicalDrawerShell';
import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { ThemeChildrenTab } from './tabs/ThemeChildrenTab';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  portfolio_ask_date?: string | null;
  color_tag?: string | null;
  owner_id?: string | null;
  snapshot_id?: string | null;
  created_at: string;
}

interface ThemeDetailsDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

// Generate short theme ID from UUID
function formatThemeKey(id: string): string {
  return `TH-${id.slice(0, 4)}`;
}

// Status enum to display label mapping
const STATUS_LABELS: Record<string, string> = {
  'proposed': 'Backlog / Not Started',
  'active': 'In Progress',
  'done': 'Completed',
  'cancelled': 'Cancelled',
};

// Reverse mapping for saving
const LABEL_TO_STATUS: Record<string, string> = {
  'backlog': 'proposed',
  'in-progress': 'active',
  'completed': 'done',
  'cancelled': 'cancelled',
};

// Theme Details Tab Component
function ThemeDetailsTab({ 
  theme, 
  formData, 
  onChange, 
  onDirty 
}: { 
  theme: Theme;
  formData: Partial<Theme>;
  onChange: (field: string, value: any) => void;
  onDirty: () => void;
}) {
  const [targetDateLocked, setTargetDateLocked] = useState(false);

  // Fetch active programs for multi-select
  const { data: programs } = useQuery({
    queryKey: ['active-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch imperative alignments (strategic initiatives)
  const { data: initiatives } = useQuery({
    queryKey: ['strategic-initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    onChange(field, value);
    onDirty();
  };

  const handleLockToggle = () => {
    if (targetDateLocked) {
      setTargetDateLocked(false);
      toast.info('Target Completion Date unlocked');
    } else {
      if (!formData.start_date) {
        toast.error('Cannot lock: Start Date must be populated first');
        return;
      }
      if (!formData.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      setTargetDateLocked(true);
      toast.success('Target Completion Date locked');
    }
  };

  return (
    <div className="p-4 md:p-5 pb-6 space-y-5 bg-muted/30">
      {/* DETAILS Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Details</h3>
        
        {/* Programs & State - 2 column */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Programs</Label>
            <Select 
              value={formData.snapshot_id || ''} 
              onValueChange={(v) => handleFieldChange('snapshot_id', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select programs..." />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">State</Label>
            <Select 
              value={formData.status || 'proposed'} 
              onValueChange={(v) => handleFieldChange('status', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="proposed">Backlog / Not Started</SelectItem>
                <SelectItem value="active">In Progress</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs font-medium">Description</Label>
          <div className="mt-1">
            <RichTextEditor
              value={formData.description || ''}
              onChange={(value) => handleFieldChange('description', value)}
              placeholder="Enter theme description..."
            />
          </div>
        </div>

        {/* Active - No red dot */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Active</Label>
            <Select defaultValue="yes">
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Strategic Initiative */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Strategic Initiative</Label>
          <Select>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select One" />
            </SelectTrigger>
            <SelectContent className="z-[400]">
              {initiatives?.map((init) => (
                <SelectItem key={init.id} value={init.id}>
                  {init.name}
                </SelectItem>
              )) || (
                <>
                  <SelectItem value="technical-debt">Technical Debt</SelectItem>
                  <SelectItem value="innovation">Innovation</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Imperative Alignment */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Imperative Alignment</Label>
          <Select>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select One" />
            </SelectTrigger>
            <SelectContent className="z-[400]">
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DATES Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Dates</h3>
        
        <div className="grid grid-cols-2 gap-3">

          {/* Start / Initiation */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Start / Initiation</Label>
            <CatalystDatePicker
              value={formData.start_date || null}
              onChange={(date) => handleFieldChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select date"
            />
          </div>

          {/* Target Completion with Lock/Reset */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Target Completion</Label>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <CatalystDatePicker
                  value={formData.end_date || null}
                  onChange={(date) => handleFieldChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select date"
                  disabled={targetDateLocked}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLockToggle}
                className={cn(
                  "shrink-0 h-9 w-9",
                  targetDateLocked && "bg-muted border-brand-gold text-brand-gold"
                )}
                title={targetDateLocked ? 'Unlock date' : 'Lock date'}
              >
                {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* DISPLAY OPTIONS Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Display Options</h3>
        
        {/* Major Theme */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Major Theme</Label>
          <Switch 
            checked={formData.color_tag ? true : false}
            onCheckedChange={(checked) => {
              handleFieldChange('color_tag', checked ? '#0000FF' : null);
            }}
          />
        </div>

        {/* Report Color */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Report Color</Label>
          <input
            type="color"
            value={formData.color_tag || '#0000FF'}
            onChange={(e) => handleFieldChange('color_tag', e.target.value)}
            className="h-8 w-20 rounded border cursor-pointer"
          />
        </div>
      </div>

      {/* ATTACHMENTS Section */}
      <div className="border border-border rounded-xl bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">Attachments</h3>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Plus className="h-6 w-6" />
            <p className="text-sm">Drop files or click here to upload</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Theme Objectives Tab Component
function ThemeObjectivesTab({ themeId }: { themeId: string }) {
  const { data: objectives, isLoading } = useQuery({
    queryKey: ['theme-objectives', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, status, overall_progress, owner_id')
        .eq('theme_id', themeId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!themeId,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-5 pb-6">
        <div className="text-center py-8 text-muted-foreground">Loading objectives...</div>
      </div>
    );
  }

  if (!objectives || objectives.length === 0) {
    return (
      <div className="p-4 md:p-5 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Linked Objectives</h3>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Link Objective
          </Button>
        </div>
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">No objectives linked to this theme</p>
          <p className="text-xs mt-1">Click "Link Objective" to connect one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked Objectives ({objectives.length})</h3>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Link Objective
        </Button>
      </div>
      <div className="space-y-2">
        {objectives.map((objective) => (
          <Card key={objective.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">{objective.name}</h4>
                  {objective.status && (
                    <Badge variant="outline" className="text-xs">
                      {objective.status}
                    </Badge>
                  )}
                </div>
                {objective.overall_progress !== null && (
                  <span className="text-sm text-muted-foreground">
                    {Math.round((objective.overall_progress || 0) * 100)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Theme Milestones Tab Component
function ThemeMilestonesTab({ themeId }: { themeId: string }) {
  return (
    <div className="p-4 md:p-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Theme Milestones</h3>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Milestone
        </Button>
      </div>
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p className="text-sm">No milestones defined for this theme</p>
        <p className="text-xs mt-1">Click "Add Milestone" to create one</p>
      </div>
    </div>
  );
}

export function ThemeDetailsDrawer({ theme, isOpen, onClose }: ThemeDetailsDrawerProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<Theme>>({});
  const queryClient = useQueryClient();

  // Reset form data when theme changes
  useEffect(() => {
    if (theme) {
      setFormData({
        name: theme.name,
        description: theme.description,
        status: theme.status,
        start_date: theme.start_date,
        end_date: theme.end_date,
        color_tag: theme.color_tag,
        owner_id: theme.owner_id,
        snapshot_id: theme.snapshot_id,
      });
      setHasChanges(false);
    }
  }, [theme]);

  if (!theme) return null;

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Theme>) => {
      const updatePayload: Record<string, any> = {
        name: data.name,
        description: data.description,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        portfolio_ask_date: data.portfolio_ask_date || null,
        color_tag: data.color_tag || null,
        owner_id: data.owner_id || null,
      };
      // Only include snapshot_id if it's a valid UUID, otherwise set to null
      if (data.snapshot_id && data.snapshot_id.length === 36) {
        updatePayload.snapshot_id = data.snapshot_id;
      }
      // Cast status to proper enum type if provided
      if (data.status) {
        updatePayload.status = data.status as 'proposed' | 'active' | 'done' | 'cancelled';
      }
      const { error } = await supabase
        .from('strategic_themes')
        .update(updatePayload)
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      queryClient.invalidateQueries({ queryKey: ['theme-roadmap'] });
      toast.success('Theme saved successfully');
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error('Failed to save theme: ' + error.message);
    },
  });

  // Save name mutation
  const saveNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from('strategic_themes')
        .update({ name: newName })
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme name updated');
    },
    onError: () => {
      toast.error('Failed to update theme name');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('strategic_themes')
        .delete()
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme deleted');
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete theme');
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .insert({
          name: `${theme.name} (Copy)`,
          description: theme.description,
          status: 'proposed' as const,
          start_date: theme.start_date,
          end_date: theme.end_date,
          color_tag: theme.color_tag,
          owner_id: theme.owner_id,
          snapshot_id: theme.snapshot_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme duplicated');
    },
    onError: () => {
      toast.error('Failed to duplicate theme');
    }
  });

  const handleTitleChange = (newName: string) => {
    setFormData(prev => ({ ...prev, name: newName }));
    saveNameMutation.mutate(newName);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleSaveAndClose = () => {
    saveMutation.mutate(formData, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  // Build kebab menu items
  const kebabMenuItems: KebabMenuItem[] = [
    {
      label: 'Duplicate Theme',
      icon: <Copy className="h-4 w-4 mr-2" />,
      onClick: () => duplicateMutation.mutate(),
    },
    {
      label: 'Delete Theme',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      onClick: () => deleteMutation.mutate(),
      variant: 'destructive',
      separator: true,
    },
  ];

  // Build tabs - Updated order: Details, Objectives, Children, Links, Milestones, Audit History
  const tabs: DrawerTab[] = [
    {
      value: 'details',
      label: 'Details',
      content: (
        <ThemeDetailsTab 
          theme={theme} 
          formData={formData}
          onChange={handleFieldChange}
          onDirty={() => setHasChanges(true)}
        />
      ),
    },
    {
      value: 'objectives',
      label: 'Objectives',
      content: <ThemeObjectivesTab themeId={theme.id} />,
    },
    {
      value: 'children',
      label: 'Children',
      content: (
        <div className="p-4 md:p-5 pb-6">
          <ThemeChildrenTab themeId={theme.id} />
        </div>
      ),
    },
    {
      value: 'links',
      label: 'Links',
      content: <UnifiedLinksTab entityType="theme" entityId={theme.id} />,
    },
    {
      value: 'milestones',
      label: 'Milestones',
      content: <ThemeMilestonesTab themeId={theme.id} />,
    },
    {
      value: 'audit-history',
      label: 'Audit History',
      content: (
        <div className="h-[500px]">
          <UnifiedAuditHistoryTab entityType="theme" entityId={theme.id} />
        </div>
      ),
    },
  ];

  return (
    <CanonicalDrawerShell
      open={isOpen}
      onClose={onClose}
      entityId={theme.id}
      entityKey={formatThemeKey(theme.id)}
      entityTitle={formData.name || theme.name}
      entityType="backlog/themes"
      onTitleChange={handleTitleChange}
      isTitleEditable={true}
      onSave={handleSave}
      onSaveAndClose={handleSaveAndClose}
      hasChanges={hasChanges}
      isSaving={saveMutation.isPending}
      tabs={tabs}
      defaultTab="details"
      kebabMenuItems={kebabMenuItems}
      description="Theme details panel"
    />
  );
}
