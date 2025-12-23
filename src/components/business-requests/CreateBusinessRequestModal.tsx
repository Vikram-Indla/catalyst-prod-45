import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { toast } from 'sonner';
import { DemandDetailsTab } from './create-tabs/DemandDetailsTab';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ProgressRing, KeyboardShortcuts, AutoSaveIndicator, AutoSaveStatus } from './create-form';

interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getInitialFormData = (): Record<string, any> => ({
  title: '',
  description: '',
  platform: '',
  requestor: '',
  assignee: '',
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
  end_date_locked: false,
  end_date_locked_by: null,
  end_date_locked_at: null,
  process_step: 'new_request',
  health: 'green',
});

// Calculate form completion percentage
function calculateCompletion(data: Record<string, any>): number {
  const requiredFields = [
    { key: 'title', weight: 25, validator: (v: string) => v && v.length >= 5 },
    { key: 'description', weight: 25, validator: (v: string) => {
      const text = (v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.split(' ').filter(Boolean).length >= 10;
    }},
    { key: 'assignee', weight: 20, validator: (v: string) => !!v },
    { key: 'department_id', weight: 15, validator: (v: string) => !!v },
    { key: 'business_owner_id', weight: 15, validator: (v: string) => !!v },
  ];

  return requiredFields.reduce((acc, field) => {
    return acc + (field.validator(data[field.key]) ? field.weight : 0);
  }, 0);
}

// Helper to upload attachments to storage
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
    
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Failed to upload attachment:', uploadError);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

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
  const [isUploading, setIsUploading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  // Calculate completion percentage
  const completionPercent = useMemo(() => calculateCompletion(formData), [formData]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Trigger auto-save indication
    setAutoSaveStatus('saving');
  }, []);

  // Auto-save simulation (draft saved locally)
  useEffect(() => {
    if (autoSaveStatus === 'saving') {
      const timer = setTimeout(() => {
        setAutoSaveStatus('saved');
        // Clear saved status after a delay
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoSaveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, formData]);

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
    if (!formData.assignee) {
      toast.error('Assignee is required');
      return;
    }
    if (!formData.department_id) {
      toast.error('Department is required');
      return;
    }
    if (!formData.business_owner_id) {
      toast.error('Business Owner is required');
      return;
    }

    const requestData = {
      title: formData.title,
      description: formData.description,
      platform: formData.platform,
      requestor: formData.requestor || null,
      assignee: formData.assignee || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      impl_start_date: formData.impl_start_date,
      impl_target_end_date: formData.end_date,
      delivery_platform: formData.delivery_platform || null,
      planned_quarter: formData.planned_quarter ? [formData.planned_quarter] : null,
      department: formData.department,
      department_id: formData.department_id,
      business_owner: formData.business_owner,
      business_owner_id: formData.business_owner_id,
      end_date_locked: formData.end_date_locked || false,
      end_date_locked_by: formData.end_date_locked_by || null,
      end_date_locked_at: formData.end_date_locked_at || null,
    };

    try {
      const createdRequest = await createMutation.mutateAsync(requestData as any);
      
      const attachments: File[] = formData.attachments || [];
      if (attachments.length > 0 && createdRequest?.id) {
        setIsUploading(true);
        await uploadAttachments(createdRequest.id, attachments);
        setIsUploading(false);
      }
      
      const requestKey = createdRequest?.request_key || createdRequest?.id?.slice(0, 8);
      const summary = formData.title.length > 50 ? formData.title.slice(0, 50) + '...' : formData.title;
      toast.success(`Request ${requestKey} created: "${summary}"`);
      
      setFormData(getInitialFormData());
      onClose();
    } catch (error) {
      console.error('Failed to create request:', error);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setAutoSaveStatus('idle');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-gray-900",
        "rounded-lg",
        "shadow-xl",
        "border-0",
        "[&>button]:hidden"
      )}>
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#5c7c5c] via-[#c69c6d] to-[#d4b896] flex-shrink-0" />

        {/* Header with Progress Ring */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing percent={completionPercent} />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Create business request
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Submit a new business request for review and prioritization
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
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          <DemandDetailsTab data={formData} onChange={handleFieldChange} />
        </div>

        {/* Footer with Keyboard Shortcuts */}
        <div className={cn(
          "flex items-center justify-between",
          "px-5 py-3",
          "bg-gray-50 dark:bg-gray-800/50",
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
                "text-gray-700 dark:text-gray-300"
              )}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || isUploading || completionPercent < 100}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                "text-white bg-[#5c7c5c] hover:bg-[#4a6a4a]",
                "rounded-md shadow-sm",
                "flex items-center gap-1.5",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              {createMutation.isPending ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
