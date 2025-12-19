import { useState } from 'react';
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
import { useCreateIncident, useReleaseVersions } from '@/hooks/useIncidents';
import { SeverityLevel, ImpactLevel, UrgencyLevel, DeliveryStage } from '@/types/incident';
import { toast } from 'sonner';

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
    severity: 'SEV3' as SeverityLevel,
    impact: 'medium' as ImpactLevel,
    urgency: 'medium' as UrgencyLevel,
    release_version_id: '',
    delivery_stage: 'prod' as DeliveryStage,
    is_major_incident: false,
    target_date: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
        delivery_stage: formData.delivery_stage,
        is_major_incident: formData.is_major_incident,
        target_date: formData.target_date || undefined,
      });

      toast.success('Incident created successfully');
      onOpenChange(false);
      
      // Redirect to detail page - incident immediately appears in list via query invalidation
      if (result?.id) {
        navigate(`/release/incidents/${result.id}`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create Incident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of the incident"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detailed description of the incident..."
              rows={4}
            />
          </div>

          {/* Row: Severity + Release Version */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => handleChange('severity', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <SelectItem value="SEV1">SEV1 - Critical</SelectItem>
                  <SelectItem value="SEV2">SEV2 - High</SelectItem>
                  <SelectItem value="SEV3">SEV3 - Medium</SelectItem>
                  <SelectItem value="SEV4">SEV4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Release Version <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.release_version_id}
                onValueChange={(v) => handleChange('release_version_id', v)}
              >
                <SelectTrigger className={errors.release_version_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  {releaseVersions?.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      {version.version} {version.name && `- ${version.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.release_version_id && (
                <p className="text-sm text-destructive">{errors.release_version_id}</p>
              )}
            </div>
          </div>

          {/* Row: Impact + Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Impact</Label>
              <Select
                value={formData.impact}
                onValueChange={(v) => handleChange('impact', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(v) => handleChange('urgency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Delivery Stage + Target Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delivery Stage</Label>
              <Select
                value={formData.delivery_stage}
                onValueChange={(v) => handleChange('delivery_stage', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => handleChange('target_date', e.target.value)}
              />
            </div>
          </div>

          {/* Major Incident Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="major-incident">Major Incident</Label>
              <p className="text-sm text-muted-foreground">
                Flag this as a major incident requiring immediate attention
              </p>
            </div>
            <Switch
              id="major-incident"
              checked={formData.is_major_incident}
              onCheckedChange={(v) => handleChange('is_major_incident', v)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
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
