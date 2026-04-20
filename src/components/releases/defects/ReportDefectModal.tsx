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
import { Lozenge } from "@/components/ads";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircle } from "lucide-react";
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

// ============================================================================
// SEMANTIC AI TITLE PARSER - Intelligent content generation
// ============================================================================

interface ParsedTitle {
  action: string;        // What user is trying to do
  object: string;        // What feature/module
  context: string;       // Where/when/how
  condition: string;     // Special circumstances
  issueType: 'cannot' | 'error' | 'slow' | 'wrong' | 'missing' | 'crash' | 'other';
}

/**
 * Semantic title parser - extracts meaning from defect titles
 * Handles patterns like:
 * - "User cannot start Environmental Permit from RCJY without Site Allocation"
 * - "Login page shows error after entering credentials"
 * - "Dashboard loading slowly on mobile devices"
 */
function parseDefectTitle(title: string): ParsedTitle {
  const titleLower = title.toLowerCase();
  
  // Detect issue type from keywords
  let issueType: ParsedTitle['issueType'] = 'other';
  if (/cannot|can't|unable|doesn't|does not|won't|will not|fails? to|not able/i.test(titleLower)) {
    issueType = 'cannot';
  } else if (/error|exception|fail|broke|broken|invalid/i.test(titleLower)) {
    issueType = 'error';
  } else if (/slow|timeout|delay|hang|freeze|loading|performance|lag/i.test(titleLower)) {
    issueType = 'slow';
  } else if (/wrong|incorrect|bad|unexpected|mismatch|not correct/i.test(titleLower)) {
    issueType = 'wrong';
  } else if (/missing|not showing|blank|empty|disappear|not visible|hidden/i.test(titleLower)) {
    issueType = 'missing';
  } else if (/crash|unresponsive|stopped|killed|terminated/i.test(titleLower)) {
    issueType = 'crash';
  }
  
  // Extract action (verb phrase after cannot/unable/fails to)
  let action = 'perform the action';
  const actionPatterns = [
    /cannot\s+(\w+(?:\s+\w+)?)/i,
    /can't\s+(\w+(?:\s+\w+)?)/i,
    /unable\s+to\s+(\w+(?:\s+\w+)?)/i,
    /fails?\s+to\s+(\w+(?:\s+\w+)?)/i,
    /not\s+able\s+to\s+(\w+(?:\s+\w+)?)/i,
    /won't\s+(\w+(?:\s+\w+)?)/i,
    /doesn't\s+(\w+(?:\s+\w+)?)/i,
  ];
  
  for (const pattern of actionPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      action = match[1].trim();
      break;
    }
  }
  
  // Extract object (the feature/module - usually capitalized words or after action verb)
  let object = 'the affected feature';
  
  // Try to find object after action verbs
  const objectPatterns = [
    /(?:start|open|access|view|edit|create|submit|save|load|use|see|find|get|download|upload|export|import|login|sign|enter|click|select|navigate)\s+(?:the\s+)?(?:to\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+from|\s+in|\s+on|\s+without|\s+with|\s+after|\s+before|$)/i,
    /(?:the\s+)([A-Z][a-zA-Z\s]+?)(?:\s+(?:is|are|was|were|shows?|displays?|appears?|doesn't|does not|fails?))/i,
  ];
  
  for (const pattern of objectPatterns) {
    const match = title.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      object = match[1].trim();
      break;
    }
  }
  
  // Fallback: find capitalized multi-word phrases (likely feature names)
  if (object === 'the affected feature') {
    const capitalizedMatch = title.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
    if (capitalizedMatch) {
      object = capitalizedMatch[1];
    } else {
      // Try single capitalized word that's not at start
      const words = title.split(/\s+/);
      const capitalWord = words.slice(1).find(w => /^[A-Z][a-z]+$/.test(w) && w.length > 3);
      if (capitalWord) {
        object = capitalWord;
      }
    }
  }
  
  // Extract context (from X, in Y, on Z, at W)
  let context = '';
  const contextMatch = title.match(/(?:from|in|on|at)\s+(?:the\s+)?([A-Z][A-Za-z0-9\s]+?)(?:\s+without|\s+with|\s+when|\s+after|\s+before|\s+if|$)/i);
  if (contextMatch && contextMatch[1]) {
    context = contextMatch[1].trim();
  }
  
  // Extract condition (without X, when Y, if Z, after W)
  let condition = '';
  const conditionMatch = title.match(/(?:without|when|if|unless|before|after|during)\s+(.+?)$/i);
  if (conditionMatch && conditionMatch[1]) {
    condition = conditionMatch[1].trim();
  }
  
  return { action, object, context, condition, issueType };
}

/**
 * Generate smart content based on parsed title semantics
 */
function generateSmartContent(title: string) {
  const parsed = parseDefectTitle(title);
  const { action, object, context, condition, issueType } = parsed;
  
  let steps = '';
  let expected = '';
  let actual = '';
  let severity = 'major';
  let priority = 'P2';
  let module = 'other';
  
  // Build contextual location step
  const locationStep = context 
    ? `Navigate to ${object}${context ? ` (from/in ${context})` : ''}`
    : `Navigate to the ${object} module/section`;
  
  // Build condition note if present
  const conditionNote = condition
    ? `Note the precondition: "${condition}"`
    : '';
  
  // Clean the object name to avoid duplicates
  const cleanObject = object.trim();
  
  switch (issueType) {
    case 'cannot':
      steps = [
        `1. Log in to the system with appropriate permissions`,
        `2. ${locationStep}`,
        `3. Attempt to ${action} the ${cleanObject}`,
        conditionNote ? `4. ${conditionNote}` : null,
        `${conditionNote ? '5' : '4'}. Observe that the action cannot be completed`
      ].filter(Boolean).join('\n');
      
      expected = condition
        ? `User should be able to ${action} the ${cleanObject}, or receive a clear message explaining why "${condition}" prevents this action.`
        : `User should be able to ${action} the ${cleanObject} successfully.`;
      
      actual = `[Describe: Is there an error message? Is the button/option disabled? Does nothing happen when clicked? What exactly prevents the action?]`;
      severity = 'major';
      priority = 'P2';
      module = 'dashboard';
      break;
      
    case 'error':
      steps = [
        `1. Log in to the system`,
        `2. ${locationStep}`,
        `3. Perform the action that triggers the error`,
        conditionNote ? `4. ${conditionNote}` : null,
        `${conditionNote ? '5' : '4'}. Observe the error message/behavior`
      ].filter(Boolean).join('\n');
      
      expected = `The action should complete successfully without errors.`;
      actual = `[Copy the EXACT error message. Note when it appears and what happens after dismissing it.]`;
      severity = 'critical';
      priority = 'P1';
      module = 'other';
      break;
      
    case 'slow':
      steps = [
        `1. Log in to the system`,
        `2. ${locationStep}`,
        `3. Perform the action and start timing`,
        `4. Note the response time or timeout behavior`
      ].join('\n');
      
      expected = `Action should complete within 3 seconds under normal network conditions.`;
      actual = `[State the actual time taken. Note if it times out, freezes, or shows loading indefinitely.]`;
      severity = 'major';
      priority = 'P2';
      module = 'performance';
      break;
      
    case 'wrong':
      steps = [
        `1. Log in to the system`,
        `2. ${locationStep}`,
        `3. Observe the ${cleanObject} display/behavior`,
        conditionNote ? `4. ${conditionNote}` : null,
        `${conditionNote ? '5' : '4'}. Compare with expected behavior`
      ].filter(Boolean).join('\n');
      
      expected = `The ${cleanObject} should display/behave correctly as per specifications.`;
      actual = `[Describe: What is wrong? What should it show vs what it actually shows? Include screenshots if possible.]`;
      severity = 'major';
      priority = 'P3';
      module = 'dashboard';
      break;
      
    case 'missing':
      steps = [
        `1. Log in to the system`,
        `2. ${locationStep}`,
        `3. Look for the expected element/data in ${cleanObject}`,
        conditionNote ? `4. ${conditionNote}` : null,
        `${conditionNote ? '5' : '4'}. Confirm the element/data is not visible`
      ].filter(Boolean).join('\n');
      
      expected = `The ${cleanObject} should be visible and display all relevant information.`;
      actual = `[Describe: What is missing? Was it visible before? Is the area completely blank or just specific data missing?]`;
      severity = 'minor';
      priority = 'P3';
      module = 'dashboard';
      break;
      
    case 'crash':
      steps = [
        `1. Log in to the system`,
        `2. ${locationStep}`,
        `3. Perform the action that causes the crash`,
        `4. Document any error messages before crash`,
        `5. Note if the application recovers or requires restart`
      ].join('\n');
      
      expected = `The application should handle the action gracefully without crashing.`;
      actual = `[Describe: Does the app freeze, close, or show white screen? Any error before crash? Does it recover?]`;
      severity = 'blocker';
      priority = 'P1';
      module = 'other';
      break;
      
    default:
      // Intelligent fallback - still uses parsed components
      steps = [
        `1. Log in to the system with appropriate credentials`,
        `2. ${locationStep}`,
        `3. Perform the action described: "${title.slice(0, 60)}${title.length > 60 ? '...' : ''}"`,
        conditionNote ? `4. ${conditionNote}` : null,
        `${conditionNote ? '5' : '4'}. Observe the result`
      ].filter(Boolean).join('\n');
      
      expected = `The ${cleanObject} feature should work as designed without issues.`;
      actual = `[Describe exactly what went wrong and how it differs from expected behavior]`;
      severity = 'major';
      priority = 'P3';
      module = 'other';
  }
  
  // Detect module from object/context keywords
  if (/login|auth|sign|password|session|credential/i.test(title)) {
    module = 'authentication';
  } else if (/payment|checkout|cart|order|transaction|billing/i.test(title)) {
    module = 'payments';
  } else if (/report|export|data|analytics/i.test(title)) {
    module = 'reports';
  } else if (/api|endpoint|request|response|500|404|403/i.test(title)) {
    module = 'api';
  } else if (/notification|alert|email|message/i.test(title)) {
    module = 'notifications';
  }
  
  // Calculate confidence based on how much we could parse
  let confidence = 0.6;
  if (action !== 'perform the action') confidence += 0.1;
  if (object !== 'the affected feature') confidence += 0.1;
  if (context) confidence += 0.1;
  if (condition) confidence += 0.05;
  if (issueType !== 'other') confidence += 0.05;
  confidence = Math.min(confidence, 0.95);

  return {
    steps,
    expected,
    actual,
    suggestedSeverity: severity,
    suggestedPriority: priority,
    suggestedModule: module,
    confidence
  };
}

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
    if (!formData.title || formData.title.length < 20) {
      tips.push('Add more detail to the title (at least 20 characters)');
    }
    if (!formData.stepsToReproduce || formData.stepsToReproduce.split('\n').filter(l => l.trim()).length < 3) {
      tips.push('Add at least 3 clear steps to reproduce');
    }
    if (!formData.expectedResult || formData.expectedResult.length < 20) {
      tips.push('Describe the expected result in more detail');
    }
    if (!formData.actualResult || formData.actualResult.length < 20) {
      tips.push('Describe the actual result in more detail');
    }
    if (!formData.severity) {
      tips.push('Select a severity level');
    }
    if (!formData.releaseId) {
      tips.push('Select the target release');
    }
    if (!formData.assigneeId) {
      tips.push('Consider assigning to a team member');
    }
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
              <span className="ml-2">
                <Lozenge appearance="new">AI-Assisted</Lozenge>
              </span>
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
                      <SelectItem value="P2">P2 — High (Fix this release)</SelectItem>
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
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-primary gap-1 hover:bg-primary/10">
                  <Lightbulb className="w-4 h-4" />
                  Improve
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Tips to improve your defect report
                  </div>
                  {qualityTips.length > 0 ? (
                    <ul className="space-y-2">
                      {qualityTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-amber-500 mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Great job! Your report is comprehensive.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
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
