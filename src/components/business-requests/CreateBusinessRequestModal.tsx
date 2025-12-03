import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save } from 'lucide-react';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest } from '@/types/business-request';
import { OverviewTab } from './drawer-tabs/OverviewTab';
import { PortfolioTab } from './drawer-tabs/PortfolioTab';
import { TechnicalTab } from './drawer-tabs/TechnicalTab';
import { EstimationTab } from './drawer-tabs/EstimationTab';
import { ApprovalTab } from './drawer-tabs/ApprovalTab';
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

// Tabs for creating a new request (without Process Step, Health, Readiness, Implementation, Support, On Hold)
const CREATE_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'technical', label: 'Technical' },
  { value: 'estimation', label: 'Estimation' },
  { value: 'approval', label: 'Approval' },
];

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const [formData, setFormData] = useState<Partial<BusinessRequest>>(initialFormData);
  const [activeTab, setActiveTab] = useState('overview');

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
    setActiveTab('overview');
    onClose();
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setActiveTab('overview');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 flex flex-col bg-[#feffff] overflow-hidden">
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

        {/* Title Input */}
        <div className="px-6 py-4 border-b border-[#e5e5e5] flex-shrink-0">
          <Label className="text-sm font-medium text-[#1a1a1a] mb-2 block">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            value={formData.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter request title (min 5 characters)"
            className="border-[#e5e5e5] focus:border-brand-gold"
          />
        </div>

        {/* Tabs with horizontal scroll - matching view request style */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b h-auto shrink-0 overflow-x-auto flex-nowrap bg-[#feffff] px-6">
            {CREATE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="executive-tab whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto executive-drawer-content">
            <TabsContent value="overview" className="m-0 focus-visible:outline-none">
              <OverviewTab data={formData} isEditMode={true} onChange={handleFieldChange} hideProcessStepHealth={true} />
            </TabsContent>
            <TabsContent value="portfolio" className="m-0 focus-visible:outline-none">
              <PortfolioTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="technical" className="m-0 focus-visible:outline-none">
              <TechnicalTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="estimation" className="m-0 focus-visible:outline-none">
              <EstimationTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="approval" className="m-0 focus-visible:outline-none">
              <ApprovalTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#e5e5e5] flex justify-end gap-3 flex-shrink-0 bg-[#feffff]">
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
