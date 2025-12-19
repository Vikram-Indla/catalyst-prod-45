import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCreateIncident, useReleaseVersions } from '@/hooks/useIncidents';
import { SeverityLevel, SupportLevel, ImpactLevel, UrgencyLevel } from '@/types/incident';
import { calculatePriority } from '@/utils/incidentLifecycle';
import { toast } from 'sonner';
import { AlertTriangle, Info } from 'lucide-react';

interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateIncidentDialog({ open, onOpenChange }: CreateIncidentDialogProps) {
  const navigate = useNavigate();
  const createIncident = useCreateIncident();
  const { data: releaseVersions } = useReleaseVersions();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'incident' as 'incident' | 'defect',
    support_level: 'L1' as SupportLevel,
    severity: 'SEV3' as SeverityLevel,
    impact: 'medium' as ImpactLevel,
    urgency: 'medium' as UrgencyLevel,
    environment: 'prod' as 'prod' | 'qa' | 'stage',
    release_version_id: '',
    is_major_incident: false,
    target_date: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derived priority (read-only)
  const derivedPriority = useMemo(() => 
    calculatePriority(formData.severity, formData.impact, formData.urgency),
    [formData.severity, formData.impact, formData.urgency]
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.release_version_id) {
      newErrors.release_version_id = 'Release Version is required';
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
        delivery_stage: formData.environment,
        is_major_incident: formData.is_major_incident,
        target_date: formData.target_date || undefined,
      });

      onOpenChange(false);
      
      // Navigate to detail page with success state
      if (result?.id) {
        navigate(`/release/incidents/${result.id}?created=true`);
      }
    } catch (error: any) {
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      incident_type: 'incident',
      support_level: 'L1',
      severity: 'SEV3',
      impact: 'medium',
      urgency: 'medium',
      environment: 'prod',
      release_version_id: '',
      is_major_incident: false,
      target_date: '',
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-sm font-semibold">Create Incident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* LEFT COLUMN - Primary Details */}
            <div className="p-5 space-y-5">
              {/* Section: Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</h3>
                
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-medium">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Brief description of the incident"
                    className={`h-8 text-sm ${errors.title ? 'border-destructive' : ''}`}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detailed description, steps to reproduce, impact..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>

              {/* Section: Classification */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Classification</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Incident Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.incident_type}
                      onValueChange={(v) => handleChange('incident_type', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident">Incident</SelectItem>
                        <SelectItem value="defect">Defect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Support Level <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.support_level}
                      onValueChange={(v) => handleChange('support_level', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L1">L1 - Frontline</SelectItem>
                        <SelectItem value="L2">L2 - Technical</SelectItem>
                        <SelectItem value="L3">L3 - Specialist</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.support_level === 'L3' && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        L3 requires committee approval for conversion
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Severity <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(v) => handleChange('severity', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
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
                    <Label className="text-xs font-medium">
                      Impact <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.impact}
                      onValueChange={(v) => handleChange('impact', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
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
                    <Label className="text-xs font-medium">
                      Urgency <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(v) => handleChange('urgency', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Context */}
            <div className="p-5 space-y-5 bg-muted/30">
              {/* Section: Context */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Context</h3>

                {/* Derived Priority (Read-only) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Priority (Derived)</Label>
                  <div className="flex items-center gap-2 h-8 px-3 bg-background border border-border rounded-md">
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-1.5 py-0 ${
                        derivedPriority === 'P1' ? 'border-rose-600 text-rose-700 bg-rose-50' :
                        derivedPriority === 'P2' ? 'border-amber-600 text-amber-700 bg-amber-50' :
                        derivedPriority === 'P3' ? 'border-slate-500 text-slate-600 bg-slate-50' :
                        'border-slate-400 text-slate-500 bg-slate-50'
                      }`}
                    >
                      Priority: {derivedPriority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Auto-calculated</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Environment</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(v) => handleChange('environment', v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prod">Production</SelectItem>
                      <SelectItem value="qa">QA</SelectItem>
                      <SelectItem value="stage">Staging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Release Version <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.release_version_id}
                    onValueChange={(v) => handleChange('release_version_id', v)}
                  >
                    <SelectTrigger className={`h-8 text-sm ${errors.release_version_id ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {releaseVersions?.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.version} {version.name && `- ${version.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.release_version_id && (
                    <p className="text-xs text-destructive">{errors.release_version_id}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Target Resolution Date</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => handleChange('target_date', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Major Incident Toggle */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flags</h3>
                
                <div className="flex items-start justify-between gap-3 p-3 border border-border rounded-md bg-background">
                  <div className="space-y-0.5">
                    <Label htmlFor="major-incident" className="text-xs font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Major Incident
                    </Label>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Escalates to executive team, triggers war-room protocol
                    </p>
                  </div>
                  <Switch
                    id="major-incident"
                    checked={formData.is_major_incident}
                    onCheckedChange={(v) => handleChange('is_major_incident', v)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 px-6 py-3 border-t border-border bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createIncident.isPending}
            >
              {createIncident.isPending ? 'Creating...' : 'Create & Open Incident'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
