/**
 * Bulk Assignment Form - Set assignee, priority, due date for selected tests
 */

import React from 'react';
import { Users, AlertTriangle, Wand2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface BulkAssignmentFormProps {
  assigneeId: string | null;
  onAssigneeChange: (value: string | null) => void;
  priority: string | null;
  onPriorityChange: (value: string | null) => void;
  dueDate: string | null;
  onDueDateChange: (value: string | null) => void;
  cycleEndDate?: string;
  useSmartAssignment: boolean;
  onSmartAssignmentChange: (value: boolean) => void;
}

// Mock team members - replace with actual data
const TEAM_MEMBERS = [
  { id: '1', name: 'Ahmed S.', avatar: null },
  { id: '2', name: 'Sara M.', avatar: null },
  { id: '3', name: 'Khalid A.', avatar: null },
  { id: '4', name: 'Fatima H.', avatar: null },
];

export function BulkAssignmentForm({
  assigneeId,
  onAssigneeChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  cycleEndDate,
  useSmartAssignment,
  onSmartAssignmentChange,
}: BulkAssignmentFormProps) {
  const isDueDateAfterCycleEnd = cycleEndDate && dueDate && dueDate > cycleEndDate;

  return (
    <div 
      className="p-4 border-t space-y-4"
      style={{ borderColor: CATALYST_V5.slate[200] }}
    >
      <h4 
        className="text-sm font-semibold flex items-center gap-2"
        style={{ color: CATALYST_V5.slate[700] }}
      >
        <Users className="h-4 w-4" />
        Bulk Assignment (Optional)
      </h4>

      {/* Smart Assignment Toggle */}
      <div 
        className="flex items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: CATALYST_V5.primaryLighter }}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" style={{ color: CATALYST_V5.primary }} />
          <div>
            <Label 
              className="text-sm font-medium cursor-pointer"
              style={{ color: CATALYST_V5.slate[700] }}
            >
              Smart Assignment
            </Label>
            <p 
              className="text-xs"
              style={{ color: CATALYST_V5.slate[500] }}
            >
              Auto-distribute based on workload
            </p>
          </div>
        </div>
        <Switch
          checked={useSmartAssignment}
          onCheckedChange={onSmartAssignmentChange}
        />
      </div>

      {/* Assignee Select */}
      <div className="space-y-1.5">
        <Label 
          className="text-xs font-medium"
          style={{ color: CATALYST_V5.slate[700] }}
        >
          Assign To
        </Label>
        <Select 
          value={assigneeId || ''} 
          onValueChange={(v) => onAssigneeChange(v || null)}
          disabled={useSmartAssignment}
        >
          <SelectTrigger 
            className="h-9"
            style={{ 
              borderColor: CATALYST_V5.slate[200],
              color: CATALYST_V5.slate[600],
              opacity: useSmartAssignment ? 0.5 : 1,
            }}
          >
            <SelectValue placeholder="Leave unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Leave unassigned</SelectItem>
            {TEAM_MEMBERS.map(member => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium"
                    style={{ backgroundColor: CATALYST_V5.primary }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  {member.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority Select */}
      <div className="space-y-1.5">
        <Label 
          className="text-xs font-medium"
          style={{ color: CATALYST_V5.slate[700] }}
        >
          Override Priority
        </Label>
        <Select 
          value={priority || ''} 
          onValueChange={(v) => onPriorityChange(v || null)}
        >
          <SelectTrigger 
            className="h-9"
            style={{ 
              borderColor: CATALYST_V5.slate[200],
              color: CATALYST_V5.slate[600],
            }}
          >
            <SelectValue placeholder="Keep original" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Keep Original</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div className="space-y-1.5">
        <Label 
          className="text-xs font-medium"
          style={{ color: CATALYST_V5.slate[700] }}
        >
          Due Date
        </Label>
        <Input
          type="date"
          value={dueDate || ''}
          onChange={(e) => onDueDateChange(e.target.value || null)}
          className="h-9"
          style={{ 
            borderColor: isDueDateAfterCycleEnd ? CATALYST_V5.warning : CATALYST_V5.slate[200],
            color: CATALYST_V5.slate[600],
          }}
        />
        {isDueDateAfterCycleEnd && (
          <div 
            className="flex items-center gap-1.5 text-xs mt-1"
            style={{ color: CATALYST_V5.warning }}
          >
            <AlertTriangle className="h-3 w-3" />
            Due date exceeds cycle end date ({cycleEndDate})
          </div>
        )}
      </div>
    </div>
  );
}
