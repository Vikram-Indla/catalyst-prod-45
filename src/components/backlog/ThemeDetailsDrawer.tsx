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
import { Trash2, Copy } from 'lucide-react';
import { CanonicalDrawerShell, DrawerTab, KebabMenuItem } from '@/components/shared/CanonicalDrawerShell';
import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { ThemeChildrenTab } from './tabs/ThemeChildrenTab';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

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

// Strategic theme states - maps DB values to strategic labels
const THEME_STATES: Record<string, string> = {
  'proposed': 'Draft',
  'active': 'Active',
  'done': 'Retired',
  'cancelled': 'Cancelled',
};

// Theme Details Tab Component - Simplified to strategic essentials only
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
  // Fetch snapshot name for read-only display
  const { data: snapshot } = useQuery({
    queryKey: ['snapshot-name', theme.snapshot_id],
    queryFn: async () => {
      if (!theme.snapshot_id) return null;
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('id, name')
        .eq('id', theme.snapshot_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!theme.snapshot_id,
  });

  const handleFieldChange = (field: string, value: any) => {
    onChange(field, value);
    onDirty();
  };

  return (
    <div className="p-4 md:p-5 pb-6 space-y-5 bg-muted/30">
      {/* STRATEGIC CONTEXT Section */}
      <div className="border border-border rounded-xl bg-white dark:bg-surface-2 p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Strategic Context</h3>
        
        {/* Strategic Snapshot (read-only) & State */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Strategic Snapshot</Label>
            <div className="h-9 px-3 flex items-center bg-muted/50 border border-border rounded-md text-sm">
              {snapshot?.name || 'No snapshot assigned'}
            </div>
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
                {Object.entries(THEME_STATES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs font-medium">Description</Label>
          <p className="text-xs text-muted-foreground mb-2">Strategic intent and purpose of this theme</p>
          <div className="mt-1">
            <RichTextEditor
              value={formData.description || ''}
              onChange={(value) => handleFieldChange('description', value)}
              placeholder="Describe the strategic intent of this theme..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Theme Discussions Tab Component
function ThemeDiscussionsTab({ themeId }: { themeId: string }) {
  return (
    <div className="p-4 md:p-5 pb-6">
      <CommentsSection entityType="strategic_themes" entityId={themeId} />
    </div>
  );
}

// Theme Objectives Tab Component
function ThemeObjectivesTab({ themeId }: { themeId: string }) {
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

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

  // Fetch all objectives that are NOT linked to this theme (for linking)
  const { data: availableObjectives } = useQuery({
    queryKey: ['available-objectives-for-theme', themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name')
        .is('theme_id', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: showLinkDialog,
  });

  const linkObjectiveMutation = useMutation({
    mutationFn: async (objectiveId: string) => {
      const { error } = await supabase
        .from('objectives')
        .update({ theme_id: themeId })
        .eq('id', objectiveId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-objectives', themeId] });
      queryClient.invalidateQueries({ queryKey: ['available-objectives-for-theme', themeId] });
      toast.success('Objective linked to theme');
      setShowLinkDialog(false);
    },
    onError: () => {
      toast.error('Failed to link objective');
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-5 pb-6">
        <div className="text-center py-8 text-muted-foreground">Loading objectives...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked Objectives {objectives && objectives.length > 0 ? `(${objectives.length})` : ''}</h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowLinkDialog(true)}>
          <Plus className="h-4 w-4" />
          Link Objective
        </Button>
      </div>
      
      {(!objectives || objectives.length === 0) ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">No objectives linked to this theme</p>
          <p className="text-xs mt-1">Click "Link Objective" to connect one</p>
        </div>
      ) : (
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
      )}

      {/* Link Objective Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Link Objective to Theme</h3>
            {availableObjectives && availableObjectives.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableObjectives.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => linkObjectiveMutation.mutate(obj.id)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    {obj.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No unlinked objectives available</p>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
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

  // Save mutation - must be called unconditionally (before early return)
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Theme>) => {
      if (!theme) throw new Error('No theme selected');
      const updatePayload: Record<string, any> = {
        name: data.name,
        description: data.description,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        portfolio_ask_date: data.portfolio_ask_date || null,
        color_tag: data.color_tag || null,
        owner_id: data.owner_id || null,
      };
      if (data.snapshot_id && data.snapshot_id.length === 36) {
        updatePayload.snapshot_id = data.snapshot_id;
      }
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
      if (!theme) throw new Error('No theme selected');
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
      if (!theme) throw new Error('No theme selected');
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
      if (!theme) throw new Error('No theme selected');
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

  // Early return AFTER all hooks are defined (React rules of hooks)
  if (!theme) return null;

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      value: 'discussions',
      label: 'Discussions',
      content: <ThemeDiscussionsTab themeId={theme.id} />,
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
