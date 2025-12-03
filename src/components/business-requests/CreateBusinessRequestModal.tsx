import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Save } from 'lucide-react';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { toast } from 'sonner';
import { DemandDetailsTab } from './create-tabs/DemandDetailsTab';
import { EntityServicesTab } from './create-tabs/EntityServicesTab';
import { BusinessScoreTab } from './create-tabs/BusinessScoreTab';

interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData: Record<string, any> = {
  title: '',
  description: '',
  platform: '',
  track: '',
  delivery_track_parent: '',
  requestor: '',
  start_date: null,
  impl_start_date: null,
  end_date: null,
  // Entity Services
  efs_domain: '',
  efs_service: '',
  efs_track_type: '',
  ecs_registry: '',
  is_saudi: '',
  is_non_saudi: '',
  // Business Score
  executive_urgency: 5,
  business_value: 5,
  complexity_score: 5,
  // Internal defaults
  process_step: 'new_demand',
  health: 'green',
};

const CREATE_TABS = [
  { value: 'demand-details', label: 'Demand Details' },
  { value: 'entity-services', label: 'Entity & Individual Services' },
  { value: 'business-score', label: 'Business Score' },
];

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const [formData, setFormData] = useState<Record<string, any>>(initialFormData);
  const [activeTab, setActiveTab] = useState('demand-details');

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.title || formData.title.length < 5) {
      toast.error('Summary is required and must be at least 5 characters');
      return;
    }
    if (!formData.platform) {
      toast.error('Delivery Platform is required');
      return;
    }

    // Map form data to API format
    const requestData = {
      title: formData.title,
      description: formData.description,
      platform: formData.platform,
      track: formData.track,
      requestor: formData.requestor,
      start_date: formData.start_date,
      end_date: formData.end_date,
      impl_start_date: formData.impl_start_date,
      complexity: formData.complexity_score <= 3 ? 'Low' : formData.complexity_score <= 6 ? 'Medium' : 'High',
      urgency: formData.executive_urgency <= 3 ? 'Low' : formData.executive_urgency <= 6 ? 'Normal' : formData.executive_urgency <= 8 ? 'High' : 'Critical',
    };

    await createMutation.mutateAsync(requestData as any);
    setFormData(initialFormData);
    setActiveTab('demand-details');
    onClose();
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setActiveTab('demand-details');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] p-0 flex flex-col bg-[#feffff] overflow-hidden">
        {/* Gold Bar */}
        <div className="h-1 bg-brand-gold flex-shrink-0" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e5e5e5] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-semibold text-[#1a1a1a]">
                Create Demand Intake
              </h2>
              <p className="text-sm text-[#6b7280] mt-1">
                Submit a new demand request for review and prioritization
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="flex-shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs with horizontal scroll */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-[#e5e5e5] flex-shrink-0">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex h-auto p-0 bg-transparent gap-0 min-w-full px-6">
                {CREATE_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative px-4 py-3 text-sm font-medium text-[#6b6b6b] whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-brand-gold data-[state=active]:text-[#1a1a1a] data-[state=active]:bg-transparent hover:text-[#1a1a1a] hover:bg-[rgba(198,156,109,0.08)] transition-all"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
            <TabsContent value="demand-details" className="m-0 focus-visible:outline-none">
              <DemandDetailsTab data={formData} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="entity-services" className="m-0 focus-visible:outline-none">
              <EntityServicesTab data={formData} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="business-score" className="m-0 focus-visible:outline-none">
              <BusinessScoreTab data={formData} onChange={handleFieldChange} />
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
