import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, Mail, ArrowLeft, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Department options
const DEPARTMENTS = [
  'Information Technology',
  'Operations',
  'Finance',
  'Human Resources',
  'Marketing',
  'Sales',
  'Legal',
  'Strategy',
  'Customer Service',
  'Other'
];

// Delivery Platform options
const DELIVERY_PLATFORMS = [
  'Senaei Platform',
  'Innovation Platform',
  'Tahommena',
  'Compass',
  'Mini Apps',
  'Website'
];

// Entity Services - EFS options
const EFS_PARENT_OPTIONS = [
  'License Models',
  'Site Location',
  'Environment Service',
  'Customs Exemptions',
  'Chemical Permits',
  'Labor Enablement',
  'Incentives & Enablers',
  'Competitiveness'
];

const EFS_CHILD_OPTIONS: Record<string, string[]> = {
  'License Models': ['Industrial License', 'Commercial License', 'Service License'],
  'Site Location': ['Industrial City', 'Free Zone', 'Special Economic Zone'],
  'Environment Service': ['Environmental Permit', 'Waste Management', 'Emissions Control'],
  'Customs Exemptions': ['Import Duty Waiver', 'Export Facilitation', 'Temporary Import'],
  'Chemical Permits': ['Storage Permit', 'Transport Permit', 'Usage Authorization'],
  'Labor Enablement': ['Work Visa Processing', 'Labor Quota', 'Training Programs'],
  'Incentives & Enablers': ['Tax Incentives', 'Land Allocation', 'Utility Subsidies'],
  'Competitiveness': ['Quality Certification', 'Export Support', 'R&D Grants']
};

// ECS options
const ECS_OPTIONS = ['CR with Industry ISIC', 'CR without Industry ISIC'];

// IS options
const IS_SAUDI_OPTIONS = ['Incentives & Enablers', 'Competitiveness'];
const IS_NON_SAUDI_OPTIONS = ['Incentives & Enablers'];

export default function RequestAccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    deliveryPlatform: '',
    reporter: '',
    email: '',
    department: '',
    businessOwner: '',
    efsParent: '',
    efsChild: '',
    ecsOption: '',
    isSaudiCategory: '',
    isNonSaudiCategory: '',
  });
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Entity Services expanded by default
  const [entityServicesOpen, setEntityServicesOpen] = useState(true);
  
  // Human verification
  const [captchaNum1] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [captchaNum2] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    if (!email.trim()) return 'Email is required';
    if (!email.endsWith('@mim.gov.sa')) return 'Only @mim.gov.sa email addresses are allowed';
    if (!/^[^\s@]+@mim\.gov\.sa$/.test(email)) return 'Invalid email format';
    return '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.summary.trim() || formData.summary.length < 5) {
      newErrors.summary = 'Summary must be at least 5 characters';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.deliveryPlatform) {
      newErrors.deliveryPlatform = 'Delivery platform is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.businessOwner.trim()) {
      newErrors.businessOwner = 'Business owner is required';
    }
    if (!formData.reporter.trim()) {
      newErrors.reporter = 'Name is required';
    }
    
    // Email validation
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }
    
    // CAPTCHA validation
    const correctAnswer = captchaNum1 + captchaNum2;
    if (parseInt(captchaAnswer) !== correctAnswer) {
      newErrors.captcha = 'Incorrect answer. Please try again.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'text/plain', 'text/csv'];
    
    const newFiles: File[] = [];
    let totalSize = attachments.reduce((sum, f) => sum + f.size, 0);
    
    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Invalid file type', description: `${file.name} is not a supported document type`, variant: 'destructive' });
        continue;
      }
      if (attachments.length + newFiles.length >= 5) {
        toast({ title: 'Maximum files reached', description: 'You can only upload up to 5 files', variant: 'destructive' });
        break;
      }
      if (totalSize + file.size > 20 * 1024 * 1024) {
        toast({ title: 'Size limit exceeded', description: 'Total file size cannot exceed 20MB', variant: 'destructive' });
        break;
      }
      newFiles.push(file);
      totalSize += file.size;
    }
    
    setAttachments([...attachments, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({ title: 'Please fix the errors', description: 'Some required fields are missing or invalid', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('business_requests')
        .insert([{
          title: formData.summary,
          description: formData.description,
          delivery_platform: formData.deliveryPlatform,
          requestor: formData.reporter,
          process_step: 'new_request',
          health: 'green',
          platform: 'Web',
          complexity: 'Medium',
          urgency: 'Normal',
        }])
        .select('request_key')
        .single();
      
      if (error) throw error;
      
      setTicketNumber(data.request_key);
      setSubmissionSuccess(true);
      
    } catch (error: any) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(254, 255, 255);
    doc.setFontSize(22);
    doc.text('Demand Request Confirmation', 15, 22);
    
    // Ticket number
    doc.setFontSize(12);
    doc.setTextColor(198, 156, 109);
    doc.text(`Ticket: ${ticketNumber}`, 15, 30);
    
    // Content
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(14);
    doc.text('Request Details', 15, 50);
    
    doc.setFontSize(11);
    let yPos = 65;
    const lineHeight = 8;
    
    doc.text(`Summary: ${formData.summary}`, 15, yPos);
    yPos += lineHeight * 2;
    
    doc.text(`Description:`, 15, yPos);
    yPos += lineHeight;
    const descLines = doc.splitTextToSize(formData.description, 180);
    doc.text(descLines, 15, yPos);
    yPos += descLines.length * lineHeight + 5;
    
    doc.text(`Delivery Platform: ${formData.deliveryPlatform}`, 15, yPos);
    yPos += lineHeight;
    doc.text(`Department: ${formData.department}`, 15, yPos);
    yPos += lineHeight;
    doc.text(`Business Owner: ${formData.businessOwner}`, 15, yPos);
    yPos += lineHeight;
    doc.text(`Requested By: ${formData.reporter}`, 15, yPos);
    yPos += lineHeight;
    doc.text(`Email: ${formData.email}`, 15, yPos);
    yPos += lineHeight * 2;
    
    // Footer message
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('This request has been logged with the MIM Demand Team.', 15, yPos);
    yPos += 6;
    doc.text('You will be kept informed of its progress.', 15, yPos);
    yPos += 6;
    doc.text('Thank you for submitting your request.', 15, yPos);
    
    // Page number
    doc.setFontSize(8);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 285);
    doc.text('Catalyst - MIM Demand Management', 150, 285);
    
    doc.save(`${ticketNumber}-demand-request.pdf`);
  };

  const handleSendEmail = async () => {
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    
    setIsSendingEmail(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: 'Email sent', description: `Confirmation sent to ${emailInput}` });
      setEmailInput('');
    } catch (error) {
      toast({ title: 'Failed to send email', variant: 'destructive' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Success screen
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#c69c6d]/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-[#c69c6d]" />
          </div>
          
          {/* Ticket Number */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Your Request ID</p>
            <p className="text-3xl font-semibold text-[#1a1a1a]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {ticketNumber}
            </p>
          </div>
          
          {/* Success Message */}
          <div className="mb-8 text-[#1a1a1a]/80 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <p className="text-lg font-medium mb-2">Your demand has been successfully logged</p>
            <p className="text-sm">
              The MIM Demand Team has received your request. We will keep you informed of its progress and reach out if any additional information is required.
            </p>
            <p className="text-sm mt-2 text-[#c69c6d] font-medium">
              Thank you for submitting your request.
            </p>
          </div>
          
          {/* Actions */}
          <div className="space-y-4">
            {/* Download PDF */}
            <Button 
              onClick={handleDownloadPDF}
              className="w-full bg-[#c69c6d] hover:bg-[#b8905f] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Confirmation (PDF)
            </Button>
            
            {/* Email Section */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Share confirmation via email</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  variant="outline"
                  className="border-[#c69c6d] text-[#c69c6d] hover:bg-[#c69c6d]/10"
                >
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Back to Login */}
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')}
              className="w-full mt-4 text-muted-foreground hover:text-[#1a1a1a]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header with Title */}
      <header className="bg-[#1a1a1a] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Catalyst Logo */}
            <span 
              className="font-semibold whitespace-nowrap cursor-pointer"
              style={{ 
                fontSize: '20px', 
                lineHeight: '24px', 
                letterSpacing: '-0.02em',
              }}
              onClick={() => navigate('/auth')}
            >
              <span className="text-white">Cata</span>
              <span className="text-[#c69c6d]">lyst</span>
            </span>
            
            {/* Divider */}
            <div className="w-px h-6 bg-white/20" />
            
            {/* Page Title */}
            <h1 className="text-white font-medium text-base sm:text-lg">
              Submit a Demand Request
            </h1>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => navigate('/auth')}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Login</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Request Details */}
          <section className="bg-white rounded-xl border border-[#e5e5e5] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#c69c6d] uppercase tracking-wider mb-6">
              Request Details
            </h2>
            
            <div className="space-y-5">
              {/* Summary */}
              <div>
                <Label htmlFor="summary" className="text-[#1a1a1a] font-medium">
                  Summary <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief title for your request"
                  className={cn("mt-1.5", errors.summary && "border-red-500")}
                />
                {errors.summary && <p className="text-sm text-red-500 mt-1">{errors.summary}</p>}
              </div>
              
              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-[#1a1a1a] font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide enough details for the business request (50 words)"
                  className={cn("mt-1.5 min-h-[120px]", errors.description && "border-red-500")}
                />
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
              </div>
              
              {/* Delivery Platform */}
              <div>
                <Label className="text-[#1a1a1a] font-medium">
                  Delivery Platform <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.deliveryPlatform} 
                  onValueChange={(value) => setFormData({ ...formData, deliveryPlatform: value })}
                >
                  <SelectTrigger className={cn("mt-1.5", errors.deliveryPlatform && "border-red-500")}>
                    <SelectValue placeholder="Select platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_PLATFORMS.map((platform) => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.deliveryPlatform && <p className="text-sm text-red-500 mt-1">{errors.deliveryPlatform}</p>}
              </div>
            </div>
          </section>

          {/* Section 2: Requester Information */}
          <section className="bg-white rounded-xl border border-[#e5e5e5] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#c69c6d] uppercase tracking-wider mb-6">
              Requester Information
            </h2>
            
            <div className="space-y-5">
              {/* Requested By & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reporter" className="text-[#1a1a1a] font-medium">
                    Requested by <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reporter"
                    value={formData.reporter}
                    onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
                    placeholder="Enter your full name"
                    className={cn("mt-1.5", errors.reporter && "border-red-500")}
                  />
                  {errors.reporter && <p className="text-sm text-red-500 mt-1">{errors.reporter}</p>}
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-[#1a1a1a] font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@mim.gov.sa"
                    className={cn("mt-1.5", errors.email && "border-red-500")}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>
              
              {/* Department & Business Owner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1a1a1a] font-medium">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger className={cn("mt-1.5", errors.department && "border-red-500")}>
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-sm text-red-500 mt-1">{errors.department}</p>}
                </div>
                
                <div>
                  <Label htmlFor="businessOwner" className="text-[#1a1a1a] font-medium">
                    Business Owner <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessOwner"
                    value={formData.businessOwner}
                    onChange={(e) => setFormData({ ...formData, businessOwner: e.target.value })}
                    placeholder="Enter business owner name"
                    className={cn("mt-1.5", errors.businessOwner && "border-red-500")}
                  />
                  {errors.businessOwner && <p className="text-sm text-red-500 mt-1">{errors.businessOwner}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Attachments */}
          <section className="bg-white rounded-xl border border-[#e5e5e5] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#c69c6d] uppercase tracking-wider mb-6">
              Attachments
            </h2>
            
            <div>
              <Label className="text-[#1a1a1a] font-medium">
                Supporting Documents <span className="text-muted-foreground text-sm font-normal">(Max 5 files, 20MB total. PDF, DOC, XLS, PPT, TXT, CSV)</span>
              </Label>
              <div className="mt-1.5">
                <label className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f5] border border-dashed border-[#d5d5d5] rounded-lg cursor-pointer hover:bg-[#efefef] transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Upload Files...</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    disabled={attachments.length >= 5}
                  />
                </label>
                
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#f9f9f9] px-3 py-2 rounded-lg">
                        <span className="text-sm truncate">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Entity & Individual Services (Expanded by default, Optional) */}
          <Collapsible open={entityServicesOpen} onOpenChange={setEntityServicesOpen}>
            <section className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden">
              <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                <h2 className="text-sm font-semibold text-[#c69c6d] uppercase tracking-wider">
                  Entity & Individual Services <span className="text-muted-foreground font-normal normal-case">(Optional)</span>
                </h2>
                {entityServicesOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-6 pb-6 space-y-6">
                  {/* EFS Section */}
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a] mb-3">EFS (Entity Factory Services)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-sm">Service Category</Label>
                        <Select 
                          value={formData.efsParent} 
                          onValueChange={(value) => setFormData({ ...formData, efsParent: value, efsChild: '' })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {EFS_PARENT_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground text-sm">Specific Service</Label>
                        <Select 
                          value={formData.efsChild} 
                          onValueChange={(value) => setFormData({ ...formData, efsChild: value })}
                          disabled={!formData.efsParent}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select service..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(EFS_CHILD_OPTIONS[formData.efsParent] || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* ECS Section */}
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a] mb-3">ECS (Commercial Registry)</p>
                    <Select 
                      value={formData.ecsOption} 
                      onValueChange={(value) => setFormData({ ...formData, ecsOption: value })}
                    >
                      <SelectTrigger className="max-w-sm">
                        <SelectValue placeholder="Select option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ECS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* IS Section */}
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a] mb-3">IS (Individual Services)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-sm">Saudi Category</Label>
                        <Select 
                          value={formData.isSaudiCategory} 
                          onValueChange={(value) => setFormData({ ...formData, isSaudiCategory: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {IS_SAUDI_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground text-sm">Non-Saudi Category</Label>
                        <Select 
                          value={formData.isNonSaudiCategory} 
                          onValueChange={(value) => setFormData({ ...formData, isNonSaudiCategory: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {IS_NON_SAUDI_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>

          {/* Section 5: Human Verification */}
          <section className="bg-white rounded-xl border border-[#e5e5e5] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#c69c6d] uppercase tracking-wider mb-4">
              Verification
            </h2>
            
            <div className="flex items-center gap-4">
              <div className="bg-[#f5f5f5] px-4 py-2 rounded-lg">
                <span className="text-lg font-semibold text-[#1a1a1a]">
                  {captchaNum1} + {captchaNum2} = ?
                </span>
              </div>
              <Input
                type="number"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Your answer"
                className={cn("w-32", errors.captcha && "border-red-500")}
              />
              {errors.captcha && <p className="text-sm text-red-500">{errors.captcha}</p>}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Please solve this simple math problem to verify you're human
            </p>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-[#c69c6d] hover:bg-[#b8905f] text-white px-8"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
