import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest, PROCESS_STEPS, HEALTH_OPTIONS } from '@/types/business-request';
import { OverviewTab } from './drawer-tabs/OverviewTab';
import { PortfolioTab } from './drawer-tabs/PortfolioTab';
import { TechnicalTab } from './drawer-tabs/TechnicalTab';
import { EstimationTab } from './drawer-tabs/EstimationTab';
import { ApprovalTab } from './drawer-tabs/ApprovalTab';
import { ReadinessTab } from './drawer-tabs/ReadinessTab';
import { ImplementationTab } from './drawer-tabs/ImplementationTab';
import { SupportTab } from './drawer-tabs/SupportTab';
import { OnHoldTab } from './drawer-tabs/OnHoldTab';
import { toast } from 'sonner';

interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData: Partial<BusinessRequest> = {
  title: '',
  description: '',
  platform: '',
  complexity: '',
  urgency: '',
  track: '',
  requestor: '',
  business_justification: '',
  process_step: 'new_demand',
  health: 'green',
};

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const [formData, setFormData] = useState<Partial<BusinessRequest>>(initialFormData);

  const handleFieldChange = (field: keyof BusinessRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.title || formData.title.length < 5) {
      toast.error('Title is required and must be at least 5 characters');
      return;
    }
    if (!formData.platform) {
      toast.error('Platform is required');
      return;
    }
    if (!formData.complexity) {
      toast.error('Complexity is required');
      return;
    }
    if (!formData.urgency) {
      toast.error('Urgency is required');
      return;
    }

    await createMutation.mutateAsync(formData as any);
    setFormData(initialFormData);
    onClose();
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  const getProcessStepStyle = (step: string) => {
    const found = PROCESS_STEPS.find(s => s.value === step);
    return found?.color || 'bg-gray-100 text-gray-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] p-0 flex flex-col bg-[#feffff] overflow-hidden">
        {/* Gold Bar */}
        <div className="h-1 bg-brand-gold flex-shrink-0" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e5e5e5] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-semibold text-[#1a1a1a]">
                Create Business Request
              </h2>
              <p className="text-sm text-[#6b7280] mt-1">
                Submit a new business request for review
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="flex-shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-[#e5e5e5] px-6 flex-shrink-0 overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 gap-0 flex-wrap">
              {['Overview', 'Portfolio', 'Technical', 'Estimation', 'Approval', 'Readiness', 'Implementation', 'Support', 'On Hold'].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase().replace(' ', '-')}
                  className="px-4 py-3 text-sm text-[#6b7280] border-b-2 border-transparent rounded-none data-[state=active]:text-[#1a1a1a] data-[state=active]:font-medium data-[state=active]:border-brand-gold data-[state=active]:bg-transparent hover:text-[#1a1a1a]"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Global Fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Process Step */}
                <div>
                  <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Process Step</label>
                  <Select
                    value={formData.process_step || 'new_demand'}
                    onValueChange={(value) => handleFieldChange('process_step', value)}
                  >
                    <SelectTrigger className="border-[#e5e5e5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESS_STEPS.map((step) => (
                        <SelectItem key={step.value} value={step.value}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${step.color}`}>
                            {step.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Health */}
                <div>
                  <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Health</label>
                  <Select
                    value={formData.health || 'green'}
                    onValueChange={(value) => handleFieldChange('health', value)}
                  >
                    <SelectTrigger className="border-[#e5e5e5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tab Contents */}
              <TabsContent value="overview" className="m-0 mt-4">
                <OverviewTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="portfolio" className="m-0 mt-4">
                <PortfolioTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="technical" className="m-0 mt-4">
                <TechnicalTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="estimation" className="m-0 mt-4">
                <EstimationTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="approval" className="m-0 mt-4">
                <ApprovalTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="readiness" className="m-0 mt-4">
                <ReadinessTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="implementation" className="m-0 mt-4">
                <ImplementationTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="support" className="m-0 mt-4">
                <SupportTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="on-hold" className="m-0 mt-4">
                <OnHoldTab data={formData} isEditMode={true} onChange={handleFieldChange} />
              </TabsContent>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#e5e5e5] flex justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={handleClose} className="border-[#e5e5e5]">
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Saving...' : 'Save Request'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
