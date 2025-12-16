import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { downloadDemandConfirmationPDF } from '@/utils/demandConfirmationPdf';
import { catalystToast } from '@/lib/catalystToast';

const EMAIL_DOMAIN = '@mim.gov.sa';
const MAX_REQUESTS_PER_DAY = 2;

// Force light mode for external portal
const forceLightMode = () => {
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.classList.remove('dark');
};

// Business Ask options
const BUSINESS_ASK_OPTIONS = [
  { value: 'new_feature', label: 'New Feature' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'bug_fix', label: 'Bug Fix' },
  { value: 'integration', label: 'Integration' },
  { value: 'report_dashboard', label: 'Report / Dashboard' },
  { value: 'other', label: 'Other' },
];

// Delivery Platform options
const DELIVERY_PLATFORM_OPTIONS = [
  { value: 'catalyst', label: 'Catalyst' },
  { value: 'mini_apps', label: 'Mini Apps' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'power_bi', label: 'Power BI' },
  { value: 'other', label: 'Other' },
];

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

export default function SubmitDemandRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    summary: '',
    businessAsk: '',
    deliveryPlatform: '',
    description: '',
    requestedBy: '',
    email: '',
    department: '',
    departmentId: '',
    businessOwner: '',
    businessOwnerId: '',
  });
  
  // Attachments
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    requestId: string;
    submittedAt: Date;
  } | null>(null);
  
  // Fetch departments, owners, and mappings
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();
  
  // Force light mode
  useEffect(() => {
    forceLightMode();
  }, []);
  
  // Auto-populate business owner when department changes
  useEffect(() => {
    if (formData.departmentId && mappings && owners) {
      const ownerId = getOwnerIdForDepartment(formData.departmentId, mappings);
      if (ownerId) {
        const owner = owners.find(o => o.id === ownerId);
        if (owner) {
          setFormData(prev => ({
            ...prev,
            businessOwner: owner.name,
            businessOwnerId: owner.id,
          }));
        }
      }
    }
  }, [formData.departmentId, mappings, owners]);
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const handleDepartmentChange = (departmentId: string) => {
    const dept = departments?.find(d => d.id === departmentId);
    setFormData(prev => ({
      ...prev,
      department: dept?.name || '',
      departmentId: departmentId,
      businessOwner: '',
      businessOwnerId: '',
    }));
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ];
    
    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        catalystToast.error('Invalid File', `Invalid file type: ${file.name}`);
        continue;
      }
      if (attachments.length >= 5) {
        catalystToast.error('Limit Reached', 'Maximum 5 files allowed');
        break;
      }
      
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        file,
      }]);
    }
    
    e.target.value = '';
  };
  
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }
    if (!formData.businessAsk) {
      newErrors.businessAsk = 'Business Ask is required';
    }
    if (!formData.deliveryPlatform) {
      newErrors.deliveryPlatform = 'Delivery Platform is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.requestedBy.trim()) {
      newErrors.requestedBy = 'Requested by is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email username is required';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.email)) {
      newErrors.email = 'Invalid username (letters, numbers, dots, dashes only)';
    }
    if (!formData.departmentId) {
      newErrors.department = 'Department is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Check daily submission limit
  const checkDailyLimit = async (email: string): Promise<boolean> => {
    const fullEmail = `${email}${EMAIL_DOMAIN}`;
    const today = new Date();
    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();
    
    const { count, error } = await supabase
      .from('business_requests')
      .select('*', { count: 'exact', head: true })
      .ilike('requestor', `%${fullEmail}%`)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);
    
    if (error) {
      console.error('Error checking daily limit:', error);
      return true; // Allow submission if check fails
    }
    
    return (count || 0) < MAX_REQUESTS_PER_DAY;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.text-destructive');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check daily submission limit
      const withinLimit = await checkDailyLimit(formData.email);
      if (!withinLimit) {
        catalystToast.error(
          'Daily Limit Reached', 
          `Maximum ${MAX_REQUESTS_PER_DAY} requests per day allowed. Please try again tomorrow.`
        );
        setIsSubmitting(false);
        return;
      }
      
      const fullEmail = `${formData.email}${EMAIL_DOMAIN}`;
      // Insert business request
      const { data: requestData, error: requestError } = await supabase
        .from('business_requests')
        .insert([{
          title: formData.summary,
          description: formData.description,
          delivery_platform: formData.deliveryPlatform,
          department: formData.department,
          department_id: formData.departmentId || null,
          business_owner: formData.businessOwner,
          business_owner_id: formData.businessOwnerId || null,
          process_step: 'new_request',
          health: 'green',
          requestor: `${formData.requestedBy} (${fullEmail})`,
        }])
        .select('id, request_key, created_at')
        .single();
      
      if (requestError) throw requestError;
      
      // Upload attachments if any
      if (attachments.length > 0 && requestData?.id) {
        for (const attachment of attachments) {
          const filePath = `business-requests/${requestData.id}/${attachment.id}-${attachment.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, attachment.file);
          
          if (uploadError) {
            console.error('Failed to upload attachment:', uploadError);
          } else {
            // Save attachment reference
            await supabase.from('attachments').insert({
              entity_type: 'business_request',
              entity_id: requestData.id,
              file_name: attachment.name,
              file_path: filePath,
              file_size: attachment.size,
              mime_type: attachment.file.type,
              uploaded_by: 'external-user',
            });
          }
        }
      }
      
      // Format request ID
      const requestId = requestData?.request_key || `MIM-${String(requestData?.id || 0).padStart(3, '0')}`;
      
      setSubmittedData({
        requestId,
        submittedAt: new Date(requestData?.created_at || Date.now()),
      });
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('Submission error:', error);
      catalystToast.error('Submission Failed', 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDownloadPDF = () => {
    if (!submittedData) return;
    
    const fullEmail = formData.email.includes('@') ? formData.email : `${formData.email}${EMAIL_DOMAIN}`;
    
    try {
      downloadDemandConfirmationPDF({
        requestId: submittedData.requestId,
        submittedAt: submittedData.submittedAt,
        summary: formData.summary,
        businessAsk: BUSINESS_ASK_OPTIONS.find(o => o.value === formData.businessAsk)?.label || formData.businessAsk,
        deliveryPlatform: DELIVERY_PLATFORM_OPTIONS.find(o => o.value === formData.deliveryPlatform)?.label || formData.deliveryPlatform,
        requestedBy: formData.requestedBy,
        email: fullEmail,
        department: formData.department,
        businessOwner: formData.businessOwner,
        description: formData.description,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      catalystToast.error('PDF Error', 'Failed to generate PDF');
    }
  };
  
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5c7c5c] flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="text-lg font-semibold">
            <span className="text-[#5c7c5c]">Cata</span>
            <span className="text-[#c69c6d]">lyst</span>
          </span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-[720px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Demand Request</h1>
        <p className="text-gray-600 mb-8">Complete the form below to submit your request to the MIM Demand Team</p>
        
        {/* Form Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Section 1: Request Summary */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              REQUEST SUMMARY
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Summary <span className="text-[#c69c6d]">*</span>
                </Label>
                <Input
                  placeholder="Brief title for your request"
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className={cn(
                    "mt-1.5",
                    errors.summary && "border-destructive"
                  )}
                />
                {errors.summary && (
                  <p className="text-destructive text-xs mt-1">{errors.summary}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Business Ask <span className="text-[#c69c6d]">*</span>
                  </Label>
                  <Select
                    value={formData.businessAsk}
                    onValueChange={(value) => handleInputChange('businessAsk', value)}
                  >
                    <SelectTrigger className={cn("mt-1.5", errors.businessAsk && "border-destructive")}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_ASK_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.businessAsk && (
                    <p className="text-destructive text-xs mt-1">{errors.businessAsk}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Delivery Platform <span className="text-[#c69c6d]">*</span>
                  </Label>
                  <Select
                    value={formData.deliveryPlatform}
                    onValueChange={(value) => handleInputChange('deliveryPlatform', value)}
                  >
                    <SelectTrigger className={cn("mt-1.5", errors.deliveryPlatform && "border-destructive")}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_PLATFORM_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.deliveryPlatform && (
                    <p className="text-destructive text-xs mt-1">{errors.deliveryPlatform}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Section 2: Request Details */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              REQUEST DETAILS
            </h2>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Description <span className="text-[#c69c6d]">*</span>
              </Label>
              <Textarea
                placeholder="Describe your request..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={cn(
                  "mt-1.5 min-h-[140px] resize-y",
                  errors.description && "border-destructive"
                )}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Include business need, urgency, and expected outcome
              </p>
              {errors.description && (
                <p className="text-destructive text-xs mt-1">{errors.description}</p>
              )}
            </div>
          </div>
          
          {/* Section 3: Requester Information */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              REQUESTER INFORMATION
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Requested by <span className="text-[#c69c6d]">*</span>
                  </Label>
                  <Input
                    placeholder="Your full name"
                    value={formData.requestedBy}
                    onChange={(e) => handleInputChange('requestedBy', e.target.value)}
                    className={cn("mt-1.5", errors.requestedBy && "border-destructive")}
                  />
                  {errors.requestedBy && (
                    <p className="text-destructive text-xs mt-1">{errors.requestedBy}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Email <span className="text-[#c69c6d]">*</span>
                  </Label>
                  <div className="flex mt-1.5">
                    <Input
                      type="text"
                      placeholder="username"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value.replace(/@.*$/, ''))}
                      className={cn(
                        "rounded-r-none border-r-0",
                        errors.email && "border-destructive"
                      )}
                    />
                    <div className="flex items-center px-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600 text-sm whitespace-nowrap">
                      {EMAIL_DOMAIN}
                    </div>
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-xs mt-1">{errors.email}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Department <span className="text-[#c69c6d]">*</span>
                  </Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger className={cn("mt-1.5", errors.department && "border-destructive")}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-destructive text-xs mt-1">{errors.department}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Business Owner <span className="text-[#c69c6d]">*</span>
                  </Label>
                  <Input
                    value={formData.businessOwner}
                    readOnly
                    placeholder="Auto-set by department"
                    className="mt-1.5 bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Section 4: Attachments */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                <span className="font-medium">Attachments</span> (optional, max 5 files)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Browse
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {attachments.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm"
                  >
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <span className="text-gray-500 text-xs">({formatFileSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-gradient-to-r from-[#c69c6d] to-[#a67c52] hover:from-[#b8905f] hover:to-[#956c42] text-white px-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Request
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </>
            )}
          </Button>
        </div>
      </main>
      
      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[480px]">
          <div className="text-center py-4">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
              Demand Submitted Successfully
            </DialogTitle>
            <p className="text-gray-600 text-sm mb-6">
              Your demand is in review with the EPMO Demand Team
            </p>
            
            {/* Request ID Box */}
            {submittedData && (
              <div className="bg-[#f5ede3] rounded-lg p-4 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Request ID</p>
                <p className="text-2xl font-bold text-[#c69c6d]">{submittedData.requestId}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Submitted: {format(submittedData.submittedAt, 'd MMMM yyyy \'at\' HH:mm')}
                </p>
              </div>
            )}
            
            {/* Summary */}
            <div className="text-left space-y-2 mb-6 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Summary</span>
                <span className="font-medium text-gray-900 truncate max-w-[200px]">{formData.summary}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Platform</span>
                <span className="font-medium text-gray-900">
                  {DELIVERY_PLATFORM_OPTIONS.find(o => o.value === formData.deliveryPlatform)?.label}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Department</span>
                <span className="font-medium text-gray-900">{formData.department}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Business Owner</span>
                <span className="font-medium text-gray-900">{formData.businessOwner}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleDownloadPDF}
                className="w-full gap-2 bg-gradient-to-r from-[#c69c6d] to-[#a67c52] hover:from-[#b8905f] hover:to-[#956c42] text-white"
              >
                <Download className="h-4 w-4" />
                Download Confirmation (PDF)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmation(false);
                  navigate('/auth');
                }}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
