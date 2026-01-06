import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Search, Loader2, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateIncident, useReleaseVersions, useWorkgroups } from '@/hooks/useIncidents';
import { useDepartments } from '@/hooks/useDepartments';
import { useActiveBusinessProcesses } from '@/hooks/useBusinessProcesses';
import type { SeverityLevel, ImpactLevel, UrgencyLevel, SupportLevel, PriorityLevel } from '@/types/incident';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Rich Text Editor Component (JSM-style) - Enhanced for 400-500 word descriptions
function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  minHeight = '280px'
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  minHeight?: string;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-transparent shadow-sm">
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30">
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs font-bold text-muted-foreground">B</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs italic text-muted-foreground">I</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs underline text-muted-foreground">U</button>
        <Separator orientation="vertical" className="h-4 mx-1.5" />
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">H1</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">H2</button>
        <Separator orientation="vertical" className="h-4 mx-1.5" />
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">• List</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">1. List</button>
        <Separator orientation="vertical" className="h-4 mx-1.5" />
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">Code</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">Link</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">Table</button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 text-sm resize-y focus:outline-none leading-relaxed"
        style={{ minHeight }}
      />
      <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Rich text formatting supported</span>
        <span className="text-[10px] text-muted-foreground">{value.split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
}

// Linked Work Item Search (BAU-XXXX format)
function WorkItemSearch({ 
  onSelect,
  selected,
  onRemove 
}: { 
  onSelect: (item: { id: string; type: string; key: string; title: string }) => void;
  selected: { id: string; type: string; key: string; title: string }[];
  onRemove: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const mockResults = [
    { id: '1', type: 'story', key: 'BAU-101', title: 'User authentication flow improvement' },
    { id: '2', type: 'feature', key: 'BAU-042', title: 'Payment gateway integration' },
    { id: '3', type: 'epic', key: 'BAU-015', title: 'Mobile app redesign' },
    { id: '4', type: 'task', key: 'BAU-089', title: 'Database migration script' },
  ].filter(item => 
    searchQuery && (
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by BAU key or title (Story / Feature / Epic / Task)..."
          className="pl-9"
        />
      </div>
      
      {searchQuery && mockResults.length > 0 && (
        <div className="border border-border rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
          {mockResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item);
                setSearchQuery('');
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 text-left text-sm border-b border-border/50 last:border-0"
            >
              <Badge variant="outline" className="text-[10px] px-1.5 uppercase">{item.type}</Badge>
              <span className="font-mono text-xs text-brand-primary font-medium">{item.key}</span>
              <span className="text-foreground truncate">{item.title}</span>
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md text-xs border border-border">
              <Badge variant="outline" className="text-[9px] px-1 uppercase">{item.type}</Badge>
              <span className="font-mono text-brand-primary font-medium">{item.key}</span>
              <button type="button" onClick={() => onRemove(item.id)} className="ml-1 hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Delivery platforms
const DELIVERY_PLATFORMS = [
  { id: 'web', name: 'Web Application' },
  { id: 'mobile', name: 'Mobile Application' },
  { id: 'api', name: 'API Services' },
  { id: 'batch', name: 'Batch Processing' },
  { id: 'integration', name: 'Integration Layer' },
  { id: 'data', name: 'Data Platform' },
];

// Work groups with default support levels
const WORK_GROUPS = [
  { id: 'operations', name: 'Operations', defaultLevel: 'L1' as SupportLevel },
  { id: 'delivery', name: 'Delivery', defaultLevel: 'L2' as SupportLevel },
  { id: 'platform', name: 'Platform Engineering', defaultLevel: 'L3' as SupportLevel },
];

// Priority matrix
const calculatePriority = (impact: ImpactLevel, urgency: UrgencyLevel): PriorityLevel => {
  const matrix: Record<ImpactLevel, Record<UrgencyLevel, PriorityLevel>> = {
    high: { high: 'P1', medium: 'P2', low: 'P3' },
    medium: { high: 'P2', medium: 'P3', low: 'P4' },
    low: { high: 'P3', medium: 'P4', low: 'P4' },
  };
  return matrix[impact]?.[urgency] || 'P3';
};

export default function CreateIncidentPage() {
  const navigate = useNavigate();
  const createIncident = useCreateIncident();
  const { data: releaseVersions } = useReleaseVersions();
  const { data: workgroups } = useWorkgroups();
  const { data: departments } = useDepartments();
  const { data: businessProcesses } = useActiveBusinessProcesses();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'SEV3' as SeverityLevel,
    impact: 'medium' as ImpactLevel,
    urgency: 'medium' as UrgencyLevel,
    support_level: 'L1' as SupportLevel,
    work_group: 'operations',
    source_department_id: '',
    business_process_id: '',
    delivery_platform: '',
    assignee_workgroup_id: '',
    assignee_id: '',
    is_major_incident: false,
  });

  const [linkedItems, setLinkedItems] = useState<{ id: string; type: string; key: string; title: string }[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  // Auto-update support level when work group changes
  useEffect(() => {
    const group = WORK_GROUPS.find(g => g.id === formData.work_group);
    if (group) {
      setFormData(prev => ({ ...prev, support_level: group.defaultLevel }));
    }
  }, [formData.work_group]);

  const calculatedPriority = calculatePriority(formData.impact, formData.urgency);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Summary is required';
    }
    if (!formData.severity) {
      newErrors.severity = 'Severity is required';
    }
    if (!formData.impact) {
      newErrors.impact = 'Impact is required';
    }
    if (!formData.urgency) {
      newErrors.urgency = 'Urgency is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const result = await createIncident.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        severity: formData.severity,
        impact: formData.impact,
        urgency: formData.urgency,
        support_level: formData.support_level,
        is_major_incident: formData.is_major_incident,
        business_process_id: formData.business_process_id || undefined,
        service_component: formData.delivery_platform || undefined,
        assignee_workgroup_id: formData.assignee_workgroup_id || undefined,
      });

      toast.success('Incident created successfully');
      
      // Redirect to detail page - incident immediately appears in list via query invalidation
      if (result?.id) {
        navigate(`/release/incidents/${result.id}`);
      } else {
        navigate('/release/incidents');
      }
    } catch (error: any) {
      // Show backend error message if available
      const errorMsg = error?.message || 'Failed to create incident';
      toast.error(errorMsg);
      console.error('Create incident error:', error);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center gap-3">
        <Link to="/release/incidents">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-base font-semibold text-foreground">Create Incident</h1>
      </div>

      {/* Form Content - Full width JSM style */}
      <div className="flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Summary - Full-width Jira-style input with large font */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-foreground">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief, clear summary of the incident (e.g., 'Payment gateway timeout affecting checkout')"
              className={cn(
                "h-14 text-xl font-semibold border-2 focus:border-brand-primary focus:ring-0 transition-colors",
                errors.title ? 'border-destructive' : 'border-border'
              )}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          {/* Description - Significantly larger rich text editor for 400-500 words */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Description</Label>
            <p className="text-xs text-muted-foreground -mt-1">Provide comprehensive details including impact, affected systems, error messages, and steps to reproduce</p>
            <RichTextEditor
              value={formData.description}
              onChange={(v) => handleChange('description', v)}
              placeholder="Describe the incident in detail:

• What happened?
• When did it start?
• Which systems or services are affected?
• What is the business impact?
• Are there any error messages or logs?
• Steps to reproduce (if applicable)
• Any workarounds currently in place?"
              minHeight="280px"
            />
          </div>

          {/* Major Incident Toggle - Prominent */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-lg border-2 transition-colors",
            formData.is_major_incident 
              ? "bg-[var(--sem-danger-bg)] border-[var(--sem-danger-border)]" 
              : "bg-muted/30 border-border hover:border-[var(--sem-danger-border)]"
          )}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={cn(
                "h-5 w-5",
                formData.is_major_incident ? "text-[var(--sem-danger)]" : "text-muted-foreground"
              )} />
              <div>
                <Label htmlFor="major-incident" className={cn(
                  "text-sm font-semibold",
                  formData.is_major_incident ? "text-[var(--sem-danger)]" : "text-foreground"
                )}>
                  Major Incident
                </Label>
                <p className={cn(
                  "text-xs mt-0.5",
                  formData.is_major_incident ? "text-[var(--sem-danger)]" : "text-muted-foreground"
                )}>
                  Flag this as a major incident requiring immediate executive attention and escalation
                </p>
              </div>
            </div>
            <Switch
              id="major-incident"
              checked={formData.is_major_incident}
              onCheckedChange={(v) => handleChange('is_major_incident', v)}
            />
          </div>

          {/* Classification Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Severity <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.severity} onValueChange={(v) => handleChange('severity', v)}>
                <SelectTrigger className={cn("h-10", errors.severity && 'border-destructive')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEV1">SEV1 - Critical</SelectItem>
                  <SelectItem value="SEV2">SEV2 - High</SelectItem>
                  <SelectItem value="SEV3">SEV3 - Medium</SelectItem>
                  <SelectItem value="SEV4">SEV4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Impact <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.impact} onValueChange={(v) => handleChange('impact', v)}>
                <SelectTrigger className={cn("h-10", errors.impact && 'border-destructive')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Urgency <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.urgency} onValueChange={(v) => handleChange('urgency', v)}>
                <SelectTrigger className={cn("h-10", errors.urgency && 'border-destructive')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Priority</Label>
              <div className="h-10 px-3 flex items-center gap-2 bg-muted/50 rounded-md border border-border">
                <Badge variant="outline" className={cn(
                  "text-xs font-semibold px-2 border",
                  calculatedPriority === 'P1' && 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
                  calculatedPriority === 'P2' && 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
                  calculatedPriority === 'P3' && 'bg-[var(--sem-high-bg)] text-[var(--sem-high)] border-[var(--sem-warning-border)]',
                  calculatedPriority === 'P4' && 'bg-[var(--sem-info-bg)] text-[var(--sem-info)] border-[var(--sem-info-border)]',
                )}>
                  {calculatedPriority}
                </Badge>
                <span className="text-xs text-muted-foreground">Auto-calculated</span>
              </div>
            </div>
          </div>

          {/* Context Section */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Source Department</Label>
              <Select value={formData.source_department_id} onValueChange={(v) => handleChange('source_department_id', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Business Process</Label>
              <Select value={formData.business_process_id} onValueChange={(v) => handleChange('business_process_id', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select process" />
                </SelectTrigger>
                <SelectContent>
                  {businessProcesses?.map((bp) => (
                    <SelectItem key={bp.id} value={bp.id}>{bp.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Delivery Platform</Label>
              <Select value={formData.delivery_platform} onValueChange={(v) => handleChange('delivery_platform', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Work Group</Label>
              <Select value={formData.work_group} onValueChange={(v) => handleChange('work_group', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_GROUPS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Support Level</Label>
              <Select value={formData.support_level} onValueChange={(v) => handleChange('support_level', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1 - First Line</SelectItem>
                  <SelectItem value="L2">L2 - Second Line</SelectItem>
                  <SelectItem value="L3">L3 - Third Line</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Assignee</Label>
              <Select value={formData.assignee_id} onValueChange={(v) => handleChange('assignee_id', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reporter</Label>
              <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md border border-border text-sm text-muted-foreground">
                Current User
              </div>
            </div>
          </div>

          {/* Linked Work Items */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Linked Work Items</Label>
            <WorkItemSearch
              onSelect={(item) => setLinkedItems(prev => [...prev, item])}
              selected={linkedItems}
              onRemove={(id) => setLinkedItems(prev => prev.filter(i => i.id !== id))}
            />
          </div>

          {/* Attachments - Compact icon + count view */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">Attachments</Label>
              {attachments.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachments.length} file{attachments.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg transition-colors",
                attachments.length > 0 ? "p-3" : "p-4",
                isDragging ? "border-brand-primary bg-brand-primary/5" : "border-border hover:border-muted-foreground/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="attachments"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              
              {attachments.length === 0 ? (
                <label
                  htmlFor="attachments"
                  className="flex items-center justify-center gap-3 cursor-pointer py-2"
                >
                  <Paperclip className={cn("h-5 w-5", isDragging ? "text-brand-primary" : "text-muted-foreground")} />
                  <span className="text-sm text-muted-foreground">
                    {isDragging ? 'Drop files here' : 'Drop files or click to attach (PNG, JPG, PDF, DOC up to 10MB)'}
                  </span>
                </label>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 py-1 group">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs flex-1 truncate text-foreground">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {file.size >= 1024 * 1024 
                          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(file.size / 1024).toFixed(1)} KB`
                        }
                      </span>
                      <button 
                        type="button" 
                        onClick={() => removeAttachment(index)} 
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <label
                    htmlFor="attachments"
                    className="flex items-center gap-2 text-xs text-brand-primary hover:underline cursor-pointer pt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add more files
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/release/incidents')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary-hover text-white min-w-[140px]"
              disabled={createIncident.isPending}
            >
              {createIncident.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Incident'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
