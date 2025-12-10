import { ObjectiveV2 } from '@/hooks/useObjectivesV2';
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

export interface ObjectiveFormData {
  name: string;
  description: string;
  notes: string;
  theme_id: string;
  status: string;
  health: string;
  start_date: string;
  due_date: string;
  owner_id: string;
}

interface ObjectiveOverviewTabV2Props {
  formData: ObjectiveFormData;
  onChange: (data: ObjectiveFormData) => void;
  objective: ObjectiveV2;
}

export function ObjectiveOverviewTabV2({ formData, onChange, objective }: ObjectiveOverviewTabV2Props) {
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

  // Update a single field - NO auto-save on blur
  const handleFieldChange = (field: keyof ObjectiveFormData, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Name (required) */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className={`font-medium ${!formData.name.trim() ? 'border-destructive' : ''}`}
          required
        />
        {!formData.name.trim() && (
          <p className="text-xs text-destructive">Name is required</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          rows={3}
          placeholder="Add a description..."
        />
      </div>

      {/* Theme (required) */}
      <div className="space-y-2">
        <Label>Theme *</Label>
        <Select
          value={formData.theme_id || ''}
          onValueChange={(v) => handleFieldChange('theme_id', v || '')}
        >
          <SelectTrigger className={!formData.theme_id ? 'border-destructive' : ''}>
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
        {!formData.theme_id && (
          <p className="text-xs text-destructive">Theme is required for v2 objectives</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleFieldChange('status', v)}
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
            value={formData.health || 'at_risk'}
            onValueChange={(v) => handleFieldChange('health', v)}
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
            value={formData.start_date || ''}
            onChange={(e) => handleFieldChange('start_date', e.target.value)}
          />
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => handleFieldChange('due_date', e.target.value)}
          />
        </div>
      </div>

      {/* Owner */}
      <div className="space-y-2">
        <Label>Owner</Label>
        <Select
          value={formData.owner_id || '__unassigned__'}
          onValueChange={(v) => handleFieldChange('owner_id', v === '__unassigned__' ? '' : v)}
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
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          rows={3}
          placeholder="Add notes..."
        />
      </div>
    </div>
  );
}
