import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { HealthBadge } from '@/components/shared/HealthBadge';

interface EpicDetailsTabFullProps {
  epic: any;
}

export function EpicDetailsTabFull({ epic }: EpicDetailsTabFullProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(epic);
  const queryClient = useQueryClient();

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data } = await supabase.from('strategic_themes').select('*').order('name');
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('*').order('name');
      return data;
    },
  });

  const { data: processSteps } = useQuery({
    queryKey: ['process-steps'],
    queryFn: async () => {
      const { data } = await supabase.from('process_steps').select('*').order('sort_order');
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('epics')
        .update(updates)
        .eq('id', epic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic updated successfully');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update epic');
    },
  });

  const toggleDateLock = () => {
    const newLockState = !epic.date_locked;
    const lockHistory = epic.date_lock_history || [];
    const newHistory = [
      ...lockHistory,
      {
        locked: newLockState,
        timestamp: new Date().toISOString(),
        dates: {
          start: epic.start_date,
          end: epic.end_date,
          target: epic.target_completion_date,
        },
        estimates: {
          points: epic.points_estimate,
          effort: epic.estimate,
        },
      },
    ];
    
    updateMutation.mutate({
      date_locked: newLockState,
      date_lock_history: newHistory,
    });
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (!isEditing) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Epic Details</h3>
          <Button onClick={() => setIsEditing(true)} size="sm">Edit</Button>
        </div>

        {/* Classification */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Classification</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <p className="text-sm font-medium">{epic.state || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className="text-sm font-medium">{epic.status || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm font-medium">{epic.epic_type || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">MVP</Label>
              <Badge variant={epic.mvp ? 'default' : 'outline'}>{epic.mvp ? 'Yes' : 'No'}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Health</Label>
            <div className="mt-1"><HealthBadge health={epic.health} /></div>
          </div>
        </div>

        {/* Context */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Context</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Theme</Label>
              <p className="text-sm">{epic.strategic_themes?.name || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Primary Program</Label>
              <p className="text-sm">{epic.programs?.name || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Owner</Label>
              <p className="text-sm">{epic.owner_id || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Report Color</Label>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: epic.report_color || '#3b82f6' }} />
                <span className="text-sm">{epic.report_color || '#3b82f6'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground">Dates</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDateLock}
              className="gap-2"
            >
              {epic.date_locked ? (
                <><Lock className="h-4 w-4" />Locked</>
              ) : (
                <><Unlock className="h-4 w-4" />Unlocked</>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Portfolio Ask Date</Label>
              <p className="text-sm">{epic.portfolio_ask_date ? new Date(epic.portfolio_ask_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Initiation Date</Label>
              <p className="text-sm">{epic.initiation_date ? new Date(epic.initiation_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <p className="text-sm">{epic.start_date ? new Date(epic.start_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <p className="text-sm">{epic.end_date ? new Date(epic.end_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Target Completion</Label>
              <p className="text-sm">{epic.target_completion_date ? new Date(epic.target_completion_date).toLocaleDateString() : '-'}</p>
            </div>
          </div>
          {epic.date_lock_history && epic.date_lock_history.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              View Lock History ({epic.date_lock_history.length} events)
            </Button>
          )}
        </div>

        {/* Financial & Estimation */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Financial & Estimation</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Capitalized</Label>
              <Badge variant={epic.capitalized ? 'default' : 'outline'}>{epic.capitalized ? 'Yes' : 'No'}</Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Budget</Label>
              <p className="text-sm font-medium">${(epic.budget || 0).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Estimation System</Label>
              <p className="text-sm">{epic.estimation_system || 'WSJF'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Estimate</Label>
              <p className="text-sm">{epic.estimate || 0} {epic.estimation_system === 'points' ? 'pts' : ''}</p>
            </div>
          </div>
        </div>

        {/* Strategic */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Strategic Analysis</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Strategic Value</Label>
              <p className="text-sm font-medium">{epic.strategic_value_score || '-'} / 100</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Effort SWAG</Label>
              <p className="text-sm font-medium">{epic.effort_swag || '-'} / 100</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Investment Type</Label>
              <p className="text-sm">{epic.investment_type || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quadrant</Label>
              <p className="text-sm">{epic.quadrant || '-'}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Strategic Driver</Label>
            <p className="text-sm">{epic.strategic_driver || '-'}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ability to Execute</Label>
            <p className="text-sm">{epic.ability_to_execute || '-'}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Customers</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {epic.customers && epic.customers.length > 0 ? (
                epic.customers.map((customer: string, i: number) => (
                  <Badge key={i} variant="outline">{customer}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <p className="text-sm whitespace-pre-wrap">{epic.description || 'No description'}</p>
        </div>
      </div>
    );
  }

  // Edit mode UI
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Epic Details</h3>
        <div className="flex gap-2">
          <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Edit form fields */}
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        
        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select
              value={formData.epic_type || ''}
              onValueChange={(value) => setFormData({ ...formData, epic_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enabler">Enabler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Investment Type</Label>
            <Select
              value={formData.investment_type || ''}
              onValueChange={(value) => setFormData({ ...formData, investment_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select investment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strategic">Strategic</SelectItem>
                <SelectItem value="regulatory">Regulatory</SelectItem>
                <SelectItem value="technical_debt">Technical Debt</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.mvp || false}
            onCheckedChange={(checked) => setFormData({ ...formData, mvp: checked })}
          />
          <Label>Mark as MVP</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.capitalized || false}
            onCheckedChange={(checked) => setFormData({ ...formData, capitalized: checked })}
          />
          <Label>Capitalized</Label>
        </div>
      </div>
    </div>
  );
}
