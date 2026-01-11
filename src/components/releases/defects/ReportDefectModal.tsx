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
import { releaseOptions, testCaseOptions, assigneeOptions, defectsData } from "@/data/defectsData";
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

// Smart content generator based on title keywords
const generateSmartContent = (title: string) => {
  const titleLower = title.toLowerCase();
  
  const isLoginIssue = /login|auth|sign.?in|password|session|logout/i.test(title);
  const isUIIssue = /button|display|layout|css|style|render|show|appear|visible|hidden|missing/i.test(title);
  const isPerformance = /slow|timeout|hang|freeze|lag|loading|performance/i.test(title);
  const isCrash = /crash|error|exception|fail|broken|not.?working/i.test(title);
  const isPayment = /payment|checkout|cart|order|transaction|invoice/i.test(title);
  const isData = /data|missing|incorrect|wrong|csv|export|import/i.test(title);
  const isAPI = /api|endpoint|request|response|500|404|403|401/i.test(title);
  
  let steps = '';
  let expected = '';
  let actual = '';
  let severity = 'major';
  let module = 'other';
  
  if (isLoginIssue) {
    steps = `1. Navigate to the login page\n2. Enter valid credentials (username/password)\n3. Click the "Sign In" button\n4. Observe the result`;
    expected = 'User should be authenticated and redirected to the dashboard';
    actual = '[Describe what actually happened - error message, redirect failure, etc.]';
    severity = 'critical';
    module = 'authentication';
  } else if (isPayment) {
    steps = `1. Add items to cart\n2. Proceed to checkout\n3. Enter payment details\n4. Click "Complete Payment"\n5. Observe the result`;
    expected = 'Payment should process successfully with confirmation displayed';
    actual = '[Describe the payment failure - timeout, error code, etc.]';
    severity = 'blocker';
    module = 'payments';
  } else if (isPerformance) {
    steps = `1. Navigate to the affected page/feature\n2. Perform the action that triggers slowness\n3. Measure the response time\n4. Note any timeout errors`;
    expected = 'Action should complete within acceptable time (<3 seconds)';
    actual = '[Specify actual load time, timeout duration, or error]';
    severity = 'major';
    module = 'performance';
  } else if (isAPI) {
    steps = `1. Trigger the API call (describe how)\n2. Observe the network request\n3. Check the response status and body\n4. Note any error messages`;
    expected = 'API should return expected data with 200 status';
    actual = '[Describe the API error - status code, error message, etc.]';
    severity = 'critical';
    module = 'api';
  } else if (isUIIssue) {
    steps = `1. Navigate to the affected page\n2. Locate the UI element mentioned\n3. Interact with the element (if applicable)\n4. Observe the visual result`;
    expected = 'UI element should display correctly and respond to interaction';
    actual = '[Describe the visual bug - misalignment, missing element, wrong color, etc.]';
    severity = 'minor';
    module = 'dashboard';
  } else if (isData) {
    steps = `1. Navigate to the data view/export\n2. Apply filters if applicable\n3. Trigger the data operation\n4. Verify the output`;
    expected = 'Data should be complete and correctly formatted';
    actual = '[Describe what data is wrong or missing]';
    severity = 'major';
    module = 'reports';
  } else {
    steps = `1. Navigate to the affected area\n2. [Describe the action taken]\n3. [Describe any inputs provided]\n4. Observe the result`;
    expected = '[What should have happened]';
    actual = '[What actually happened]';
  }
  
  // Map severity to priority
  const priorityMap: Record<string, string> = {
    blocker: 'P1',
    critical: 'P1',
    major: 'P2',
    minor: 'P3',
    trivial: 'P4'
  };

  return {
    steps,
    expected,
    actual,
    suggestedSeverity: severity,
    suggestedPriority: priorityMap[severity] || 'P3',
    suggestedModule: module,
    confidence: isLoginIssue || isPayment || isAPI ? 0.85 : isPerformance || isData ? 0.75 : 0.6
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

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    reopened: 'bg-orange-100 text-orange-700'
  };
  
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", config[status] || config.open)}>
      {status.replace('_', ' ')}
    </span>
  );
};

// Section header component for visual hierarchy
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
    {children}
  </h3>
);

// Section divider component
const SectionDivider = () => (
  <div className="border-t border-gray-200" />
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-white">
        
        {/* FIXED HEADER - More spacious */}
        <div className="shrink-0 bg-gray-50 px-6 py-5 border-b">
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
                <label className="text-sm font-medium text-gray-700">
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
                          <span className="font-mono text-blue-600 shrink-0">{d.id}</span>
                          <span className="text-gray-700 truncate">{d.title}</span>
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
                  <label className="text-sm font-medium text-gray-700">
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.severity} onValueChange={(v) => updateField('severity', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="How serious is this issue?" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="How urgent?" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
                <label className="text-sm font-medium text-gray-700">
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
                <label className="text-sm font-medium text-gray-700">
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
                <label className="text-sm font-medium text-gray-700">
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
                  <label className="text-sm font-medium text-gray-700">
                    Release <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.releaseId} onValueChange={(v) => updateField('releaseId', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Select target release" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {releaseOptions.filter(r => r.value !== 'all').map(release => (
                        <SelectItem key={release.value} value={release.value}>
                          {release.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Assign To</label>
                  <Select value={formData.assigneeId} onValueChange={(v) => updateField('assigneeId', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {assigneeOptions.filter(a => a.value !== 'all').map(assignee => (
                        <SelectItem key={assignee.value || 'unassigned'} value={assignee.value || 'unassigned'}>
                          {assignee.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* DIVIDER */}
            <SectionDivider />
            
            {/* SECTION: Attachments - LARGE drop zone */}
            <div className="space-y-4">
              <SectionHeader>Attachments</SectionHeader>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">
                  Drag & drop screenshots, videos, or logs
                </p>
                <p className="text-xs text-gray-400 mt-1">
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
                <span className="text-gray-400">(optional)</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                
                {/* Environment & Module */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Environment</label>
                    <Select value={formData.environment} onValueChange={(v) => updateField('environment', v)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="Where was this found?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="qa">QA</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Module</label>
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
                      <SelectContent className="bg-white">
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
                    <label className="text-sm font-medium text-gray-700">Defect Type</label>
                    <Select value={formData.defectType} onValueChange={(v) => updateField('defectType', v)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="What kind?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
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
                    <label className="text-sm font-medium text-gray-700">How Detected</label>
                    <Select value={formData.howDetected} onValueChange={(v) => updateField('howDetected', v)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="How found?" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
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
                  <label className="text-sm font-medium text-gray-700">Linked Test Case</label>
                  <Select value={formData.linkedTestId} onValueChange={(v) => updateField('linkedTestId', v)}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Link to a test case (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
                  <label className="text-sm font-medium text-gray-700">URL</label>
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
        <div className="shrink-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
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
                          : 'text-gray-300'
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
                  <TooltipContent className="max-w-xs bg-white">
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
              className="bg-red-600 hover:bg-red-700 text-white h-10 px-6"
              onClick={onSubmit}
              disabled={qualityScore < 2}
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
