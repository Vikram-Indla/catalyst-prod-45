import { useState, useMemo, useEffect } from 'react';
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
import { useCreateIncident, useReleaseVersions, useWorkgroups } from '@/hooks/useIncidents';
import { SeverityLevel, SupportLevel, ImpactLevel, UrgencyLevel } from '@/types/incident';
import { calculatePriority } from '@/utils/incidentLifecycle';
import { toast } from 'sonner';
import { AlertTriangle, Info, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateIncidentDialog({ open, onOpenChange }: CreateIncidentDialogProps) {
  const navigate = useNavigate();
  const createIncident = useCreateIncident();
  const { data: releaseVersions } = useReleaseVersions();
  const { data: workgroups } = useWorkgroups();
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get profile info
        const { data: profile } = await supabase
          .from('incident_user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || user.email?.split('@')[0],
        });
      }
    };
    if (open) {
      fetchUser();
    }
  }, [open]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'incident' as 'incident' | 'defect' | 'outage',
    support_level: 'L1' as SupportLevel,
    severity: 'SEV3' as SeverityLevel,
    impact: 'medium' as ImpactLevel,
    urgency: 'medium' as UrgencyLevel,
    environment: 'prod' as 'prod' | 'qa' | 'stage',
    release_version_id: '',
    workgroup_id: '',
    assignee_id: '',
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
      workgroup_id: '',
      assignee_id: '',
      is_major_incident: false,
      target_date: '',
    });
    setErrors({});
  };

  const priorityClassName = cn(
    'text-[10px] px-1.5 py-0 h-5 font-medium border',
    derivedPriority === 'P1' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30' :
    derivedPriority === 'P2' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' :
    derivedPriority === 'P3' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' :
    'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30'
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[780px] p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">Create Incident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* LEFT COLUMN - Primary Details */}
            <div className="p-4 space-y-4">
              {/* Section: Details */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
                
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs font-medium">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Brief description of the incident"
                    className={cn('h-8 text-xs', errors.title && 'border-destructive')}
                  />
                  {errors.title && (
                    <p className="text-[10px] text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detailed description, steps to reproduce, impact..."
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>
              </div>

              {/* Section: Classification */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Classification</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.incident_type}
                      onValueChange={(v) => handleChange('incident_type', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident" className="text-xs">Incident</SelectItem>
                        <SelectItem value="defect" className="text-xs">Defect</SelectItem>
                        <SelectItem value="outage" className="text-xs">Outage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Support Level <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.support_level}
                      onValueChange={(v) => handleChange('support_level', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L1" className="text-xs">L1 - Frontline</SelectItem>
                        <SelectItem value="L2" className="text-xs">L2 - Technical</SelectItem>
                        <SelectItem value="L3" className="text-xs">L3 - Specialist</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.support_level === 'L3' && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Requires committee approval
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Severity <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(v) => handleChange('severity', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEV1" className="text-xs">SEV1 - Critical</SelectItem>
                        <SelectItem value="SEV2" className="text-xs">SEV2 - High</SelectItem>
                        <SelectItem value="SEV3" className="text-xs">SEV3 - Medium</SelectItem>
                        <SelectItem value="SEV4" className="text-xs">SEV4 - Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Impact <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.impact}
                      onValueChange={(v) => handleChange('impact', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high" className="text-xs">High</SelectItem>
                        <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                        <SelectItem value="low" className="text-xs">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Urgency <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(v) => handleChange('urgency', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high" className="text-xs">High</SelectItem>
                        <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                        <SelectItem value="low" className="text-xs">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Context */}
            <div className="p-4 space-y-4 bg-muted/30">
              {/* Section: Context */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Context</h3>

                {/* Reporter (Read-only) */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Reporter</Label>
                  <div className="flex items-center gap-2 h-8 px-3 bg-background border border-border rounded-md">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{currentUser?.full_name || currentUser?.email || 'Current User'}</span>
                  </div>
                </div>

                {/* Derived Priority (Read-only) */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Priority (Derived)</Label>
                  <div className="flex items-center gap-2 h-8 px-3 bg-background border border-border rounded-md">
                    <Badge variant="outline" className={priorityClassName}>
                      {derivedPriority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Auto-calculated</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Environment</Label>
                    <Select
                      value={formData.environment}
                      onValueChange={(v) => handleChange('environment', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prod" className="text-xs">Production</SelectItem>
                        <SelectItem value="qa" className="text-xs">QA</SelectItem>
                        <SelectItem value="stage" className="text-xs">Staging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Release <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.release_version_id}
                      onValueChange={(v) => handleChange('release_version_id', v)}
                    >
                      <SelectTrigger className={cn('h-8 text-xs', errors.release_version_id && 'border-destructive')}>
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {releaseVersions?.map((version) => (
                          <SelectItem key={version.id} value={version.id} className="text-xs">
                            {version.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.release_version_id && (
                      <p className="text-[10px] text-destructive">{errors.release_version_id}</p>
                    )}
                  </div>
                </div>

                {/* Workgroup */}
                {workgroups && workgroups.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Workgroup / Team</Label>
                    <Select
                      value={formData.workgroup_id}
                      onValueChange={(v) => handleChange('workgroup_id', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select workgroup (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {workgroups.map((wg) => (
                          <SelectItem key={wg.id} value={wg.id} className="text-xs">
                            {wg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Target Resolution</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => handleChange('target_date', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Major Incident Toggle */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Flags</h3>
                
                <div className="flex items-start justify-between gap-3 p-3 border border-border rounded-md bg-background">
                  <div className="space-y-0.5">
                    <Label htmlFor="major-incident" className="text-xs font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Major Incident
                    </Label>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Escalates to executive team
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
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs"
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
