import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Upload, Paperclip, Trash2, AlertTriangle, Info, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useProjects';
import { useReleaseVersions } from '@/hooks/useIncidents';
import { useIncidentUserProfiles } from '@/hooks/useIncidentUserProfiles';
import { supabase } from '@/integrations/supabase/client';
import { format, addHours } from 'date-fns';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (incident: IncidentFormData) => void;
}

interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export interface IncidentFormData {
  title: string;
  description: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  impact: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  support_level: 'L1' | 'L2' | 'L3';
  reporterId: string;
  reporterName?: string;
  assigneeId?: string;
  project_id?: string;
  release_version_id?: string;
  incident_type?: string;
  is_major_incident: boolean;
  attachments: AttachmentFile[];
  executive_owner_id?: string;
  comms_lead_id?: string;
  has_external_impact?: boolean;
  target_resolution_date?: string;
}

const SEVERITY_OPTIONS = [
  { value: 'SEV1', label: 'SEV1', description: 'Critical – Service down, data loss, security breach', slaHours: 24 },
  { value: 'SEV2', label: 'SEV2', description: 'Major – Partial outage, core functionality impacted', slaHours: 48 },
  { value: 'SEV3', label: 'SEV3', description: 'Minor – Low impact, workaround available', slaHours: 168 },
  { value: 'SEV4', label: 'SEV4', description: 'Trivial – Cosmetic issues, no business impact', slaHours: null },
];

const IMPACT_OPTIONS = [
  { value: 'high', label: 'High', description: 'Affects all users or critical business function' },
  { value: 'medium', label: 'Medium', description: 'Affects subset of users or degraded service' },
  { value: 'low', label: 'Low', description: 'Minimal effect on users or business' },
];

const URGENCY_OPTIONS = [
  { value: 'high', label: 'High', description: 'Needs immediate resolution' },
  { value: 'medium', label: 'Medium', description: 'Needs resolution within hours' },
  { value: 'low', label: 'Low', description: 'Can be resolved when convenient' },
];

const SUPPORT_LEVEL_OPTIONS = [
  { value: 'L1', label: 'L1', description: 'First-line support' },
  { value: 'L2', label: 'L2', description: 'Technical specialists' },
  { value: 'L3', label: 'L3', description: 'Engineering / DevOps' },
];

const INCIDENT_TYPE_OPTIONS = [
  { value: 'incident', label: 'Incident' },
  { value: 'service_request', label: 'Service Request' },
  { value: 'change', label: 'Change' },
];

const ALLOWED_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.log', '.csv', '.doc', '.docx'];

// Priority calculation matrix (Impact × Urgency)
const calculatePriority = (impact: string, urgency: string): 'P1' | 'P2' | 'P3' | 'P4' | null => {
  const matrix: Record<string, Record<string, 'P1' | 'P2' | 'P3' | 'P4'>> = {
    'high': { 'high': 'P1', 'medium': 'P2', 'low': 'P3' },
    'medium': { 'high': 'P2', 'medium': 'P3', 'low': 'P4' },
    'low': { 'high': 'P3', 'medium': 'P4', 'low': 'P4' },
  };
  return matrix[impact]?.[urgency] || null;
};

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case 'P1': return 'bg-destructive text-destructive-foreground';
    case 'P2': return 'bg-orange-500 text-white';
    case 'P3': return 'bg-yellow-500 text-white';
    case 'P4': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'SEV1': return 'bg-destructive text-destructive-foreground';
    case 'SEV2': return 'bg-orange-500 text-white';
    case 'SEV3': return 'bg-yellow-500 text-white';
    case 'SEV4': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const INCIDENT_TEMPLATE = `<h3>Impact Summary</h3>
<p>Describe the business and user impact...</p>

<h3>Steps to Reproduce</h3>
<ol>
<li>Step 1...</li>
<li>Step 2...</li>
</ol>

<h3>Observed Behavior</h3>
<p>What is currently happening...</p>

<h3>Expected Behavior</h3>
<p>What should be happening...</p>

<h3>Workaround</h3>
<p>Any temporary workaround available...</p>

<h3>Current Status</h3>
<p>Initial assessment...</p>`;

// Section Header Component
function SectionHeader({ 
  title, 
  description,
  icon: Icon 
}: { 
  title: string; 
  description?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-2 mb-3">
      {Icon && (
        <div className="p-1.5 rounded bg-muted mt-0.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// Field Label Component
function FieldLabel({ 
  children, 
  required, 
  tooltip 
}: { 
  children: React.ReactNode; 
  required?: boolean; 
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {children}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export function CreateIncidentModal({ isOpen, onClose, onSubmit }: CreateIncidentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  
  // Data hooks
  const { data: projects = [] } = useProjects();
  const { data: releaseVersions = [] } = useReleaseVersions();
  const { data: userProfiles = [] } = useIncidentUserProfiles();
  
  // Current user state
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({
    title: '',
    description: '',
    severity: undefined,
    impact: undefined,
    urgency: undefined,
    support_level: undefined,
    incident_type: 'incident',
    is_major_incident: false,
    attachments: [],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showMajorIncidentDetails, setShowMajorIncidentDetails] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  
  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = userProfiles.find(p => p.id === user.id);
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        });
        // Set reporter to current user by default
        if (!formData.reporterId) {
          setFormData(prev => ({
            ...prev,
            reporterId: user.id,
            reporterName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
          }));
        }
      }
    };
    if (isOpen && userProfiles.length > 0) {
      loadCurrentUser();
    }
  }, [isOpen, userProfiles]);

  // Calculated priority
  const calculatedPriority = useMemo(() => {
    if (formData.impact && formData.urgency) {
      return calculatePriority(formData.impact, formData.urgency);
    }
    return null;
  }, [formData.impact, formData.urgency]);

  // SLA calculation
  const slaTarget = useMemo(() => {
    if (formData.is_major_incident) {
      return { hours: 4, label: '4 hours (Major Incident SLA)' };
    }
    const sevOption = SEVERITY_OPTIONS.find(s => s.value === formData.severity);
    if (sevOption?.slaHours) {
      return { hours: sevOption.slaHours, label: `${sevOption.slaHours} hours` };
    }
    return null;
  }, [formData.severity, formData.is_major_incident]);

  const slaTargetDate = useMemo(() => {
    if (slaTarget) {
      return addHours(new Date(), slaTarget.hours);
    }
    return null;
  }, [slaTarget]);

  // Validation
  const validateField = (field: string, value: unknown): string => {
    switch (field) {
      case 'title':
        if (!value || (typeof value === 'string' && !value.trim())) return 'Title is required';
        break;
      case 'project_id':
        if (!value) return 'Project is required';
        break;
      case 'release_version_id':
        if (!value) return 'Release is required';
        break;
      case 'incident_type':
        if (!value) return 'Type is required';
        break;
      case 'severity':
        if (!value) return 'Severity is required';
        break;
      case 'impact':
        if (!value) return 'Impact is required';
        break;
      case 'urgency':
        if (!value) return 'Urgency is required';
        break;
      case 'support_level':
        if (!value) return 'Support level is required';
        break;
    }
    return '';
  };

  const validateForm = useCallback((): boolean => {
    const requiredFields = ['title', 'project_id', 'release_version_id', 'incident_type', 'severity', 'impact', 'urgency', 'support_level'];
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    setTouched(requiredFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    if (Object.keys(newErrors).length > 0) {
      setShowErrorSummary(true);
      errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    
    setShowErrorSummary(false);
    return true;
  }, [formData]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        severity: undefined,
        impact: undefined,
        urgency: undefined,
        support_level: undefined,
        incident_type: 'incident',
        is_major_incident: false,
        attachments: [],
      });
      setErrors({});
      setTouched({});
      setShowMajorIncidentDetails(false);
      setShowErrorSummary(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    onSubmit({
      title: formData.title!,
      description: formData.description || '',
      severity: formData.severity!,
      impact: formData.impact!,
      urgency: formData.urgency!,
      priority: calculatedPriority!,
      support_level: formData.support_level!,
      reporterId: formData.reporterId || currentUser?.id || '',
      reporterName: formData.reporterName || currentUser?.full_name,
      assigneeId: formData.assigneeId,
      project_id: formData.project_id,
      release_version_id: formData.release_version_id,
      incident_type: formData.incident_type,
      is_major_incident: formData.is_major_incident || false,
      attachments: formData.attachments || [],
      executive_owner_id: formData.executive_owner_id,
      comms_lead_id: formData.comms_lead_id,
      has_external_impact: formData.has_external_impact,
      target_resolution_date: formData.target_resolution_date,
    });
    onClose();
  };

  const insertTemplate = () => {
    setFormData(prev => ({ ...prev, description: INCIDENT_TEMPLATE }));
  };

  // File handling
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return ALLOWED_FILE_TYPES.includes(ext);
    });
    
    const newAttachments: AttachmentFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments],
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(a => a.id !== id) || [],
    }));
  };

  // Filter release versions by project if needed
  const filteredReleases = useMemo(() => {
    // For now, show all releases. Can be filtered by project if there's a relationship
    return releaseVersions;
  }, [releaseVersions]);

  const errorList = Object.entries(errors).filter(([_, error]) => error);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Create Incident
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Log an operational incident for tracking and resolution
          </DialogDescription>
        </DialogHeader>

        {/* Error Summary */}
        {showErrorSummary && errorList.length > 0 && (
          <div 
            ref={errorSummaryRef}
            className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Please fix the following errors:</span>
            </div>
            <ul className="space-y-1">
              {errorList.map(([field, error]) => (
                <li key={field}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`field-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="text-sm text-destructive hover:underline"
                  >
                    • {error}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scrollable Content - Single Column Layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            
            {/* ============================================ */}
            {/* SECTION 1: SUMMARY (Title + Description) */}
            {/* ============================================ */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4">Summary</h3>
              
              {/* Title */}
              <div id="field-title" className="mb-4">
                <FieldLabel required>Title</FieldLabel>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  onBlur={() => handleBlur('title')}
                  placeholder="e.g., Payment processing failing for credit cards"
                  maxLength={255}
                  className={cn(
                    "bg-background border-input h-10",
                    touched.title && errors.title && "border-destructive"
                  )}
                />
                <div className="flex justify-between mt-1">
                  {touched.title && errors.title ? (
                    <span className="text-xs text-destructive">{errors.title}</span>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">{formData.title?.length || 0} / 255</span>
                </div>
              </div>

              {/* Description with Rich Text */}
              <div>
                <FieldLabel>Description</FieldLabel>
                <RichTextEditor
                  value={formData.description || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder="Describe the incident in detail..."
                  minHeight="200px"
                />
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ============================================ */}
            {/* SECTION 2: CONTEXT */}
            {/* ============================================ */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4">Context</h3>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Project */}
                <div id="field-project_id">
                  <FieldLabel required>Project</FieldLabel>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, project_id: value }));
                      handleBlur('project_id');
                    }}
                  >
                    <SelectTrigger className={cn(
                      "bg-background border-input",
                      touched.project_id && errors.project_id && "border-destructive"
                    )}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.project_id && errors.project_id && (
                    <span className="text-xs text-destructive mt-1 block">{errors.project_id}</span>
                  )}
                </div>

                {/* Release */}
                <div id="field-release_version_id">
                  <FieldLabel required>Release</FieldLabel>
                  <Select
                    value={formData.release_version_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, release_version_id: value }));
                      handleBlur('release_version_id');
                    }}
                  >
                    <SelectTrigger className={cn(
                      "bg-background border-input",
                      touched.release_version_id && errors.release_version_id && "border-destructive"
                    )}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredReleases.map((release) => (
                        <SelectItem key={release.id} value={release.id}>
                          {release.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.release_version_id && errors.release_version_id && (
                    <span className="text-xs text-destructive mt-1 block">{errors.release_version_id}</span>
                  )}
                </div>

                {/* Type */}
                <div id="field-incident_type">
                  <FieldLabel required>Type</FieldLabel>
                  <Select
                    value={formData.incident_type}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, incident_type: value }));
                      handleBlur('incident_type');
                    }}
                  >
                    <SelectTrigger className={cn(
                      "bg-background border-input",
                      touched.incident_type && errors.incident_type && "border-destructive"
                    )}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.incident_type && errors.incident_type && (
                    <span className="text-xs text-destructive mt-1 block">{errors.incident_type}</span>
                  )}
                </div>
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ============================================ */}
            {/* SECTION 3: CLASSIFICATION */}
            {/* ============================================ */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4">Classification</h3>
              
              {/* Severity */}
              <div id="field-severity" className="mb-4">
                <FieldLabel required>Severity</FieldLabel>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITY_OPTIONS.map((option) => (
                    <TooltipProvider key={option.value}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, severity: option.value as IncidentFormData['severity'] }));
                              handleBlur('severity');
                            }}
                            className={cn(
                              "p-2.5 rounded-md border text-center transition-all text-sm font-medium",
                              formData.severity === option.value
                                ? getSeverityColor(option.value) + " border-transparent"
                                : "bg-background border-input hover:border-muted-foreground/50 text-foreground"
                            )}
                          >
                            {option.label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p className="text-xs">{option.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                {touched.severity && errors.severity && (
                  <span className="text-xs text-destructive mt-1 block">{errors.severity}</span>
                )}
              </div>

              {/* Impact, Urgency, Priority Row */}
              <div className="grid grid-cols-3 gap-4">
                <div id="field-impact">
                  <FieldLabel required>Impact</FieldLabel>
                  <Select
                    value={formData.impact}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, impact: value as IncidentFormData['impact'] }));
                      handleBlur('impact');
                    }}
                  >
                    <SelectTrigger className={cn(
                      "bg-background border-input",
                      touched.impact && errors.impact && "border-destructive"
                    )}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPACT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.impact && errors.impact && (
                    <span className="text-xs text-destructive mt-1 block">{errors.impact}</span>
                  )}
                </div>

                <div id="field-urgency">
                  <FieldLabel required>Urgency</FieldLabel>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, urgency: value as IncidentFormData['urgency'] }));
                      handleBlur('urgency');
                    }}
                  >
                    <SelectTrigger className={cn(
                      "bg-background border-input",
                      touched.urgency && errors.urgency && "border-destructive"
                    )}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.urgency && errors.urgency && (
                    <span className="text-xs text-destructive mt-1 block">{errors.urgency}</span>
                  )}
                </div>

                {/* Priority (Read-only) */}
                <div>
                  <FieldLabel tooltip="Priority is derived from Impact × Urgency">Priority</FieldLabel>
                  <div className="flex items-center justify-between p-2 h-10 bg-muted/50 rounded-md border border-border">
                    {calculatedPriority ? (
                      <Badge className={cn("text-xs", getPriorityColor(calculatedPriority))}>
                        {calculatedPriority}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                    <span className="text-xs text-muted-foreground">Auto</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ============================================ */}
            {/* SECTION 4: ASSIGNMENT */}
            {/* ============================================ */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4">Assignment</h3>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Support Level */}
                <div id="field-support_level">
                  <FieldLabel required>Support Level</FieldLabel>
                  <Select
                    value={formData.support_level}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, support_level: value as IncidentFormData['support_level'] }));
                      handleBlur('support_level');
                    }}
                  >
                    <SelectTrigger className={cn(
                      "bg-background border-input",
                      touched.support_level && errors.support_level && "border-destructive"
                    )}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} – {option.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.support_level && errors.support_level && (
                    <span className="text-xs text-destructive mt-1 block">{errors.support_level}</span>
                  )}
                </div>

                {/* Assignee */}
                <div>
                  <FieldLabel>Assignee</FieldLabel>
                  <Select
                    value={formData.assigneeId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userProfiles.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reporter */}
                <div>
                  <FieldLabel>Reporter</FieldLabel>
                  <div className="flex items-center gap-2 p-2 h-10 bg-muted/50 rounded-md border border-border">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {currentUser?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                    </div>
                    <span className="text-sm text-foreground truncate">{currentUser?.full_name || 'Loading...'}</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ============================================ */}
            {/* SECTION 5: ATTACHMENTS */}
            {/* ============================================ */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4">Attachments</h3>
              
              {/* File List */}
              {formData.attachments && formData.attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {formData.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md border border-border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">({formatFileSize(attachment.size)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop Zone */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                accept={ALLOWED_FILE_TYPES.join(',')}
              />
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                )}
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Drop files here or click to browse
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Allowed: PNG, JPG, PDF, TXT, LOG, CSV, DOC
              </p>
            </section>

            <div className="border-t border-border" />

            {/* ============================================ */}
            {/* SECTION 6: MAJOR INCIDENT FLAG */}
            {/* ============================================ */}
            <section>
              <div className={cn(
                "p-4 rounded-lg border transition-colors",
                formData.is_major_incident 
                  ? "bg-destructive/5 border-destructive/30" 
                  : "bg-muted/30 border-border"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn(
                        "h-4 w-4",
                        formData.is_major_incident ? "text-destructive" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-semibold",
                        formData.is_major_incident ? "text-destructive" : "text-foreground"
                      )}>
                        Major Incident
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      High-visibility incident requiring executive attention (4-hour SLA)
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_major_incident || false}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        is_major_incident: checked,
                        ...(checked ? { impact: 'high' as const, urgency: 'high' as const } : {}),
                      }));
                      setShowMajorIncidentDetails(checked);
                    }}
                  />
                </div>

                {/* Major Incident Details */}
                {formData.is_major_incident && (
                  <>
                    <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      Major SLA applies (4 hours). Ensure owner and comms are assigned.
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMajorIncidentDetails(!showMajorIncidentDetails)}
                      className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showMajorIncidentDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {showMajorIncidentDetails ? 'Hide details' : 'Show optional fields'}
                    </button>

                    {showMajorIncidentDetails && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {/* Executive Owner */}
                        <div>
                          <FieldLabel>Executive Owner</FieldLabel>
                          <Select
                            value={formData.executive_owner_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, executive_owner_id: value }))}
                          >
                            <SelectTrigger className="bg-background border-input">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {userProfiles.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Communications Lead */}
                        <div>
                          <FieldLabel>Communications Lead</FieldLabel>
                          <Select
                            value={formData.comms_lead_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, comms_lead_id: value }))}
                          >
                            <SelectTrigger className="bg-background border-input">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {userProfiles.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white"
          >
            Create Incident
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateIncidentModal;
