import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import type { SeverityLevel, ImpactLevel, UrgencyLevel, SupportLevel } from '@/types/incident';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Simple Rich Text Editor Component
function RichTextEditor({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs font-bold">B</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs italic">I</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs underline">U</button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs">• List</button>
        <button type="button" className="p-1.5 rounded hover:bg-muted text-xs">1. List</button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-3 text-sm resize-y focus:outline-none"
      />
    </div>
  );
}

// Linked Work Item Search
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

  // Mock search results - in real implementation, this would query the database
  const mockResults = [
    { id: '1', type: 'story', key: 'STR-101', title: 'User authentication flow' },
    { id: '2', type: 'feature', key: 'FTR-42', title: 'Payment gateway integration' },
    { id: '3', type: 'epic', key: 'EPC-15', title: 'Mobile app redesign' },
    { id: '4', type: 'task', key: 'TSK-89', title: 'Database migration script' },
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
          placeholder="Search work items by key or title (Story / Feature / Task)..."
          className="pl-9"
        />
      </div>
      
      {searchQuery && mockResults.length > 0 && (
        <div className="border border-border rounded-md bg-white shadow-sm max-h-40 overflow-y-auto">
          {mockResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item);
                setSearchQuery('');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left text-sm"
            >
              <Badge variant="outline" className="text-[10px] px-1">{item.type.toUpperCase()}</Badge>
              <span className="font-mono text-xs text-brand-primary">{item.key}</span>
              <span className="text-foreground truncate">{item.title}</span>
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <div key={item.id} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs">
              <span className="font-mono text-brand-primary">{item.key}</span>
              <button type="button" onClick={() => onRemove(item.id)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Delivery platforms (mock data)
const DELIVERY_PLATFORMS = [
  { id: 'web', name: 'Web Application' },
  { id: 'mobile', name: 'Mobile Application' },
  { id: 'api', name: 'API Services' },
  { id: 'batch', name: 'Batch Processing' },
  { id: 'integration', name: 'Integration Layer' },
];

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
    release_version_id: '',
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

  // Calculate priority based on impact and urgency
  const calculatePriority = () => {
    const priorityMatrix: Record<string, Record<string, string>> = {
      high: { high: 'P1', medium: 'P2', low: 'P3' },
      medium: { high: 'P2', medium: 'P3', low: 'P4' },
      low: { high: 'P3', medium: 'P4', low: 'P4' },
    };
    return priorityMatrix[formData.impact]?.[formData.urgency] || 'P3';
  };

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
        release_version_id: formData.release_version_id || undefined,
        is_major_incident: formData.is_major_incident,
      });

      toast.success('Incident created successfully');
      
      if (result?.id) {
        navigate(`/release/incidents/${result.id}`);
      } else {
        navigate('/release/incidents/list');
      }
    } catch (error) {
      toast.error('Failed to create incident');
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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center gap-3">
        <Link to="/release/incidents/list">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-base font-semibold text-foreground">Create Incident</h1>
        <span className="text-xs text-muted-foreground">Environment: Production</span>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Summary - Wide single line */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of the incident"
              className={cn("h-11 text-base", errors.title && 'border-destructive')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Description - Large rich text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <RichTextEditor
              value={formData.description}
              onChange={(v) => handleChange('description', v)}
              placeholder="Detailed description of the incident, steps to reproduce, expected vs actual behavior..."
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Classification */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Classification</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Severity <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.severity} onValueChange={(v) => handleChange('severity', v)}>
                    <SelectTrigger className={errors.severity ? 'border-destructive' : ''}>
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Impact <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.impact} onValueChange={(v) => handleChange('impact', v)}>
                    <SelectTrigger className={errors.impact ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Urgency <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.urgency} onValueChange={(v) => handleChange('urgency', v)}>
                    <SelectTrigger className={errors.urgency ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md text-sm border border-border">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-medium px-1.5 py-0",
                      calculatePriority() === 'P1' && 'bg-red-100 text-red-800 border-red-200',
                      calculatePriority() === 'P2' && 'bg-orange-100 text-orange-800 border-orange-200',
                      calculatePriority() === 'P3' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      calculatePriority() === 'P4' && 'bg-blue-100 text-blue-800 border-blue-200',
                    )}>
                      {calculatePriority()}
                    </Badge>
                    <span className="text-muted-foreground text-xs ml-2">(Auto-calculated)</span>
                  </div>
                </div>
              </div>

              {/* Major Incident Toggle */}
              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <Label htmlFor="major-incident" className="text-sm font-medium text-red-900">
                    Major Incident
                  </Label>
                  <p className="text-xs text-red-700 mt-0.5">
                    Flag this as a major incident requiring immediate executive attention
                  </p>
                </div>
                <Switch
                  id="major-incident"
                  checked={formData.is_major_incident}
                  onCheckedChange={(v) => handleChange('is_major_incident', v)}
                />
              </div>
            </div>

            {/* Right Column - Context */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Context</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Source Department</Label>
                  <Select value={formData.source_department_id} onValueChange={(v) => handleChange('source_department_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Business Process</Label>
                  <Select value={formData.business_process_id} onValueChange={(v) => handleChange('business_process_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select process" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessProcesses?.map((bp) => (
                        <SelectItem key={bp.id} value={bp.id}>{bp.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Delivery Platform</Label>
                  <Select value={formData.delivery_platform} onValueChange={(v) => handleChange('delivery_platform', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_PLATFORMS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Release Version</Label>
                  <Select value={formData.release_version_id} onValueChange={(v) => handleChange('release_version_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {releaseVersions?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.version}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reporter</Label>
                <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md text-sm border border-border text-muted-foreground">
                  Current User (Auto-filled)
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Work Group</Label>
                <Select value={formData.assignee_workgroup_id} onValueChange={(v) => handleChange('assignee_workgroup_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workgroup" />
                  </SelectTrigger>
                  <SelectContent>
                    {workgroups?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Assignee</Label>
                <Select value={formData.assignee_id} onValueChange={(v) => handleChange('assignee_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Link Work Items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Linked Work Item</Label>
            <WorkItemSearch
              onSelect={(item) => setLinkedItems(prev => [...prev, item])}
              selected={linkedItems}
              onRemove={(id) => setLinkedItems(prev => prev.filter(i => i.id !== id))}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachments</Label>
            <div 
              className="border border-dashed border-border rounded-lg p-6"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="attachments"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="attachments"
                className="flex flex-col items-center justify-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="h-6 w-6" />
                <span className="text-sm">Click to attach files or drag and drop</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, PDF, DOC up to 10MB</span>
              </label>
              
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs flex-1 truncate">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <button type="button" onClick={() => removeAttachment(index)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/release/incidents/list')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
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
