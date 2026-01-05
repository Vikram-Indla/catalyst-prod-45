/**
 * Properties Tab Component
 * Quick access to status, priority, type, and other properties
 */

import React from 'react';
import {
  User,
  Folder,
  Tag,
  Clock,
  Settings,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CaseStatus } from '../../../../api/types';

interface PropertiesTabProps {
  status: CaseStatus;
  priorityId: string;
  typeId: string;
  folderId: string;
  estimatedTime: string;
  selectedLabels: string[];
  priorities: { id: string; name: string; color: string }[];
  caseTypes: { id: string; name: string }[];
  folders: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  onStatusChange: (value: CaseStatus) => void;
  onPriorityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onEstimatedTimeChange: (value: string) => void;
  onLabelsChange: (labels: string[]) => void;
}

const STATUS_OPTIONS: { value: CaseStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'ready', label: 'Ready', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'approved', label: 'Approved', color: 'bg-success/10 text-success border-success/20' },
  { value: 'needs_update', label: 'Needs Update', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'deprecated', label: 'Deprecated', color: 'bg-muted text-muted-foreground border-border' },
];

interface PropertyRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function PropertyRow({ icon, label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 w-[100px] shrink-0">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function PropertiesTab({
  status,
  priorityId,
  typeId,
  folderId,
  estimatedTime,
  selectedLabels,
  priorities,
  caseTypes,
  folders,
  labels,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onFolderChange,
  onEstimatedTimeChange,
  onLabelsChange,
}: PropertiesTabProps) {
  const currentStatus = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  const currentPriority = priorities.find(p => p.id === priorityId);

  const toggleLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      onLabelsChange(selectedLabels.filter(id => id !== labelId));
    } else {
      onLabelsChange([...selectedLabels, labelId]);
    }
  };

  return (
    <div className="space-y-1">
      {/* Status */}
      <PropertyRow icon={<Settings className="h-3.5 w-3.5" />} label="Status">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted/50">
            <Badge
              variant="outline"
              className={cn('text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5', currentStatus.color)}
            >
              {currentStatus.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase', opt.color)}>
                  {opt.label}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Priority */}
      <PropertyRow icon={<div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: currentPriority?.color || '#888' }} />} label="Priority">
        <Select value={priorityId} onValueChange={onPriorityChange}>
          <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted/50">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Type */}
      <PropertyRow icon={<Tag className="h-3.5 w-3.5" />} label="Type">
        <Select value={typeId} onValueChange={onTypeChange}>
          <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted/50">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {caseTypes.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Folder */}
      <PropertyRow icon={<Folder className="h-3.5 w-3.5" />} label="Folder">
        <Select value={folderId || 'root'} onValueChange={(v) => onFolderChange(v === 'root' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted/50">
            <SelectValue placeholder="Root folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="root" className="text-xs">Root folder</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Estimated Time */}
      <PropertyRow icon={<Clock className="h-3.5 w-3.5" />} label="Est. Time">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={estimatedTime}
            onChange={(e) => onEstimatedTimeChange(e.target.value)}
            placeholder="0"
            className="h-8 w-16 text-xs text-center border-none bg-transparent hover:bg-muted/50"
          />
          <span className="text-xs text-muted-foreground">minutes</span>
        </div>
      </PropertyRow>

      {/* Labels */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Labels
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const isSelected = selectedLabels.includes(label.id);
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                  isSelected
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:border-primary/20 hover:text-foreground'
                )}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: label.color }} />
                {label.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
