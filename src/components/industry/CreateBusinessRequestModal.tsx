import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save, CheckCircle } from 'lucide-react';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { toast } from 'sonner';
import { DemandDetailsTab } from './create-tabs/DemandDetailsTab';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getInitialFormData = (): Record<string, any> => ({
  title: '',
  description: '',
  platform: '',
  requestor: '',
  department: '',
  department_id: '',
  business_owner: '',
  business_owner_id: '',
  start_date: null,
  impl_start_date: null,
  end_date: null,
  attachments: [],
  delivery_platform: '',
  planned_quarter: '',
  // Internal defaults
  process_step: 'new_request',
  health: 'green',
});

// Helper to upload attachments to storage and save to business_request_links
async function uploadAttachments(requestId: string, attachments: File[]) {
  if (!attachments || attachments.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  for (const file of attachments) {
    const fileName = `${requestId}/${Date.now()}-${file.name}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Failed to upload attachment:', uploadError);
      continue;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

    // Save reference to business_request_links
    const { error: insertError } = await supabase
      .from('business_request_links')
      .insert({
        business_request_id: requestId,
        title: file.name,
        url: publicUrl,
        link_type: 'documentation',
        kind: 'document',
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        added_by_name: profile?.full_name || user.email || 'Unknown'
      });
    
    if (insertError) {
      console.error('Failed to save attachment reference:', insertError);
    }
  }
}

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const [formData, setFormData] = useState<Record<string, any>>(getInitialFormData());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.title || formData.title.length < 5) {
      toast.error('Summary is required and must be at least 5 characters');
      return;
    }
    if (!formData.description || formData.description.trim().length === 0) {
      toast.error('Description is required');
      return;
    }
    if (!formData.requestor) {
      toast.error('Assignee is required');
      return;
    }
    if (!formData.department_id && !formData.department) {
      toast.error('Department is required');
      return;
    }
    if (!formData.business_owner_id && (!formData.business_owner || formData.business_owner.trim().length === 0)) {
      toast.error('Business Owner is required');
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
      delivery_platform: formData.delivery_platform || null,
      planned_quarter: formData.planned_quarter ? [formData.planned_quarter] : null,
      department: formData.department,
      department_id: formData.department_id,
      business_owner: formData.business_owner,
      business_owner_id: formData.business_owner_id,
    };

    try {
      // Create the business request
      const createdRequest = await createMutation.mutateAsync(requestData as any);
      
      // Upload attachments if any
      const attachments: File[] = formData.attachments || [];
      if (attachments.length > 0 && createdRequest?.id) {
        setIsUploading(true);
        await uploadAttachments(createdRequest.id, attachments);
        setIsUploading(false);
      }
      
      setShowSuccessMessage(true);
      
      // Hide success message and close after 2 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
        setFormData(getInitialFormData());
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Failed to create request:', error);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setShowSuccessMessage(false);
    setFormData(getInitialFormData());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[900px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-gray-900",
        "rounded-2xl",
        "shadow-2xl",
        "border-0",
        "[&>button]:hidden"
      )}>
        {/* Premium Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-secondary-olive via-secondary-bronze to-secondary-champagne flex-shrink-0" />

        {/* Success Message Overlay */}
        {showSuccessMessage && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
            <div className="text-center space-y-4 px-8 py-10 animate-in fade-in-0 zoom-in-95">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-lg">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Request Submitted</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Your business request is submitted for review and prioritization.
              </p>
            </div>
          </div>
        )}

        {/* Premium Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Create business request
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Submit a new business request for review and prioritization
              </p>
            </div>
            <button 
              onClick={handleClose} 
              className={cn(
                "p-2 rounded-lg",
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-colors"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content with Premium Background */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800/30">
          <DemandDetailsTab data={formData} onChange={handleFieldChange} />
        </div>

        {/* Premium Footer */}
        <div className={cn(
          "flex items-center justify-end gap-3",
          "px-6 py-4",
          "bg-gray-50 dark:bg-gray-800/50",
          "border-t border-gray-200 dark:border-gray-700",
          "flex-shrink-0"
        )}>
          <Button 
            variant="outline" 
            onClick={handleClose}
            className={cn(
              "px-5 py-2.5",
              "text-[13px] font-medium",
              "text-gray-600 dark:text-gray-300",
              "border border-gray-200 dark:border-gray-700",
              "rounded-lg",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "hover:text-gray-900 dark:hover:text-gray-100",
              "transition-colors"
            )}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createMutation.isPending || showSuccessMessage || isUploading}
            className={cn(
              "px-5 py-2.5",
              "text-[13px] font-medium",
              "text-white",
              "bg-secondary-olive",
              "hover:bg-secondary-olive/90",
              "rounded-lg",
              "shadow-sm hover:shadow-md",
              "transition-all",
              "flex items-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
