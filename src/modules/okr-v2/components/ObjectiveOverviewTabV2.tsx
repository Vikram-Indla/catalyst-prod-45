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
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';

export interface ObjectiveFormData {
  name: string;
  description: string;
  notes: string;
  theme_id: string;
  status: string;
  health: string;
  start_date: string;
  end_date: string;
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
    <div className="p-6 space-y-6 bg-background">
      {/* Name (required) */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">
          Name <span className="text-[#B85C5C]">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className={`font-medium bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)] ${!formData.name.trim() ? 'border-destructive' : ''}`}
          required
        />
        {!formData.name.trim() && (
          <p className="text-xs text-destructive">Name is required</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          rows={3}
          placeholder="Add a description..."
          className="bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)]"
        />
      </div>

      {/* Theme (required) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">
          Theme <span className="text-[#B85C5C]">*</span>
        </Label>
        <Select
          value={formData.theme_id || ''}
          onValueChange={(v) => handleFieldChange('theme_id', v || '')}
        >
          <SelectTrigger className={`bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)] ${!formData.theme_id ? 'border-destructive' : ''}`}>
            <SelectValue placeholder="Select theme (required)" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
            {themes?.map((theme) => (
              <SelectItem key={theme.id} value={theme.id} className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!formData.theme_id && (
          <p className="text-xs text-destructive">Theme is required</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleFieldChange('status', v)}
          >
            <SelectTrigger className="bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
              <SelectItem value="pending" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Pending</SelectItem>
              <SelectItem value="in_progress" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">In Progress</SelectItem>
              <SelectItem value="on_track" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">On Track</SelectItem>
              <SelectItem value="at_risk" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">At Risk</SelectItem>
              <SelectItem value="off_track" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Off Track</SelectItem>
              <SelectItem value="completed" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Health */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">Health</Label>
          <Select
            value={formData.health || 'at_risk'}
            onValueChange={(v) => handleFieldChange('health', v)}
          >
            <SelectTrigger className="bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
              <SelectItem value="good" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Good</SelectItem>
              <SelectItem value="fair" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Fair</SelectItem>
              <SelectItem value="poor" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Poor</SelectItem>
              <SelectItem value="at_risk" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">At Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">Start Date</Label>
          <CatalystDatePicker
            value={formData.start_date || null}
            onChange={(date) => handleFieldChange('start_date', date ? date.toISOString().split('T')[0] : '')}
            placeholder="Pick start date"
            dateFormat="dd/MM/yyyy"
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">End Date</Label>
          <CatalystDatePicker
            value={formData.end_date || null}
            onChange={(date) => handleFieldChange('end_date', date ? date.toISOString().split('T')[0] : '')}
            placeholder="Pick end date"
            dateFormat="dd/MM/yyyy"
          />
        </div>
      </div>

      {/* Owner */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">Owner</Label>
        <Select
          value={formData.owner_id || '__unassigned__'}
          onValueChange={(v) => handleFieldChange('owner_id', v === '__unassigned__' ? '' : v)}
        >
          <SelectTrigger className="bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)]">
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
            <SelectItem value="__unassigned__" className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">Unassigned</SelectItem>
            {users?.filter(user => user.id).map((user) => (
              <SelectItem key={user.id} value={user.id} className="text-[#24292F] dark:text-[#E6EDF3] focus:bg-[#F6F8FA] dark:focus:bg-[#21262D]">
                {user.full_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          rows={3}
          placeholder="Add notes..."
          className="bg-white dark:bg-[#0D1117] border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681] focus:border-[#2563eb] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)]"
        />
      </div>
    </div>
  );
}
