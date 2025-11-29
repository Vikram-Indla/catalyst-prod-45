import { useState } from 'react';
import { X, AlertTriangle, Calendar, Target, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FeatureQuickViewProps {
  feature: any;
  onClose: () => void;
}

export function FeatureQuickView({ feature, onClose }: FeatureQuickViewProps) {
  const queryClient = useQueryClient();
  const displayId = feature?.display_id || feature?.id?.slice(0, 8) || 'N/A';
  
  const [formData, setFormData] = useState({
    name: feature?.name || '',
    status: feature?.status || 'not-started',
    health: feature?.health || 'on-track',
    blocked: feature?.blocked || false,
    blocked_reason: feature?.blocked_reason || '',
    team_target_completion_sprint_id: feature?.team_target_completion_sprint_id || '',
    business_value: feature?.business_value || '',
    time_criticality: feature?.time_criticality || '',
    risk_reduction: feature?.risk_reduction || '',
    job_size: feature?.job_size || '',
    notes: feature?.notes || '',
  });
  
  const { data: sprints } = useQuery({
    queryKey: ['sprints', feature?.pi_id],
    queryFn: async () => {
      if (!feature?.pi_id) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('pi_id', feature.pi_id)
        .order('start_date');
      if (error) throw error;
      return data || [];
    },
    enabled: !!feature?.pi_id,
  });
  
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('features')
        .update({
          ...formData,
          business_value: formData.business_value ? Number(formData.business_value) : null,
          time_criticality: formData.time_criticality ? Number(formData.time_criticality) : null,
          risk_reduction: formData.risk_reduction ? Number(formData.risk_reduction) : null,
          job_size: formData.job_size ? Number(formData.job_size) : null,
        })
        .eq('id', feature.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['program-board-features'] });
      toast.success('Feature updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update feature:', error);
      toast.error('Failed to update feature');
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in-progress': return 'bg-info';
      case 'blocked': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };
  
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'on-track': return 'text-success';
      case 'at-risk': return 'text-warning';
      case 'off-track': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };
  
  const wsjfScore = formData.business_value && formData.time_criticality && 
                     formData.risk_reduction && formData.job_size && Number(formData.job_size) > 0
    ? ((Number(formData.business_value) + Number(formData.time_criticality) + Number(formData.risk_reduction)) / Number(formData.job_size)).toFixed(2)
    : 'N/A';
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(formData.status)}`} />
          <div>
            <h2 className="font-semibold text-base">Feature #{displayId}</h2>
            <p className="text-xs text-muted-foreground">Quick Edit View</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Feature Name */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Feature Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="text-sm"
          />
        </div>
        
        {/* Status & Health */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Target className="h-3 w-3" />
              Health
            </Label>
            <Select value={formData.health} onValueChange={(value) => setFormData({ ...formData, health: value })}>
              <SelectTrigger className={`text-sm h-9 ${getHealthColor(formData.health)}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="on-track">On Track</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="off-track">Off Track</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Team Target Sprint */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Team Target Completion Sprint
          </Label>
          <Select 
            value={formData.team_target_completion_sprint_id} 
            onValueChange={(value) => setFormData({ ...formData, team_target_completion_sprint_id: value })}
          >
            <SelectTrigger className="text-sm h-9">
              <SelectValue placeholder="Select sprint..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {sprints?.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        {/* WSJF Inputs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              WSJF Scoring
            </Label>
            <Badge variant="outline" className="text-xs">
              Score: {wsjfScore}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Business Value</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.business_value}
                onChange={(e) => setFormData({ ...formData, business_value: e.target.value })}
                className="text-sm h-8"
                placeholder="1-100"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Time Criticality</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.time_criticality}
                onChange={(e) => setFormData({ ...formData, time_criticality: e.target.value })}
                className="text-sm h-8"
                placeholder="1-100"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Risk Reduction</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.risk_reduction}
                onChange={(e) => setFormData({ ...formData, risk_reduction: e.target.value })}
                className="text-sm h-8"
                placeholder="1-100"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Job Size</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.job_size}
                onChange={(e) => setFormData({ ...formData, job_size: e.target.value })}
                className="text-sm h-8"
                placeholder="1-100"
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Blocked Status */}
        {formData.blocked && (
          <div className="space-y-2 p-3 bg-destructive/10 dark:bg-destructive/20 rounded border border-destructive/50">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <Label className="text-xs font-semibold">Blocked</Label>
            </div>
            <Textarea
              value={formData.blocked_reason}
              onChange={(e) => setFormData({ ...formData, blocked_reason: e.target.value })}
              placeholder="Reason for blockage..."
              className="text-sm min-h-[60px] bg-background"
            />
          </div>
        )}
        
        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            className="text-sm min-h-[80px]"
          />
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
