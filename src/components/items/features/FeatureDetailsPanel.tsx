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
import { MoreVertical } from 'lucide-react';
import { FeatureDetailsTab } from './tabs/FeatureDetailsTab';
import { FeaturePlanningTab } from './tabs/FeaturePlanningTab';
import { FeatureFinancialsTab } from './tabs/FeatureFinancialsTab';
import { FeatureForecastTab } from './tabs/FeatureForecastTab';
import { FeatureWSJFTab } from './tabs/FeatureWSJFTab';
import { FeatureTraceTab } from './tabs/FeatureTraceTab';
import { FeatureAttachmentsTab } from './tabs/FeatureAttachmentsTab';
import { FeatureDiscussionsTab } from './tabs/FeatureDiscussionsTab';
import { FeatureLinksTab } from './tabs/FeatureLinksTab';
import { FeatureAuditTab } from './tabs/FeatureAuditTab';
import { FeatureAdditionalOptionsTab } from './tabs/FeatureAdditionalOptionsTab';
import { FeatureChildrenTab } from './tabs/FeatureChildrenTab';
import { AIOTestsSection } from '@/components/test-management/AIOTestsSection';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Feature } from '@/types/feature.types';

interface FeatureDetailsPanelProps {
  feature?: Feature;
  open: boolean;
  onClose: () => void;
}

// Extended feature data for form state
interface FeatureFormData {
  name: string;
  description: string;
  status: string;
  health: string;
  blocked: boolean;
  blocked_reason: string;
  mmf: boolean;
  acceptance_criteria: string;
  notes: string;
  estimate_points: number;
  estimation_method: string;
  budget: number;
  work_code: string;
  capitalized: boolean;
  expected_revenue_growth: number;
  expected_cost_savings: number;
}

export function FeatureDetailsPanel({ feature, open, onClose }: FeatureDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const queryClient = useQueryClient();
  
  // Form state lifted to parent for save functionality
  const [formData, setFormData] = useState<FeatureFormData>({
    name: '',
    description: '',
    status: 'funnel',
    health: 'green',
    blocked: false,
    blocked_reason: '',
    mmf: false,
    acceptance_criteria: '',
    notes: '',
    estimate_points: 0,
    estimation_method: 'points',
    budget: 0,
    work_code: '',
    capitalized: false,
    expected_revenue_growth: 0,
    expected_cost_savings: 0,
  });

  // Initialize form data when feature changes
  useEffect(() => {
    if (feature) {
      setFormData({
        name: feature.name || '',
        description: feature.description || '',
        status: feature.status || 'funnel',
        health: feature.health || 'green',
        blocked: feature.blocked || false,
        blocked_reason: feature.blocked_reason || '',
        mmf: (feature as any).mmf || false,
        acceptance_criteria: feature.acceptance_criteria || '',
        notes: feature.notes || '',
        estimate_points: feature.estimate_points || 0,
        estimation_method: (feature as any).estimation_method || 'points',
        budget: (feature as any).budget || 0,
        work_code: (feature as any).work_code || '',
        capitalized: (feature as any).capitalized || false,
        expected_revenue_growth: (feature as any).expected_revenue_growth || 0,
        expected_cost_savings: (feature as any).expected_cost_savings || 0,
      });
    }
  }, [feature]);

  // Update form field
  const updateField = (field: keyof FeatureFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save mutation
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
          acceptance_criteria: formData.acceptance_criteria || null,
          notes: formData.notes || null,
          estimate_points: formData.estimate_points,
          estimation_method: formData.estimation_method,
          budget: formData.budget,
          work_code: formData.work_code || null,
          capitalized: formData.capitalized,
          expected_revenue_growth: formData.expected_revenue_growth,
          expected_cost_savings: formData.expected_cost_savings,
        } as any)
        .eq('id', feature.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['features-backlog'] });
      toast.success('Feature saved successfully');
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

  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'drop':
        toast.info('Drop feature to backlog');
        break;
      case 'split':
        toast.info('Opening Split Feature dialog');
        break;
      case 'delete':
        toast.info('Move feature to recycle bin');
        break;
      case 'cancel':
        toast.info('Cancel feature and move to canceled items');
        break;
      case 'copy':
        toast.info('Opening Copy Feature dialog');
        break;
      case 'add-to-kanban':
        toast.info('Opening Add to Kanban Board dialog');
        break;
      case 'trace':
        window.open(`/items/features/${feature?.id}/trace`, '_blank');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="executive-drawer w-full sm:w-[600px] md:w-[700px] lg:w-[900px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden">
        <div className="executive-drawer-header flex-shrink-0">
          <div className="flex items-start justify-between gap-[var(--s2)] sm:gap-[var(--s4)]">
            <div className="flex-1 min-w-0">
              <h2 className="executive-drawer-title truncate">
                {feature ? `Feature: ${formData.name || feature.name}` : 'New Feature'}
              </h2>
              {feature?.display_id && (
                <div className="executive-drawer-subtitle font-mono mt-1">
                  {feature.display_id}
                </div>
              )}
            </div>
            <div className="flex items-center flex-shrink-0 gap-[var(--s2)]">
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
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                Save & Close
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#1a1a1a] hover:bg-[rgba(198,156,109,0.08)]">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100]">
                  <DropdownMenuItem onClick={() => handleAdditionalOption('copy')}>
                    Copy Feature
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAdditionalOption('split')}>
                    Split Feature
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAdditionalOption('trace')}>
                    Trace Feature
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAdditionalOption('drop')}>
                    Drop to Backlog
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleAdditionalOption('cancel')}
                    className="text-warning"
                  >
                    Cancel Item
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleAdditionalOption('delete')}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="executive-drawer-tabs overflow-x-auto flex-shrink-0">
            <TabsList className="inline-flex bg-transparent w-auto min-w-full justify-start flex-nowrap" style={{ height: 'var(--toolbar-h)' }}>
              <TabsTrigger value="details" className="executive-drawer-tab">
                Details
              </TabsTrigger>
              <TabsTrigger value="children" className="executive-drawer-tab">
                Children
              </TabsTrigger>
              <TabsTrigger value="planning" className="executive-drawer-tab">
                Planning
              </TabsTrigger>
              <TabsTrigger value="financials" className="executive-drawer-tab">
                Financials
              </TabsTrigger>
              <TabsTrigger value="forecast" className="executive-drawer-tab">
                Forecast
              </TabsTrigger>
              <TabsTrigger value="wsjf" className="executive-drawer-tab">
                WSJF
              </TabsTrigger>
              <TabsTrigger value="trace" className="executive-drawer-tab">
                Trace
              </TabsTrigger>
              <TabsTrigger value="attachments" className="executive-drawer-tab">
                Attachments
              </TabsTrigger>
              <TabsTrigger value="discussions" className="executive-drawer-tab">
                Discussions
              </TabsTrigger>
              <TabsTrigger value="links" className="executive-drawer-tab">
                Links
              </TabsTrigger>
              <TabsTrigger value="audit" className="executive-drawer-tab">
                Audit
              </TabsTrigger>
              <TabsTrigger value="tests" className="executive-drawer-tab">
                Tests
              </TabsTrigger>
              <TabsTrigger value="options" className="executive-drawer-tab">
                Options
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="executive-drawer-content flex-1 overflow-y-auto">
            <TabsContent value="details" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureDetailsTab 
                feature={feature} 
                formData={formData}
                updateField={updateField}
              />
            </TabsContent>

            <TabsContent value="children" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureChildrenTab feature={feature} />
            </TabsContent>

            <TabsContent value="planning" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeaturePlanningTab feature={feature} />
            </TabsContent>

            <TabsContent value="financials" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureFinancialsTab 
                feature={feature}
                formData={formData}
                updateField={updateField}
              />
            </TabsContent>

            <TabsContent value="forecast" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureForecastTab feature={feature} />
            </TabsContent>

            <TabsContent value="wsjf" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureWSJFTab feature={feature} />
            </TabsContent>

            <TabsContent value="trace" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureTraceTab feature={feature} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureAttachmentsTab featureId={feature?.id} />
            </TabsContent>

            <TabsContent value="discussions" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureDiscussionsTab featureId={feature?.id} />
            </TabsContent>

            <TabsContent value="links" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureLinksTab feature={feature} />
            </TabsContent>

            <TabsContent value="audit" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureAuditTab featureId={feature?.id} />
            </TabsContent>

            <TabsContent value="tests" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              {feature && (
                <AIOTestsSection
                  workItemId={feature.id}
                  workItemType="feature"
                  workItemTitle={feature.name}
                  workItemDescription={feature.description || undefined}
                />
              )}
            </TabsContent>

            <TabsContent value="options" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
              <FeatureAdditionalOptionsTab 
                feature={feature}
                onAction={handleAdditionalOption}
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}