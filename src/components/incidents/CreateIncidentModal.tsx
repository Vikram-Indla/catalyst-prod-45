import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Upload, Paperclip, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
  summary: string;
  description: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3';
  impact: 'High' | 'Medium' | 'Low';
  urgency: 'High' | 'Medium' | 'Low';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  reporterId: string;
  assigneeId?: string;
  releaseVersion?: string;
  labels: string[];
  isMajorIncident: boolean;
  attachments: AttachmentFile[];
}

const SEVERITY_OPTIONS = [
  { 
    value: 'SEV1', 
    label: 'SEV 1', 
    description: 'Critical - Service down for all customers, data loss, security breach',
    color: 'bg-red-500',
    borderColor: 'border-red-500'
  },
  { 
    value: 'SEV2', 
    label: 'SEV 2', 
    description: 'Major - Service down for subset of customers, core functionality impacted',
    color: 'bg-orange-500',
    borderColor: 'border-orange-500'
  },
  { 
    value: 'SEV3', 
    label: 'SEV 3', 
    description: 'Minor - Low impact, workaround available, cosmetic issues',
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-500'
  },
];

const IMPACT_OPTIONS = [
  { value: 'High', description: 'Affects all users or critical business function' },
  { value: 'Medium', description: 'Affects subset of users or degraded service' },
  { value: 'Low', description: 'Minimal effect on users or business' },
];

const URGENCY_OPTIONS = [
  { value: 'High', description: 'Needs immediate resolution' },
  { value: 'Medium', description: 'Needs resolution within hours' },
  { value: 'Low', description: 'Can be resolved when convenient' },
];

const USERS = [
  { id: 'u1', name: 'Ahmed Al-Rashid', email: 'ahmed.rashid@moi.gov.sa', initials: 'AA' },
  { id: 'u2', name: 'Sara Al-Fahad', email: 'sara.fahad@moi.gov.sa', initials: 'SF' },
  { id: 'u3', name: 'Mohammed Al-Hassan', email: 'm.hassan@moi.gov.sa', initials: 'MH' },
  { id: 'u4', name: 'Fatima Al-Zahra', email: 'f.zahra@moi.gov.sa', initials: 'FZ' },
  { id: 'u5', name: 'Omar Al-Qahtani', email: 'o.qahtani@moi.gov.sa', initials: 'OQ' },
];

const RELEASE_VERSIONS = [
  { value: 'v2.5.0', label: 'v2.5.0 - Current Production' },
  { value: 'v2.4.2', label: 'v2.4.2' },
  { value: 'v2.4.1', label: 'v2.4.1' },
  { value: 'v2.4.0', label: 'v2.4.0' },
  { value: 'v2.3.5', label: 'v2.3.5' },
  { value: 'v2.3.0', label: 'v2.3.0' },
];

// Priority calculation matrix
const calculatePriority = (impact: string, urgency: string): 'Critical' | 'High' | 'Medium' | 'Low' | '' => {
  const matrix: Record<string, Record<string, 'Critical' | 'High' | 'Medium' | 'Low'>> = {
    'High': { 'High': 'Critical', 'Medium': 'High', 'Low': 'Medium' },
    'Medium': { 'High': 'High', 'Medium': 'Medium', 'Low': 'Low' },
    'Low': { 'High': 'Medium', 'Medium': 'Low', 'Low': 'Low' },
  };
  return matrix[impact]?.[urgency] || '';
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical': return 'bg-red-500';
    case 'High': return 'bg-orange-500';
    case 'Medium': return 'bg-yellow-500';
    case 'Low': return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function CreateIncidentModal({ isOpen, onClose, onSubmit }: CreateIncidentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({
    summary: '',
    description: '',
    severity: undefined,
    impact: undefined,
    urgency: undefined,
    labels: [],
    isMajorIncident: false,
    attachments: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [labelInput, setLabelInput] = useState('');
  const [reporterSearch, setReporterSearch] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showReporterDropdown, setShowReporterDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  // Calculate priority when impact/urgency change
  const calculatedPriority = formData.impact && formData.urgency 
    ? calculatePriority(formData.impact, formData.urgency) 
    : '';

  // Validation
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'summary':
        if (!value?.trim()) return 'Summary is required';
        break;
      case 'description':
        if (!value?.trim()) return 'Description is required';
        break;
      case 'severity':
        if (!value) return 'Please select a severity level';
        break;
      case 'impact':
        if (!value) return 'Impact is required';
        break;
      case 'urgency':
        if (!value) return 'Urgency is required';
        break;
      case 'reporterId':
        if (!value) return 'Reporter is required';
        break;
    }
    return '';
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const isFormValid = useCallback(() => {
    return (
      formData.summary?.trim() &&
      formData.description?.trim() &&
      formData.severity &&
      formData.impact &&
      formData.urgency &&
      formData.reporterId
    );
  }, [formData]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        summary: '',
        description: '',
        severity: undefined,
        impact: undefined,
        urgency: undefined,
        labels: [],
        isMajorIncident: false,
        attachments: [],
      });
      setErrors({});
      setTouched({});
      setLabelInput('');
      setReporterSearch('');
      setAssigneeSearch('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!isFormValid()) return;
    
    onSubmit({
      summary: formData.summary!,
      description: formData.description!,
      severity: formData.severity!,
      impact: formData.impact!,
      urgency: formData.urgency!,
      priority: calculatedPriority as 'Critical' | 'High' | 'Medium' | 'Low',
      reporterId: formData.reporterId!,
      assigneeId: formData.assigneeId,
      releaseVersion: formData.releaseVersion,
      labels: formData.labels || [],
      isMajorIncident: formData.isMajorIncident || false,
      attachments: formData.attachments || [],
    });
    onClose();
  };

  const handleAddLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && labelInput.trim()) {
      e.preventDefault();
      const value = labelInput.replace(',', '').trim();
      if (value && !formData.labels?.includes(value)) {
        setFormData(prev => ({
          ...prev,
          labels: [...(prev.labels || []), value],
        }));
      }
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels?.filter(l => l !== label) || [],
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: AttachmentFile[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments],
    }));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(a => a.id !== id) || [],
    }));
  };

  const filteredReporters = USERS.filter(user => 
    user.name.toLowerCase().includes(reporterSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(reporterSearch.toLowerCase())
  );

  const filteredAssignees = USERS.filter(user => 
    user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const selectedReporter = USERS.find(u => u.id === formData.reporterId);
  const selectedAssignee = USERS.find(u => u.id === formData.assigneeId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-[#DFE1E6] flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-[#172B4D]">Create Incident</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Summary */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Summary <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.summary || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              onBlur={() => handleBlur('summary')}
              placeholder="Brief description of the incident"
              maxLength={255}
              className={cn(
                "bg-[#FAFBFC] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF]",
                touched.summary && errors.summary && "border-red-500"
              )}
            />
            <div className="flex justify-between mt-1">
              {touched.summary && errors.summary ? (
                <span className="text-xs text-red-500">{errors.summary}</span>
              ) : (
                <span />
              )}
              <span className="text-xs text-[#6B778C]">{formData.summary?.length || 0} / 255</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onBlur={() => handleBlur('description')}
              placeholder="Detailed description of the incident, including observed behavior, expected behavior, and any relevant context"
              rows={4}
              className={cn(
                "bg-[#FAFBFC] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF] resize-none",
                touched.description && errors.description && "border-red-500"
              )}
            />
            {touched.description && errors.description && (
              <span className="text-xs text-red-500 mt-1 block">{errors.description}</span>
            )}
          </div>

          {/* Major Incident Flag */}
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-red-700">Major Incident</Label>
                <p className="text-xs text-red-600 mt-0.5">Flag this as a major incident requiring immediate attention</p>
              </div>
              <Switch
                checked={formData.isMajorIncident || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isMajorIncident: checked }))}
                className="data-[state=checked]:bg-red-600"
              />
            </div>
          </div>

          {/* Severity */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Severity <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.description}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, severity: option.value as any }));
                    setTouched(prev => ({ ...prev, severity: true }));
                    setErrors(prev => ({ ...prev, severity: '' }));
                  }}
                  className={cn(
                    "relative group p-4 rounded-lg border-2 text-center transition-all",
                    formData.severity === option.value
                      ? option.borderColor + " bg-white"
                      : "border-[#DFE1E6] bg-[#FAFBFC] hover:border-[#B3BAC5]"
                  )}
                >
                  <Badge className={cn(option.color, "text-white border-0 font-semibold")}>
                    {option.label}
                  </Badge>
                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-[#172B4D] text-white text-xs px-3 py-2 rounded shadow-lg whitespace-normal w-[180px] text-center">
                      {option.description}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#172B4D]" />
                  </div>
                </button>
              ))}
            </div>
            {touched.severity && errors.severity && (
              <span className="text-xs text-red-500 mt-1 block">{errors.severity}</span>
            )}
          </div>

          {/* Impact & Urgency */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Impact */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
                Impact <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.impact}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, impact: value as any }));
                  setTouched(prev => ({ ...prev, impact: true }));
                  setErrors(prev => ({ ...prev, impact: '' }));
                }}
              >
                <SelectTrigger className={cn(
                  "bg-[#FAFBFC] border-[#DFE1E6]",
                  touched.impact && errors.impact && "border-red-500"
                )}>
                  <SelectValue placeholder="Select impact..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#DFE1E6]">
                  {IMPACT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.impact && errors.impact && (
                <span className="text-xs text-red-500 mt-1 block">{errors.impact}</span>
              )}
            </div>

            {/* Urgency */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
                Urgency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, urgency: value as any }));
                  setTouched(prev => ({ ...prev, urgency: true }));
                  setErrors(prev => ({ ...prev, urgency: '' }));
                }}
              >
                <SelectTrigger className={cn(
                  "bg-[#FAFBFC] border-[#DFE1E6]",
                  touched.urgency && errors.urgency && "border-red-500"
                )}>
                  <SelectValue placeholder="Select urgency..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#DFE1E6]">
                  {URGENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.urgency && errors.urgency && (
                <span className="text-xs text-red-500 mt-1 block">{errors.urgency}</span>
              )}
            </div>
          </div>

          {/* Priority (Read-only) */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Priority
            </Label>
            <div className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg border border-[#DFE1E6]">
              <div className="flex items-center gap-2">
                <span className={cn("w-3 h-3 rounded-full", calculatedPriority ? getPriorityColor(calculatedPriority) : "bg-gray-300")} />
                <span className="text-sm text-[#172B4D]">
                  {calculatedPriority || 'Select Impact and Urgency'}
                </span>
              </div>
              <span className="text-xs text-[#6B778C]">Auto-calculated</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#DFE1E6] my-5" />

          {/* Assignment & Categorization Section */}
          <h3 className="text-sm font-semibold text-[#172B4D] mb-4">Assignment & Categorization</h3>

          {/* Reporter (Required) */}
          <div className="mb-5 relative">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Reporter <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                value={selectedReporter ? selectedReporter.name : reporterSearch}
                onChange={(e) => {
                  setReporterSearch(e.target.value);
                  setShowReporterDropdown(true);
                  if (formData.reporterId) {
                    setFormData(prev => ({ ...prev, reporterId: undefined }));
                  }
                }}
                onFocus={() => setShowReporterDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowReporterDropdown(false), 200);
                  handleBlur('reporterId');
                }}
                placeholder="Search for reporter..."
                className={cn(
                  "bg-[#FAFBFC] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF]",
                  touched.reporterId && errors.reporterId && "border-red-500"
                )}
              />
              {showReporterDropdown && filteredReporters.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DFE1E6] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredReporters.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, reporterId: user.id }));
                        setReporterSearch('');
                        setShowReporterDropdown(false);
                        setErrors(prev => ({ ...prev, reporterId: '' }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F4F5F7] text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#DFE1E6] flex items-center justify-center text-xs font-medium text-[#6B778C]">
                        {user.initials}
                      </div>
                      <div>
                        <div className="text-sm text-[#172B4D]">{user.name}</div>
                        <div className="text-xs text-[#6B778C]">{user.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {touched.reporterId && errors.reporterId && (
              <span className="text-xs text-red-500 mt-1 block">{errors.reporterId}</span>
            )}
          </div>

          {/* Assignee */}
          <div className="mb-5 relative">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Assignee
            </Label>
            <div className="relative">
              <Input
                value={selectedAssignee ? selectedAssignee.name : assigneeSearch}
                onChange={(e) => {
                  setAssigneeSearch(e.target.value);
                  setShowAssigneeDropdown(true);
                  if (formData.assigneeId) {
                    setFormData(prev => ({ ...prev, assigneeId: undefined }));
                  }
                }}
                onFocus={() => setShowAssigneeDropdown(true)}
                onBlur={() => setTimeout(() => setShowAssigneeDropdown(false), 200)}
                placeholder="Search for assignee..."
                className="bg-[#FAFBFC] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF]"
              />
              {showAssigneeDropdown && filteredAssignees.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DFE1E6] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredAssignees.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, assigneeId: user.id }));
                        setAssigneeSearch('');
                        setShowAssigneeDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F4F5F7] text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#DFE1E6] flex items-center justify-center text-xs font-medium text-[#6B778C]">
                        {user.initials}
                      </div>
                      <div>
                        <div className="text-sm text-[#172B4D]">{user.name}</div>
                        <div className="text-xs text-[#6B778C]">{user.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Release Version */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Release Version
            </Label>
            <Select
              value={formData.releaseVersion}
              onValueChange={(value) => setFormData(prev => ({ ...prev, releaseVersion: value }))}
            >
              <SelectTrigger className="bg-[#FAFBFC] border-[#DFE1E6]">
                <SelectValue placeholder="Select release version..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#DFE1E6]">
                {RELEASE_VERSIONS.map((version) => (
                  <SelectItem key={version.value} value={version.value}>
                    {version.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Labels */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Labels
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.labels?.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="bg-[#DFE1E6] text-[#172B4D] hover:bg-[#C1C7D0] cursor-pointer"
                  onClick={() => handleRemoveLabel(label)}
                >
                  {label}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <Input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={handleAddLabel}
              placeholder="Type and press Enter to add..."
              className="bg-[#FAFBFC] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF]"
            />
            <span className="text-xs text-[#6B778C] mt-1 block">Press Enter or comma to add a label</span>
          </div>

          {/* Attachments */}
          <div className="mb-5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] mb-2 block">
              Attachments
            </Label>
            
            {/* File List */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {formData.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-[#F4F5F7] rounded-lg border border-[#DFE1E6]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-[#6B778C] flex-shrink-0" />
                      <span className="text-sm text-[#172B4D] truncate">{attachment.name}</span>
                      <span className="text-xs text-[#6B778C]">({formatFileSize(attachment.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="p-1 text-[#6B778C] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.log,.zip"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#DFE1E6] rounded-lg text-[#6B778C] hover:border-[#B3BAC5] hover:bg-[#FAFBFC] transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Click to upload files</span>
            </button>
            <span className="text-xs text-[#6B778C] mt-1 block">
              Supported: PDF, DOC, DOCX, XLS, XLSX, Images, TXT, LOG, ZIP
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DFE1E6] bg-[#F4F5F7] flex-shrink-0 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#DFE1E6] text-[#42526E] hover:bg-[#EBECF0]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Incident
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateIncidentModal;
