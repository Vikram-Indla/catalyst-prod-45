import { useState, useEffect } from 'react';
import { ObjectiveV2, useUpdateObjectiveV2, ObjectiveStatusV2, ObjectiveHealthV2 } from '@/hooks/useObjectivesV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

interface ObjectiveOverviewTabV2Props {
  objective: ObjectiveV2;
}

export function ObjectiveOverviewTabV2({ objective }: ObjectiveOverviewTabV2Props) {
  const updateObjective = useUpdateObjectiveV2();
  
  const [name, setName] = useState(objective.name);
  const [description, setDescription] = useState(objective.description || '');
  const [notes, setNotes] = useState((objective as any).notes || '');

  // Sync state when objective changes
  useEffect(() => {
    setName(objective.name);
    setDescription(objective.description || '');
    setNotes((objective as any).notes || '');
  }, [objective]);

  // Fetch themes
  const { data: themes } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users
  const { data: users } = useQuery({
    queryKey: ['profiles-for-owner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const handleFieldUpdate = (field: string, value: any) => {
    updateObjective.mutate({ id: objective.id, [field]: value });
  };

  const handleNameBlur = () => {
    if (name.trim() !== objective.name) {
      handleFieldUpdate('name', name.trim());
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (objective.description || '')) {
      handleFieldUpdate('description', description || null);
    }
  };

  const handleNotesBlur = () => {
    if (notes !== ((objective as any).notes || '')) {
      handleFieldUpdate('notes', notes || null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Name (required) */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="font-medium"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          rows={3}
          placeholder="Add a description..."
        />
      </div>

      {/* Theme (required) */}
      <div className="space-y-2">
        <Label>Theme *</Label>
        <Select
          value={objective.theme_id || ''}
          onValueChange={(v) => handleFieldUpdate('theme_id', v || null)}
        >
          <SelectTrigger className={!objective.theme_id ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select theme (required)" />
          </SelectTrigger>
          <SelectContent>
            {themes?.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!objective.theme_id && (
          <p className="text-xs text-destructive">Theme is required for v2 objectives</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={objective.status}
            onValueChange={(v) => handleFieldUpdate('status', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="off_track">Off Track</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Health */}
        <div className="space-y-2">
          <Label>Health</Label>
          <Select
            value={objective.health || 'at_risk'}
            onValueChange={(v) => handleFieldUpdate('health', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={objective.start_date || ''}
            onChange={(e) => handleFieldUpdate('start_date', e.target.value || null)}
          />
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={objective.due_date || ''}
            onChange={(e) => handleFieldUpdate('due_date', e.target.value || null)}
          />
        </div>
      </div>

      {/* Owner */}
      <div className="space-y-2">
        <Label>Owner</Label>
        <Select
          value={objective.owner_id || '__unassigned__'}
          onValueChange={(v) => handleFieldUpdate('owner_id', v === '__unassigned__' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {users?.filter(user => user.id).map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="Add notes..."
        />
      </div>

      {/* Read-only metrics */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Calculated Metrics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Overall Progress:</span>
            <span className="ml-2 font-medium">{objective.overall_progress || 0}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Health:</span>
            <span className="ml-2 font-medium capitalize">{objective.health?.replace('_', ' ') || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
