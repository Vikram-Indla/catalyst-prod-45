/**
 * AI-Enhanced Defect Report Modal
 * Features: Smart description generator, duplicate detection, severity suggestions, quality score
 * Enterprise UX: Spacious layout with section headers and visual hierarchy
 */

import { useState, useEffect, useMemo } from "react";
import { 
  Bug, 
  Upload, 
  Ban, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Minus,
  ChevronRight,
  Sparkles,
  Loader2,
  ExternalLink,
  Star,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { releaseOptions, testCaseOptions, defectsData } from "@/data/defectsData";
import { UserPicker } from "@/components/ui/user-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DefectFormData {
  title: string;
  severity: string;
  priority: string;
  defectType: string;
  module: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  url: string;
  environment: string;
  releaseId: string;
  browser: string;
  os: string;
  device: string;
  linkedTestId: string;
  assigneeId: string;
  howDetected: string;
  description: string;
}

interface AISuggestions {
  severity: string;
  module: string;
  confidence: number;
}

interface ReportDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: DefectFormData;
  setFormData: (data: DefectFormData) => void;
  onSubmit: () => void;
}

// Smart content generator based on title keywords - Intelligent AI-powered
const generateSmartContent = (title: string) => {
  const titleLower = title.toLowerCase();
  
  // Extract key patterns from title
  const extractedTerms = {
    hasError: /error|fail|crash|exception|broken|not.?working/i.test(title),
    hasLogin: /login|auth|sign.?in|password|session|credential|logout/i.test(title),
    hasPayment: /payment|checkout|cart|order|transaction|billing|invoice/i.test(title),
    hasButton: /button|click|tap|press|unresponsive/i.test(title),
    hasDisplay: /display|show|render|visible|appear|layout|ui|css|style|hidden|missing/i.test(title),
    hasData: /data|export|import|csv|report|missing|incorrect|wrong/i.test(title),
    hasPerformance: /slow|timeout|loading|lag|freeze|performance|hang/i.test(title),
    hasTab: /tab|panel|section|page|screen/i.test(title),
    hasPermit: /permit|license|approval|certificate/i.test(title),
    hasAPI: /api|endpoint|request|response|500|404|403|401/i.test(title),
    hasForm: /form|input|field|submit|validation/i.test(title),
    hasSearch: /search|filter|query|find/i.test(title),
    hasUpload: /upload|file|attachment|document|image/i.test(title),
    hasNotification: /notification|alert|email|message|sms/i.test(title),
  };
  
  // Extract specific terms from title for personalization
  const words = title.split(/[\s\-]+/).filter(w => w.length > 3);
  const specificArea = words.slice(0, 4).join(' ');
  
  let steps = '';
  let expected = '';
  let actual = '';
  let severity = 'major';
  let module = 'other';
  
  // Generate based on detected patterns - ordered by priority
  if (extractedTerms.hasLogin) {
    steps = `1. Navigate to the login page\n2. Enter valid user credentials\n3. Click the Sign In button\n4. Observe the system response`;
    expected = 'User should be authenticated successfully and redirected to the dashboard';
    actual = 'Describe the error message or unexpected behavior observed';
    severity = 'critical';
    module = 'authentication';
  } else if (extractedTerms.hasPayment) {
    steps = `1. Add item(s) to cart\n2. Proceed to checkout\n3. Enter payment information\n4. Click Submit/Pay button\n5. Observe the transaction result`;
    expected = 'Payment should be processed successfully with confirmation displayed';
    actual = 'Describe the payment failure, error, or unexpected behavior';
    severity = 'blocker';
    module = 'payments';
  } else if (extractedTerms.hasAPI) {
    steps = `1. Navigate to ${specificArea || 'the feature'} that triggers the API call\n2. Perform the action that initiates the request\n3. Observe the network request/response\n4. Note any error codes or messages`;
    expected = 'API should return expected data with 200 status code';
    actual = 'Describe the API error - status code, error message, timeout, etc.';
    severity = 'critical';
    module = 'api';
  } else if (extractedTerms.hasTab || extractedTerms.hasPermit) {
    steps = `1. Navigate to ${specificArea || 'the affected module'}\n2. Click on the tab/section mentioned\n3. Wait for content to load\n4. Observe any error messages or unexpected behavior`;
    expected = 'Tab should load successfully displaying the relevant content without errors';
    actual = 'Describe the specific error message or unexpected behavior encountered';
    severity = 'major';
    module = 'dashboard';
  } else if (extractedTerms.hasError) {
    steps = `1. Navigate to ${specificArea || 'the affected area'}\n2. Perform the action that triggers the error\n3. Observe the error displayed`;
    expected = 'The action should complete successfully without errors';
    actual = 'Describe the exact error message and when it appears';
    severity = 'major';
    module = 'other';
  } else if (extractedTerms.hasButton) {
    steps = `1. Navigate to the page containing the button\n2. Locate the ${specificArea || 'affected'} button\n3. Click the button\n4. Observe the response`;
    expected = 'Button should respond with visual feedback and trigger the expected action';
    actual = 'Describe what happens (no response, wrong action, error, etc.)';
    severity = 'major';
    module = 'dashboard';
  } else if (extractedTerms.hasDisplay) {
    steps = `1. Navigate to ${specificArea || 'the affected page'}\n2. Locate the UI element mentioned\n3. Observe the display/rendering`;
    expected = 'Content should display correctly with proper formatting and layout';
    actual = 'Describe what is incorrectly displayed or missing';
    severity = 'minor';
    module = 'dashboard';
  } else if (extractedTerms.hasData) {
    steps = `1. Navigate to the data/report section\n2. Apply any relevant filters\n3. Trigger the export/view action\n4. Review the output`;
    expected = 'Data should be complete and accurately formatted';
    actual = 'Describe what data is missing, incorrect, or malformed';
    severity = 'major';
    module = 'reports';
  } else if (extractedTerms.hasPerformance) {
    steps = `1. Navigate to ${specificArea || 'the affected area'}\n2. Perform the action that causes slowness\n3. Measure or observe the response time`;
    expected = 'Action should complete within acceptable time (< 3 seconds)';
    actual = 'Describe the delay duration and any timeout errors';
    severity = 'major';
    module = 'performance';
  } else if (extractedTerms.hasForm) {
    steps = `1. Navigate to ${specificArea || 'the form'}\n2. Fill in the required fields\n3. Submit the form\n4. Observe the result`;
    expected = 'Form should validate inputs and submit successfully';
    actual = 'Describe the validation error or submission failure';
    severity = 'major';
    module = 'dashboard';
  } else if (extractedTerms.hasSearch) {
    steps = `1. Navigate to ${specificArea || 'the search feature'}\n2. Enter search criteria\n3. Execute the search\n4. Review the results`;
    expected = 'Search should return relevant results matching the criteria';
    actual = 'Describe what is wrong with the search results';
    severity = 'major';
    module = 'dashboard';
  } else if (extractedTerms.hasUpload) {
    steps = `1. Navigate to ${specificArea || 'the upload feature'}\n2. Select file(s) to upload\n3. Initiate the upload\n4. Observe the upload progress and result`;
    expected = 'File should upload successfully with confirmation displayed';
    actual = 'Describe the upload failure or error encountered';
    severity = 'major';
    module = 'other';
  } else if (extractedTerms.hasNotification) {
    steps = `1. Trigger the action that should send notification\n2. Wait for notification delivery\n3. Check the notification content/status`;
    expected = 'Notification should be sent/displayed correctly with proper content';
    actual = 'Describe what is wrong with the notification';
    severity = 'major';
    module = 'notifications';
  } else {
    // Default fallback - still use title context, NO placeholders
    steps = `1. Navigate to ${specificArea || 'the affected area'}\n2. Perform the action related to: ${title}\n3. Observe the result`;
    expected = 'The feature should work as designed without errors';
    actual = 'Describe the specific issue encountered';
    severity = 'major';
    module = 'other';
  }
  
  // Map severity to priority
  const priorityMap: Record<string, string> = {
    blocker: 'P1',
    critical: 'P1',
    major: 'P2',
    minor: 'P3',
    trivial: 'P4'
  };

  // Calculate confidence based on pattern matches
  const matchCount = Object.values(extractedTerms).filter(Boolean).length;
  const confidence = matchCount >= 2 ? 0.85 : matchCount === 1 ? 0.75 : 0.6;

  return {
    steps,
    expected,
    actual,
    suggestedSeverity: severity,
    suggestedPriority: priorityMap[severity] || 'P3',
    suggestedModule: module,
    confidence
  };
};

// Find potential duplicate defects
const findDuplicates = (title: string) => {
  if (title.length < 10) return [];
  
  const keywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  return defectsData
    .filter(d => {
      const titleLower = d.title.toLowerCase();
      const matchCount = keywords.filter(kw => titleLower.includes(kw)).length;
      return matchCount >= 2 || (keywords.length <= 2 && matchCount >= 1);
    })
    .slice(0, 3);
};

// Status badge component - V5 compliant
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    resolved: 'bg-teal-50 text-teal-700',
    closed: 'bg-muted text-muted-foreground',
    reopened: 'bg-amber-50 text-amber-700'
  };
  
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", config[status] || config.open)}>
      {status.replace('_', ' ')}
    </span>
  );
};

// Section header component for visual hierarchy - V5 compliant
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
    {children}
  </h3>
);

// Section divider component - V5 compliant
const SectionDivider = () => (
  <div className="border-t border-border" />
);

export function ReportDefectModal({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData, 
  onSubmit 
}: ReportDefectModalProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [potentialDuplicates, setPotentialDuplicates] = useState<typeof defectsData>([]);
  const [isSearchingDuplicates, setIsSearchingDuplicates] = useState(false);
  
  const updateField = (field: keyof DefectFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };
  
  // Debounced duplicate detection
  useEffect(() => {
    if (formData.title.length < 15) {
      setPotentialDuplicates([]);
      return;
    }
    
    setIsSearchingDuplicates(true);
    const timer = setTimeout(() => {
      const duplicates = findDuplicates(formData.title);
      setPotentialDuplicates(duplicates);
      setIsSearchingDuplicates(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.title]);
  
  // Quality score calculation - dynamic based on form completeness
  const qualityScore = useMemo(() => {
    let score = 0;
    if (formData.title?.length >= 20) score += 1;
    if (formData.stepsToReproduce?.split('\n').filter(l => l.trim()).length >= 3) score += 1;
    if (formData.expectedResult?.length >= 20) score += 1;
    if (formData.actualResult?.length >= 20) score += 1;
    if (formData.severity) score += 1;
    return score;
  }, [formData]);

  // Quality improvement tips - dynamic based on missing fields
  const qualityTips = useMemo(() => {
    const tips: string[] = [];
    if (formData.title.length < 20) tips.push('Add more detail to title (20+ chars)');
    if (formData.stepsToReproduce.split('\n').filter(l => l.trim()).length < 3) tips.push('Add more reproduction steps (3+)');
    if (formData.expectedResult.length < 20) tips.push('Describe expected behavior more clearly');
    if (formData.actualResult.length < 20) tips.push('Describe actual behavior more clearly');
    if (!formData.severity) tips.push('Select a severity level');
    return tips;
  }, [formData]);
  
  // AI description generation
  const handleGenerateDescription = async () => {
    if (formData.title.length < 10) return;
    
    setIsGenerating(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const generated = generateSmartContent(formData.title);
    
    setFormData({
      ...formData,
      stepsToReproduce: generated.steps,
      expectedResult: generated.expected,
      actualResult: generated.actual,
      severity: generated.suggestedSeverity,
      priority: generated.suggestedPriority,
      module: generated.suggestedModule
    });
    
    setAiSuggestions({
      severity: generated.suggestedSeverity,
      module: generated.suggestedModule,
      confidence: generated.confidence
    });
    
    setIsGenerating(false);
    toast.success('AI generated content. Review and adjust as needed.');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-card">
        
        {/* FIXED HEADER - More spacious */}
        <div className="shrink-0 bg-muted px-6 py-5 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bug className="w-5 h-5 text-red-600" />
              Report Defect
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                <Sparkles className="w-3 h-3 mr-1 text-primary" />
                AI-Assisted
              </Badge>
            </DialogTitle>
            <DialogDescription className="mt-1">
              Fields marked <span className="text-red-500">*</span> are required.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* SCROLLABLE CONTENT - More spacious */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            
            {/* SECTION: Basic Information */}
            <div className="space-y-4">
              <SectionHeader>Basic Information</SectionHeader>
              
              {/* Title with AI Button - Full Width */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Title <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Input 
                    placeholder="Brief, descriptive summary of the issue..."
                    className="pr-28 h-11 text-base"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-sm text-primary hover:text-primary/80"
                    onClick={handleGenerateDescription}
                    disabled={formData.title.length < 10 || isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    AI Assist
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Type 10+ characters, then click AI Assist to auto-generate content
                </p>
              </div>
              
              {/* Duplicate Detection Banner */}
              {isSearchingDuplicates && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking for similar defects...
                </div>
              )}
              
              {!isSearchingDuplicates && potentialDuplicates.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Potential duplicates found ({potentialDuplicates.length})
                  </div>
                  <div className="space-y-2">
                    {potentialDuplicates.map(d => (
                      <div 
                        key={d.id}
                        className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-primary shrink-0">{d.id}</span>
                          <span className="text-foreground truncate">{d.title}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => window.open(`/releases/defects/${d.id}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Consider adding a comment to an existing defect instead of creating a duplicate.
                  </p>
                </div>
              )}
              
              {/* Severity & Priority Row - Taller inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.severity} onValueChange={(v) => updateField('severity', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="How serious is this issue?" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="blocker">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-600" />
                          <span>Blocker — System unusable</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-400" />
                          <span>Critical — Major function broken</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="major">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500" />
                          <span>Major — Function impaired</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="minor">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          <span>Minor — Cosmetic issue</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="trivial">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-400" />
                          <span>Trivial — Enhancement</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* AI Severity Suggestion */}
                  {aiSuggestions?.severity && formData.severity !== aiSuggestions.severity && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">AI suggests:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => updateField('severity', aiSuggestions.severity)}
                      >
                        <Sparkles className="w-3 h-3 text-primary" />
                        {aiSuggestions.severity}
                        <span className="text-muted-foreground">
                          ({Math.round(aiSuggestions.confidence * 100)}%)
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="How urgent?" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="P1">P1 — Urgent (Fix immediately)</SelectItem>
                      <SelectItem value="P2">P2 — High (Fix this sprint)</SelectItem>
                      <SelectItem value="P3">P3 — Medium (Fix soon)</SelectItem>
                      <SelectItem value="P4">P4 — Low (When possible)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* DIVIDER */}
            <SectionDivider />
            
            {/* SECTION: Reproduction Details */}
            <div className="space-y-4">
              <SectionHeader>Reproduction Details</SectionHeader>
              
              {/* Steps to Reproduce - LARGE */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Steps to Reproduce <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder={"1. Navigate to the affected page\n2. Click on the specific element\n3. Enter the test data\n4. Observe the result..."}
                  value={formData.stepsToReproduce}
                  onChange={(e) => updateField('stepsToReproduce', e.target.value)}
                  className="mt-1.5 min-h-[140px] font-mono text-sm leading-relaxed resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Be specific. Number each step clearly.
                </p>
              </div>
              
              {/* Expected Result - FULL WIDTH */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Expected Result <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="Describe what should have happened when following the steps above..."
                  value={formData.expectedResult}
                  onChange={(e) => updateField('expectedResult', e.target.value)}
                  className="mt-1.5 min-h-[100px] text-sm leading-relaxed resize-y"
                />
              </div>
              
              {/* Actual Result - FULL WIDTH */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Actual Result <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="Describe what actually happened. Include any error messages..."
                  value={formData.actualResult}
                  onChange={(e) => updateField('actualResult', e.target.value)}
                  className="mt-1.5 min-h-[100px] text-sm leading-relaxed resize-y"
                />
              </div>
            </div>
            
            {/* DIVIDER */}
            <SectionDivider />
            
            {/* SECTION: Assignment & Tracking */}
            <div className="space-y-4">
              <SectionHeader>Assignment & Tracking</SectionHeader>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Release <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.releaseId} onValueChange={(v) => updateField('releaseId', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Select target release" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {releaseOptions.filter(r => r.value !== 'all').map(release => (
                        <SelectItem key={release.value} value={release.value}>
                          {release.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Assign To</label>
                  <div className="mt-1.5">
                    <UserPicker
                      value={formData.assigneeId || null}
                      onChange={(val) => updateField('assigneeId', (val as string) || '')}
                      placeholder="Unassigned"
                      showUnassigned={true}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* DIVIDER */}
            <SectionDivider />
            
            {/* SECTION: Attachments - LARGE drop zone */}
            <div className="space-y-4">
              <SectionHeader>Attachments</SectionHeader>
              
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop screenshots, videos, or logs
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  or <span className="text-primary font-medium">browse files</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Screenshots with annotations help developers understand the issue faster
              </p>
            </div>
            
            {/* COLLAPSIBLE: Additional Details */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2">
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  isAdvancedOpen && "rotate-90"
                )} />
                <span className="font-medium">Additional Details</span>
                <span className="text-muted-foreground/70">(optional)</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                
                {/* Environment & Module */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Environment</label>
                    <Select value={formData.environment} onValueChange={(v) => updateField('environment', v)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="Where was this found?" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="qa">QA</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Module</label>
                    <Select value={formData.module} onValueChange={(v) => updateField('module', v)}>
                      <SelectTrigger className={cn(
                        "mt-1.5 h-11",
                        aiSuggestions?.module && !formData.module && "border-primary/50"
                      )}>
                        <SelectValue placeholder={
                          aiSuggestions?.module && !formData.module
                            ? `Suggested: ${aiSuggestions.module}`
                            : "Which module?"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {aiSuggestions?.module && (
                          <SelectItem value={aiSuggestions.module}>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-primary" />
                              {aiSuggestions.module} (AI suggested)
                            </div>
                          </SelectItem>
                        )}
                        <SelectItem value="authentication">Authentication</SelectItem>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="reports">Reports</SelectItem>
                        <SelectItem value="user-management">User Management</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Defect Type & How Detected */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Defect Type</label>
                    <Select value={formData.defectType} onValueChange={(v) => updateField('defectType', v)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="What kind?" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="ui">UI/Visual</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="crash">Crash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">How Detected</label>
                    <Select value={formData.howDetected} onValueChange={(v) => updateField('howDetected', v)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="How found?" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="manual-test">Manual Testing</SelectItem>
                        <SelectItem value="automated-test">Automated Test</SelectItem>
                        <SelectItem value="regression">Regression</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="customer">Customer Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Linked Test Case */}
                <div>
                  <label className="text-sm font-medium text-foreground">Linked Test Case</label>
                  <Select value={formData.linkedTestId} onValueChange={(v) => updateField('linkedTestId', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Link to a test case (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {testCaseOptions.map(tc => (
                        <SelectItem key={tc.value || 'none'} value={tc.value || 'none'}>
                          {tc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* URL */}
                <div>
                  <label className="text-sm font-medium text-foreground">URL</label>
                  <Input 
                    placeholder="https://app.catalyst.gov.sa/..."
                    value={formData.url}
                    onChange={(e) => updateField('url', e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
                
              </CollapsibleContent>
            </Collapsible>
            
          </div>
        </div>
        
        {/* FIXED FOOTER with Quality Score - More spacious */}
        <div className="shrink-0 bg-muted border-t border-border px-6 py-4 flex items-center justify-between">
          {/* Quality Score */}
          <TooltipProvider>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Quality:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star}
                      className={cn(
                        "w-5 h-5",
                        star <= qualityScore 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>
              </div>
              
              {qualityTips.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2 gap-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Improve
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-popover">
                    <p className="font-medium mb-1 text-sm">Tips to improve:</p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {qualityTips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} className="h-10 px-4">
              Cancel
            </Button>
            <Button 
              onClick={onSubmit}
              disabled={qualityScore < 2}
              className="h-10 px-6"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Defect
            </Button>
          </div>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
