import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, ArrowLeft, Upload, X, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';

// Description template with section hints
const DESCRIPTION_TEMPLATE_EN = `<p><strong>Business Need:</strong></p>
<p><br></p>
<p><strong>Detailed Description:</strong></p>
<p><br></p>
<p><strong>Delivery Urgency:</strong></p>
<p><br></p>
<p><strong>Justification:</strong></p>
<p><br></p>`;

const DESCRIPTION_TEMPLATE_AR = `<p><strong>الحاجة التجارية:</strong></p>
<p><br></p>
<p><strong>الوصف التفصيلي:</strong></p>
<p><br></p>
<p><strong>أولوية التسليم:</strong></p>
<p><br></p>
<p><strong>المبرر:</strong></p>
<p><br></p>`;

// Helper to count words from HTML
const countWordsFromHtml = (html: string) => {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  return text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
};

// Translations
const translations = {
  en: {
    pageTitle: 'Submit a Demand Request',
    backToLogin: 'Back to Login',
    langSwitch: 'AR',
    step1: 'Request Details',
    step2: 'Requester Information',
    step3: 'Attachments',
    step4: 'Review & Submit',
    cardTitle: 'External Business Request',
    cardSub: "Please provide clear details. You'll receive a reference number after submission.",
    badge: 'Secure external intake',
    summaryLabel: 'Summary',
    summaryPlaceholder: 'Brief title for your request',
    summaryHint: 'Example: "Enable bulk export for investor licenses dashboard".',
    summaryError: 'Summary is required (min 5 characters).',
    descLabel: 'Description',
    descPlaceholder: 'Provide enough details for the business request (50 words minimum)',
    descHint: 'Tip: include objective, impacted users, urgency, and expected outcome.',
    descError: 'Description is required.',
    platformLabel: 'Delivery Platform',
    platformPlaceholder: 'Select platform…',
    platformHint: 'Choose the delivery platform that will implement this request.',
    platformError: 'Delivery Platform is required.',
    requestedByLabel: 'Requested by',
    requestedByPlaceholder: 'Enter your full name',
    requestedByError: 'Your name is required.',
    emailLabel: 'Email',
    emailPlaceholder: 'name@mim.gov.sa',
    emailError: 'Valid @mim.gov.sa email is required.',
    deptLabel: 'Department',
    deptPlaceholder: 'Select department…',
    deptError: 'Department is required.',
    ownerLabel: 'Business Owner',
    ownerPlaceholder: 'Enter business owner name',
    ownerError: 'Business Owner is required.',
    requesterHint: 'Make sure requester details are correct to receive updates and reference number.',
    attachLabel: 'Attachments (optional)',
    attachDrop: 'Drop files here',
    attachHint: 'Max 5 files, 20MB total. Allowed: PDF, DOC, XLS, PPT, TXT, CSV.',
    browseFiles: 'Browse files',
    reviewTitle: 'Review your details',
    reviewHint: 'Review your details before submitting. You will receive a reference number after successful submission.',
    privacyHint: 'By submitting, you confirm the information provided is accurate.',
    back: 'Back',
    saveDraft: 'Save Draft',
    continue: 'Continue',
    submit: 'Submit Request',
    sidebarBadge: 'What happens next',
    sidebarTitle: 'After you submit',
    sidebarText: "You'll receive a reference number and confirmation email. Your request will be reviewed and routed to the relevant IT delivery platform.",
    responseTitle: 'Expected response',
    responseText: 'Initial triage in 1–3 business days.',
    confTitle: 'Confidentiality',
    confText: 'External submission. Do not include sensitive personal data unless required.',
    helpTitle: 'Need help?',
    helpText: 'support@mim.gov.sa',
    successTitle: 'Your demand has been successfully logged',
    successText: 'The MIM Demand Team has received your request. We will keep you informed of its progress and reach out if any additional information is required.',
    thankYou: 'Thank you for submitting your request.',
    downloadPdf: 'Download Confirmation (PDF)',
    editForm: 'Edit Form Again',
    requestId: 'Your Request ID',
    progressTitle: 'Progress',
    required: '*',
  },
  ar: {
    pageTitle: 'تقديم طلب عمل',
    backToLogin: 'العودة لتسجيل الدخول',
    langSwitch: 'EN',
    step1: 'تفاصيل الطلب',
    step2: 'معلومات مقدم الطلب',
    step3: 'المرفقات',
    step4: 'المراجعة والإرسال',
    cardTitle: 'طلب عمل خارجي',
    cardSub: 'يرجى تقديم تفاصيل واضحة. ستتلقى رقم مرجعي بعد التقديم.',
    badge: 'استلام آمن خارجي',
    summaryLabel: 'الملخص',
    summaryPlaceholder: 'عنوان موجز لطلبك',
    summaryHint: 'مثال: "تفعيل التصدير المجمع للوحة تراخيص المستثمرين".',
    summaryError: 'الملخص مطلوب (5 أحرف على الأقل).',
    descLabel: 'الوصف',
    descPlaceholder: 'قدم تفاصيل كافية لطلب العمل (50 كلمة كحد أدنى)',
    descHint: 'نصيحة: اذكر الهدف، المستخدمين المتأثرين، الاستعجال، والنتيجة المتوقعة.',
    descError: 'الوصف مطلوب.',
    platformLabel: 'منصة التسليم',
    platformPlaceholder: 'اختر المنصة…',
    platformHint: 'اختر منصة التسليم التي ستنفذ هذا الطلب.',
    platformError: 'منصة التسليم مطلوبة.',
    requestedByLabel: 'مقدم الطلب',
    requestedByPlaceholder: 'أدخل اسمك الكامل',
    requestedByError: 'اسمك مطلوب.',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'name@mim.gov.sa',
    emailError: 'مطلوب بريد إلكتروني صالح من @mim.gov.sa.',
    deptLabel: 'القسم',
    deptPlaceholder: 'اختر القسم…',
    deptError: 'القسم مطلوب.',
    ownerLabel: 'مالك العمل',
    ownerPlaceholder: 'أدخل اسم مالك العمل',
    ownerError: 'مالك العمل مطلوب.',
    requesterHint: 'تأكد من صحة بيانات مقدم الطلب لتلقي التحديثات والرقم المرجعي.',
    attachLabel: 'المرفقات (اختياري)',
    attachDrop: 'أفلت الملفات هنا',
    attachHint: 'الحد الأقصى 5 ملفات، 20 ميجابايت. المسموح: PDF, DOC, XLS, PPT, TXT, CSV.',
    browseFiles: 'تصفح الملفات',
    reviewTitle: 'مراجعة التفاصيل',
    reviewHint: 'راجع تفاصيلك قبل الإرسال. ستتلقى رقم مرجعي بعد الإرسال بنجاح.',
    privacyHint: 'بالإرسال، تؤكد أن المعلومات المقدمة دقيقة.',
    back: 'رجوع',
    saveDraft: 'حفظ كمسودة',
    continue: 'متابعة',
    submit: 'إرسال الطلب',
    sidebarBadge: 'ماذا يحدث بعد ذلك',
    sidebarTitle: 'بعد الإرسال',
    sidebarText: 'ستتلقى رقم مرجعي وبريد تأكيد. سيتم مراجعة طلبك وتوجيهه إلى منصة التسليم المناسبة.',
    responseTitle: 'الاستجابة المتوقعة',
    responseText: 'الفرز الأولي في 1-3 أيام عمل.',
    confTitle: 'السرية',
    confText: 'تقديم خارجي. لا تقم بتضمين بيانات شخصية حساسة إلا إذا لزم الأمر.',
    helpTitle: 'تحتاج مساعدة؟',
    helpText: 'support@mim.gov.sa',
    successTitle: 'تم تسجيل طلبك بنجاح',
    successText: 'استلم فريق MIM للطلبات طلبك. سنبقيك على اطلاع بتقدمه وسنتواصل معك إذا لزم الأمر.',
    thankYou: 'شكراً لتقديم طلبك.',
    downloadPdf: 'تحميل التأكيد (PDF)',
    editForm: 'تعديل النموذج',
    requestId: 'رقم طلبك',
    progressTitle: 'التقدم',
    required: '*',
  }
};

// Department options
const DEPARTMENTS = [
  { en: 'Information Technology', ar: 'تقنية المعلومات' },
  { en: 'Operations', ar: 'العمليات' },
  { en: 'Finance', ar: 'المالية' },
  { en: 'Human Resources', ar: 'الموارد البشرية' },
  { en: 'Business', ar: 'الأعمال' },
  { en: 'Strategy', ar: 'الاستراتيجية' },
  { en: 'Other', ar: 'أخرى' }
];

// Delivery Platform options - imported from business-request.ts (single source of truth)

export default function RequestAccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Language state
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = translations[lang];
  const isRTL = lang === 'ar';
  
  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [t.step1, t.step2, t.step3, t.step4];
  
  // Form state
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    deliveryPlatform: '',
    reporter: '',
    email: '',
    department: '',
    businessOwner: '',
  });
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    if (!email.trim()) return t.emailError;
    if (!email.endsWith('@mim.gov.sa')) return t.emailError;
    if (!/^[^\s@]+@mim\.gov\.sa$/.test(email)) return t.emailError;
    return '';
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!formData.summary.trim() || formData.summary.length < 5) {
        newErrors.summary = t.summaryError;
      }
      if (!formData.description.trim()) {
        newErrors.description = t.descError;
      }
      if (!formData.deliveryPlatform) {
        newErrors.deliveryPlatform = t.platformError;
      }
    }
    
    if (step === 1) {
      if (!formData.reporter.trim()) {
        newErrors.reporter = t.requestedByError;
      }
      const emailError = validateEmail(formData.email);
      if (emailError) {
        newErrors.email = emailError;
      }
      if (!formData.department) {
        newErrors.department = t.deptError;
      }
      if (!formData.businessOwner.trim()) {
        newErrors.businessOwner = t.ownerError;
      }
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

  const handleNext = () => {
    if (currentStep < 3) {
      if (!validateStep(currentStep)) {
        toast({ title: 'Please fix the errors', variant: 'destructive' });
        return;
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/auth');
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1)) {
      setCurrentStep(0);
      toast({ title: 'Please fix the errors', variant: 'destructive' });
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
          process_step: 'request_received',
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
    
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(254, 255, 255);
    doc.setFontSize(22);
    doc.text('Demand Request Confirmation', 15, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(198, 156, 109);
    doc.text(`Ticket: ${ticketNumber}`, 15, 30);
    
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
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('This request has been logged with the MIM Demand Team.', 15, yPos);
    yPos += 6;
    doc.text('You will be kept informed of its progress.', 15, yPos);
    yPos += 6;
    doc.text('Thank you for submitting your request.', 15, yPos);
    
    doc.setFontSize(8);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 285);
    doc.text('Catalyst - MIM Demand Management', 150, 285);
    
    doc.save(`${ticketNumber}-demand-request.pdf`);
  };

  const resetForm = () => {
    setSubmissionSuccess(false);
    setTicketNumber('');
    setCurrentStep(0);
    setFormData({
      summary: '',
      description: '',
      deliveryPlatform: '',
      reporter: '',
      email: '',
      department: '',
      businessOwner: '',
    });
    setAttachments([]);
    setErrors({});
  };

  // Success screen
  if (submissionSuccess) {
    return (
      <div className={cn("min-h-screen bg-[#F6F7F9] flex items-center justify-center p-4", isRTL && "rtl")} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#C8A566]/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-[#C8A566]" />
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-[#6B7280] mb-2">{t.requestId}</p>
            <p className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {ticketNumber}
            </p>
            <p className="text-sm text-[#6B7280] mt-2">
              {lang === 'ar' ? 'تاريخ التقديم' : 'Submitted Date'}: {format(new Date(), 'dd/MM/yyyy')}
            </p>
          </div>
          
          <div className="mb-8 text-[#111827]/80 leading-relaxed">
            <p className="text-lg font-semibold mb-2">{t.successTitle}</p>
            <p className="text-sm">{t.successText}</p>
            <p className="text-sm mt-2 text-[#C8A566] font-medium">{t.thankYou}</p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={handleDownloadPDF}
              className="w-full bg-[#C8A566] hover:bg-[#b8955a] text-[#101010] font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              {t.downloadPdf}
            </Button>
            
            <div className="flex pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="flex-1 border-[#C8A566] text-[#C8A566] hover:bg-[#C8A566]/10 font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backToLogin}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-[#F6F7F9]", isRTL && "rtl")} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header - Dark with Catalyst branding */}
      <header className="bg-[#1A1A1A]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          {/* Logo - Cata (white) + lyst (gold) */}
          <div 
            className="cursor-pointer flex items-center"
            onClick={() => navigate('/auth')}
          >
            <span 
              className="font-semibold whitespace-nowrap"
              style={{ fontSize: '24px', lineHeight: '1', letterSpacing: '-0.02em' }}
            >
              <span className="text-white">Cata</span>
              <span className="text-[#C8A566]">lyst</span>
            </span>
          </div>
          
          {/* Language Toggle with Icon */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-colors flex items-center gap-2"
            title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm font-medium">{t.langSwitch}</span>
          </button>
        </div>
      </header>

      {/* Page Title Section */}
      <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">{t.pageTitle}</h1>
        </div>
      </div>

      {/* Main Content with Sidebar Stepper */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Left: Form Content */}
          <main className="flex-1 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
            <div className="p-5 sm:p-6">
              {/* Step 1: Request Details */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className={cn("space-y-1.5", errors.summary && "has-error")}>
                    <Label className="text-[13px] font-bold text-[#111827]">
                      {t.summaryLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                    </Label>
                    <Input
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder={t.summaryPlaceholder}
                      className={cn(
                        "h-11 rounded-xl border-[#E5E7EB] focus:border-[#C8A566]/70 focus:ring-[0_0_0_4px_rgba(200,165,102,0.25)]",
                        errors.summary && "border-[#B42318]/55 bg-gradient-to-b from-[#B42318]/5 to-transparent"
                      )}
                    />
                    <p className="text-xs text-[#6B7280]">{t.summaryHint}</p>
                    {errors.summary && <p className="text-xs font-bold text-[#B42318]">{errors.summary}</p>}
                  </div>

                  <div className={cn("space-y-1.5", errors.description && "has-error")}>
                    <Label className="text-[13px] font-bold text-[#111827]">
                      {t.descLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                    </Label>
                    <RichTextEditor
                      value={formData.description || (lang === 'ar' ? DESCRIPTION_TEMPLATE_AR : DESCRIPTION_TEMPLATE_EN)}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      placeholder={t.descPlaceholder}
                      className={cn(
                        "min-h-[200px] rounded-xl border border-[#E5E7EB] focus-within:border-[#C8A566]/70",
                        errors.description && "border-[#B42318]/55"
                      )}
                    />
                    <div className="flex justify-between items-center gap-2 text-xs text-[#6B7280]">
                      <span>{t.descHint}</span>
                      <span>{countWordsFromHtml(formData.description)} words</span>
                    </div>
                    {errors.description && <p className="text-xs font-bold text-[#B42318]">{errors.description}</p>}
                  </div>

                  <div className={cn("space-y-1.5", errors.deliveryPlatform && "has-error")}>
                    <Label className="text-[13px] font-bold text-[#111827]">
                      {t.platformLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                    </Label>
                    <Select value={formData.deliveryPlatform} onValueChange={(v) => setFormData({ ...formData, deliveryPlatform: v })}>
                      <SelectTrigger className={cn(
                        "h-11 rounded-xl border-[#E5E7EB]",
                        errors.deliveryPlatform && "border-[#B42318]/55"
                      )}>
                        <SelectValue placeholder={t.platformPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{lang === 'en' ? p.label.en : p.label.ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#6B7280]">{t.platformHint}</p>
                    {errors.deliveryPlatform && <p className="text-xs font-bold text-[#B42318]">{errors.deliveryPlatform}</p>}
                  </div>
                </div>
              )}

              {/* Step 2: Requester Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={cn("space-y-1.5", errors.reporter && "has-error")}>
                      <Label className="text-[13px] font-bold text-[#111827]">
                        {t.requestedByLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                      </Label>
                      <Input
                        value={formData.reporter}
                        onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
                        placeholder={t.requestedByPlaceholder}
                        className={cn(
                          "h-11 rounded-xl border-[#E5E7EB]",
                          errors.reporter && "border-[#B42318]/55"
                        )}
                      />
                      {errors.reporter && <p className="text-xs font-bold text-[#B42318]">{errors.reporter}</p>}
                    </div>

                    <div className={cn("space-y-1.5", errors.email && "has-error")}>
                      <Label className="text-[13px] font-bold text-[#111827]">
                        {t.emailLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                      </Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={t.emailPlaceholder}
                        className={cn(
                          "h-11 rounded-xl border-[#E5E7EB]",
                          errors.email && "border-[#B42318]/55"
                        )}
                      />
                      {errors.email && <p className="text-xs font-bold text-[#B42318]">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={cn("space-y-1.5", errors.department && "has-error")}>
                      <Label className="text-[13px] font-bold text-[#111827]">
                        {t.deptLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                      </Label>
                      <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                        <SelectTrigger className={cn(
                          "h-11 rounded-xl border-[#E5E7EB]",
                          errors.department && "border-[#B42318]/55"
                        )}>
                          <SelectValue placeholder={t.deptPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d.en} value={d.en}>{lang === 'en' ? d.en : d.ar}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.department && <p className="text-xs font-bold text-[#B42318]">{errors.department}</p>}
                    </div>

                    <div className={cn("space-y-1.5", errors.businessOwner && "has-error")}>
                      <Label className="text-[13px] font-bold text-[#111827]">
                        {t.ownerLabel}<span className="text-[#B42318] ml-1">{t.required}</span>
                      </Label>
                      <Input
                        value={formData.businessOwner}
                        onChange={(e) => setFormData({ ...formData, businessOwner: e.target.value })}
                        placeholder={t.ownerPlaceholder}
                        className={cn(
                          "h-11 rounded-xl border-[#E5E7EB]",
                          errors.businessOwner && "border-[#B42318]/55"
                        )}
                      />
                      {errors.businessOwner && <p className="text-xs font-bold text-[#B42318]">{errors.businessOwner}</p>}
                    </div>
                  </div>

                  <p className="text-xs text-[#6B7280]">{t.requesterHint}</p>
                </div>
              )}

              {/* Step 3: Attachments */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <Label className="text-[13px] font-bold text-[#111827]">{t.attachLabel}</Label>
                  <div className="border-2 border-dashed border-[#111827]/15 rounded-2xl p-3.5 bg-gradient-to-b from-[#C8A566]/5 to-transparent flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-[13px]">{t.attachDrop}</strong>
                      <small className="block text-[#6B7280] mt-1 text-xs">{t.attachHint}</small>
                    </div>
                    <div>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="rounded-xl font-bold text-[13px]"
                      >
                        {t.browseFiles}
                      </Button>
                    </div>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                          <span className="truncate">{file.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#6B7280]">{Math.round(file.size / 1024)} KB</span>
                            <button onClick={() => removeAttachment(index)} className="text-[#B42318] hover:bg-[#B42318]/10 p-1 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-[13px] text-[#6B7280] leading-snug">{t.reviewHint}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                      <strong>{t.summaryLabel}:</strong>
                      <span className="text-[#6B7280] truncate">{formData.summary || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                      <strong>{t.platformLabel}:</strong>
                      <span className="text-[#6B7280]">{formData.deliveryPlatform || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                      <strong>{t.requestedByLabel}:</strong>
                      <span className="text-[#6B7280]">{formData.reporter || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                      <strong>{t.emailLabel}:</strong>
                      <span className="text-[#6B7280]">{formData.email || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                      <strong>{t.deptLabel}:</strong>
                      <span className="text-[#6B7280]">{formData.department || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                      <strong>{t.ownerLabel}:</strong>
                      <span className="text-[#6B7280]">{formData.businessOwner || '—'}</span>
                    </div>
                    {attachments.length > 0 && (
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[#E5E7EB] rounded-xl bg-white text-[13px]">
                        <strong>{t.attachLabel}:</strong>
                        <span className="text-[#6B7280]">{attachments.length} file(s)</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#6B7280] mt-3">{t.privacyHint}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-3 p-3.5 border-t border-[#E5E7EB] bg-white rounded-b-2xl sticky bottom-0">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="text-[#6B7280] font-semibold"
              >
                {currentStep === 0 ? t.backToLogin : t.back}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:flex rounded-xl font-bold"
                >
                  {t.saveDraft}
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-[#C8A566] hover:bg-[#b8955a] text-[#101010] font-bold rounded-xl"
                >
                  {isSubmitting ? 'Submitting...' : currentStep === 3 ? t.submit : t.continue}
                </Button>
              </div>
            </div>
          </main>

          {/* Right: Vertical Stepper */}
          <aside className="hidden lg:block w-[260px] shrink-0">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_6px_16px_rgba(15,23,42,0.06)] p-5 sticky top-6">
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">{t.progressTitle || 'Progress'}</h3>
              <div className="space-y-1">
                {steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => idx <= currentStep && setCurrentStep(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left cursor-pointer select-none transition-all",
                      idx === currentStep 
                        ? "bg-[#C8A566]/10 border border-[#C8A566]" 
                        : idx < currentStep
                          ? "bg-[#067647]/5 border border-transparent"
                          : "bg-transparent border border-transparent hover:bg-gray-50"
                    )}
                  >
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold shrink-0",
                      idx === currentStep 
                        ? "border-[#C8A566] bg-[#C8A566] text-white"
                        : idx < currentStep
                          ? "border-[#067647] bg-[#067647] text-white"
                          : "border-[#D1D5DB] text-[#6B7280] bg-white"
                    )}>
                      {idx < currentStep ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span className={cn(
                      "text-sm",
                      idx === currentStep ? "text-[#1A1A1A] font-semibold" : "text-[#6B7280]",
                      idx < currentStep && "text-[#067647] font-medium"
                    )}>
                      {step}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
