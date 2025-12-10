import { useState } from 'react';
import { ObjectiveV2, useUpdateObjectiveV2, ObjectiveStatusV2 } from '@/hooks/useObjectivesV2';
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

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="name">Title</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="font-medium"
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
          rows={4}
          placeholder="Add a description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Theme */}
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select
            value={objective.theme_id || ''}
            onValueChange={(v) => handleFieldUpdate('theme_id', v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {themes?.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Owner */}
        <div className="space-y-2">
          <Label>Owner</Label>
          <Select
            value={objective.owner_id || ''}
            onValueChange={(v) => handleFieldUpdate('owner_id', v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

        {/* Visibility */}
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select
            value={objective.visibility || 'org-wide'}
            onValueChange={(v) => handleFieldUpdate('visibility', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org-wide">Organization-wide</SelectItem>
              <SelectItem value="business-unit">Business Unit</SelectItem>
              <SelectItem value="product-line">Product Line</SelectItem>
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

      {/* Read-only fields */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Metrics</h4>
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
