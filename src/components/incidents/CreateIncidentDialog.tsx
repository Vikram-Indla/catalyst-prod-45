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
import { Separator } from '@/components/ui/separator';
import { useCreateIncident, useReleaseVersions } from '@/hooks/useIncidents';
import { SeverityLevel, SupportLevel, ImpactLevel, UrgencyLevel } from '@/types/incident';
import { calculatePriority } from '@/utils/incidentLifecycle';
import { toast } from 'sonner';
import { User } from 'lucide-react';
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
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
    incident_type: 'incident' as 'incident' | 'defect' | 'operational',
    support_level: 'L1' as SupportLevel,
    severity: 'SEV3' as SeverityLevel,
    impact: 'medium' as ImpactLevel,
    urgency: 'medium' as UrgencyLevel,
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
        is_major_incident: formData.is_major_incident,
        target_date: formData.target_date || undefined,
        // NOTE: delivery_stage removed - incidents are implicitly production
      });

      onOpenChange(false);
      
      // Navigate to detail page
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
      release_version_id: '',
      is_major_incident: false,
      target_date: '',
    });
    setErrors({});
  };

  const priorityClassName = cn(
    'text-[9px] px-1.5 py-0 h-4 font-medium border',
    derivedPriority === 'P1' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' :
    derivedPriority === 'P2' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
    'bg-muted text-muted-foreground border-border'
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border bg-muted/30">
          <DialogTitle className="text-sm font-semibold">Create Incident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Brief description of the incident"
                className={cn('h-9 text-sm', errors.title && 'border-destructive')}
                autoFocus
              />
              {errors.title && (
                <p className="text-[10px] text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Detailed description, steps to reproduce, impact..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <Separator />

            {/* Classification Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
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
                    <SelectItem value="operational" className="text-xs">Operational Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Release <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.release_version_id}
                  onValueChange={(v) => handleChange('release_version_id', v)}
                >
                  <SelectTrigger className={cn('h-8 text-xs', errors.release_version_id && 'border-destructive')}>
                    <SelectValue placeholder="Select..." />
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

            {/* Severity / Impact / Urgency Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
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

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
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

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
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

              {/* Derived Priority */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Priority
                </Label>
                <div className="flex items-center h-8 px-2 bg-muted/50 border border-border rounded-md">
                  <Badge variant="outline" className={priorityClassName}>
                    {derivedPriority}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground ml-1.5">Auto</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Context Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Reporter */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Reporter</Label>
                <div className="flex items-center gap-2 h-8 px-2.5 bg-muted/50 border border-border rounded-md">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs truncate">{currentUser?.full_name || currentUser?.email || 'Current User'}</span>
                </div>
              </div>

              {/* Target Date */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Target Resolution</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => handleChange('target_date', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Major Incident Toggle */}
            <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
              <div>
                <p className="text-xs font-medium">Major Incident</p>
                <p className="text-[10px] text-muted-foreground">
                  Flags this as a high-visibility incident requiring executive attention
                </p>
              </div>
              <Switch
                checked={formData.is_major_incident}
                onCheckedChange={(v) => handleChange('is_major_incident', v)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm"
              className="h-8 px-4 text-xs"
              disabled={createIncident.isPending}
            >
              {createIncident.isPending ? 'Creating...' : 'Create Incident'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
