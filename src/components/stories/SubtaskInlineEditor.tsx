/**
 * SubtaskInlineEditor — Inline subtask creation with type buttons
 * Types: Frontend (blue), Backend (olive), Integration (amber), Technical (bronze)
 */

import { Trash2, Palette, Server, Plug, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SUBTASK_TYPES, type SubtaskInput, type SubtaskType } from '@/types/story';

interface SubtaskInlineEditorProps {
  subtasks: SubtaskInput[];
  onChange: (subtasks: SubtaskInput[]) => void;
  teamMembers: Array<{ id: string; full_name: string; avatar_url?: string }>;
  releases: Array<{ id: string; name: string }>;
  defaultReleaseId?: string;
}

const TYPE_ICONS: Record<SubtaskType, React.ReactNode> = {
  frontend: <Palette className="h-3 w-3" />,
  backend: <Server className="h-3 w-3" />,
  integration: <Plug className="h-3 w-3" />,
  technical: <Settings className="h-3 w-3" />,
};

export function SubtaskInlineEditor({
  subtasks,
  onChange,
  teamMembers,
  releases,
  defaultReleaseId,
}: SubtaskInlineEditorProps) {
  const addSubtask = (type: SubtaskType) => {
    onChange([
      ...subtasks,
      {
        title: '',
        type,
        assignee_id: undefined,
        release_id: defaultReleaseId,
      },
    ]);
  };

  const updateSubtask = (index: number, updates: Partial<SubtaskInput>) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeSubtask = (index: number) => {
    onChange(subtasks.filter((_, i) => i !== index));
  };

  const getTypeConfig = (type: SubtaskType) => {
    return SUBTASK_TYPES.find(t => t.type === type) || SUBTASK_TYPES[3];
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Subtasks</h4>
          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
            {subtasks.filter(s => s.title.trim()).length}
          </span>
        </div>
      </div>

      {/* Subtask List */}
      <div className="space-y-2">
        {subtasks.map((subtask, index) => {
          const typeConfig = getTypeConfig(subtask.type);
          return (
            <div
              key={index}
              className="flex items-center gap-2 p-3 rounded-md bg-muted/50"
              style={{ borderLeft: `3px solid ${typeConfig.color}` }}
            >
              {/* Type Badge */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
              >
                {TYPE_ICONS[subtask.type]}
                <span>{typeConfig.label}</span>
              </div>

              {/* Title Input */}
              <Input
                value={subtask.title}
                onChange={(e) => updateSubtask(index, { title: e.target.value })}
                placeholder="Subtask title..."
                className="flex-1 h-8 text-sm"
              />

              {/* Assignee Select */}
              <Select
                value={subtask.assignee_id || ''}
                onValueChange={(v) => updateSubtask(index, { assignee_id: v || undefined })}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Delete Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSubtask(index)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Type Buttons */}
      <div className="flex items-center gap-2">
        {SUBTASK_TYPES.map((typeConfig) => (
          <Button
            key={typeConfig.type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSubtask(typeConfig.type)}
            className="flex-1 border-dashed"
            style={{ 
              borderColor: `${typeConfig.color}50`,
              color: typeConfig.color,
            }}
          >
            {TYPE_ICONS[typeConfig.type]}
            <span className="ml-1.5 text-xs">{typeConfig.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
