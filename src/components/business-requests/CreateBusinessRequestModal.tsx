import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { toast } from 'sonner';
import { DemandDetailsTab } from './create-tabs/DemandDetailsTab';

interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData: Record<string, any> = {
  title: '',
  description: '',
  platform: '',
  requestor: '',
  department: '',
  business_owner: '',
  start_date: null,
  impl_start_date: null,
  end_date: null,
  attachments: [],
  // Entity Services
  efs_domain: '',
  efs_service: '',
  efs_track_type: '',
  ecs_registry: '',
  is_saudi: '',
  is_non_saudi: '',
  // Internal defaults
  process_step: 'new_demand',
  health: 'green',
};

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const [formData, setFormData] = useState<Record<string, any>>(initialFormData);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.title || formData.title.length < 5) {
      toast.error('Summary is required and must be at least 5 characters');
      return;
    }

    // Map form data to API format
    const requestData = {
      title: formData.title,
      description: formData.description,
      platform: formData.platform,
      requestor: formData.requestor,
      start_date: formData.start_date,
      end_date: formData.end_date,
      impl_start_date: formData.impl_start_date,
    };

    await createMutation.mutateAsync(requestData as any);
    setFormData(initialFormData);
    onClose();
  };

  const handleClose = () => {
    setFormData(initialFormData);
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8f8f8]">
          <DemandDetailsTab data={formData} onChange={handleFieldChange} />
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
      </DialogContent>
    </Dialog>
  );
}
