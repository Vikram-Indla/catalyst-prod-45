/**
 * FeatureDetailsPanel — Slim Framework (4 Tabs Only)
 * 
 * Allowed tabs:
 * 1. Overview — name, description, status, owner, health, blocked, dates
 * 2. Stories — list child stories, derived progress
 * 3. Dependencies — if wired (kept minimal)
 * 4. Activity — comments/discussions
 * 
 * All SAFe/WSJF/Financial/PI tabs are HIDDEN.
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, AlertCircle } from 'lucide-react';
import { WorkItemPresence } from '@/components/work-items/WorkItemPresence';
import { WorkItemWatchers } from '@/components/work-items/WorkItemWatchers';
import { FeatureOverviewTab } from './tabs/FeatureOverviewTab';
import { FeatureStoriesTab } from './tabs/FeatureStoriesTab';
import { FeatureDependenciesTab } from './tabs/FeatureDependenciesTab';
import { Badge } from '@/components/ui/badge';
import { useFeatureProgress } from '@/hooks/useFeatureProgress';

import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Feature, FeatureStatus } from '@/types/feature.types';

interface FeatureDetailsPanelProps {
  feature?: Feature;
  open: boolean;
  onClose: () => void;
}

// Slim form data — only active fields
interface FeatureFormData {
  name: string;
  description: string;
  status: FeatureStatus;
  health: 'green' | 'yellow' | 'red';
  blocked: boolean;
  blocked_reason: string;
  planned_start_date: string;
  planned_end_date: string;
}

export function FeatureDetailsPanel({ feature, open, onClose }: FeatureDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  
  // Story-driven progress
  const { data: progress } = useFeatureProgress(feature?.id);
  
  // Form state — slim fields only
  const [formData, setFormData] = useState<FeatureFormData>({
    name: '',
    description: '',
    status: 'funnel',
    health: 'green',
    blocked: false,
    blocked_reason: '',
    planned_start_date: '',
    planned_end_date: '',
  });

  // Initialize form data when feature changes
  useEffect(() => {
    if (feature) {
      setFormData({
        name: feature.name || '',
        description: feature.description || '',
        status: (feature.status as FeatureStatus) || 'funnel',
        health: (feature.health as 'green' | 'yellow' | 'red') || 'green',
        blocked: feature.blocked || false,
        blocked_reason: feature.blocked_reason || '',
        planned_start_date: feature.planned_start_date || '',
        planned_end_date: feature.planned_end_date || '',
      });
    }
  }, [feature]);

  // Update form field
  const updateField = <K extends keyof FeatureFormData>(field: K, value: FeatureFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save mutation — slim fields only
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!feature?.id) throw new Error('No feature ID');
      
      const { error } = await supabase
        .from('features')
        .update({
          name: formData.name,
          description: formData.description || null,
          status: formData.status as any,
          health: formData.health as any,
          blocked: formData.blocked,
          blocked_reason: formData.blocked ? formData.blocked_reason : null,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
        } as any)
        .eq('id', feature.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['features-backlog'] });
      toast.success('Feature saved');
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save feature');
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleSaveAndClose = () => {
    saveMutation.mutate(undefined, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'delete':
        toast.info('Move feature to recycle bin');
        break;
      case 'copy':
        toast.info('Copy feature');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="executive-drawer w-full sm:w-[600px] md:w-[700px] lg:w-[800px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="executive-drawer-header flex-shrink-0 bg-white px-3 md:px-4 py-2 border-b border-neutral-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="min-w-0">
                <h2 className="executive-drawer-title truncate">
                  {feature ? formData.name || feature.name : 'New Feature'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {feature?.display_id && (
                    <span className="executive-drawer-subtitle font-mono">
                      {feature.display_id}
                    </span>
                  )}
                  {formData.blocked && (
                    <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Blocked
                    </Badge>
                  )}
                  {progress && progress.totalStories > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {progress.completionPercent}% ({progress.completedStories}/{progress.totalStories})
                    </Badge>
                  )}
                </div>
              </div>
              {feature?.id && <WorkItemPresence workItemType="features" workItemId={feature.id} />}
              {feature?.id && <WorkItemWatchers workItemType="feature" workItemId={feature.id} />}
            </div>
            <div className="flex items-center flex-shrink-0 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveAndClose}
                disabled={saveMutation.isPending}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                Save & Close
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100]">
                  <DropdownMenuItem onClick={() => handleAction('copy')}>
                    Copy Feature
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleAction('delete')}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs — HARD LIMIT: 4 Tabs Only */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="executive-drawer-tabs overflow-x-auto flex-shrink-0">
            <TabsList className="inline-flex bg-transparent w-auto min-w-full justify-start flex-nowrap" style={{ height: 'var(--toolbar-h)' }}>
              <TabsTrigger value="overview" className="executive-drawer-tab">
                Overview
              </TabsTrigger>
              <TabsTrigger value="stories" className="executive-drawer-tab">
                Stories
                {progress && progress.totalStories > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                    {progress.totalStories}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dependencies" className="executive-drawer-tab">
                Dependencies
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="executive-drawer-content flex-1 overflow-y-auto">
            <TabsContent value="overview" className="mt-0 p-4 sm:p-6">
              <FeatureOverviewTab 
                feature={feature} 
                formData={formData}
                updateField={updateField}
                progress={progress}
              />
            </TabsContent>

            <TabsContent value="stories" className="mt-0 p-4 sm:p-6">
              <FeatureStoriesTab feature={feature} progress={progress} />
            </TabsContent>

            <TabsContent value="dependencies" className="mt-0 p-4 sm:p-6">
              <FeatureDependenciesTab feature={feature} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
