/**
 * EpicDetailPanel - Right panel for split panel layout
 * Full detail view of selected epic with inline editing
 * Matches RequestDetailPanel UX exactly
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Link2, Edit, Copy, Trash2, 
  FileText, Check, ArrowLeft, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEpicStatuses } from '@/hooks/useEpicStatuses';

export interface EpicDetailItem {
  id: string;
  epicKey: string;
  name: string;
  description: string | null;
  status: string;
  themeName: string | null;
  themeId: string | null;
  quarters: string[];
  assigneeName: string | null;
  assigneeId: string | null;
  mvp: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface EpicDetailPanelProps {
  epic: EpicDetailItem | null;
  onUpdateField: (field: string, value: any) => Promise<void>;
  onOpenDrawer: () => void;
  onClone: () => void;
  onDelete: () => void;
  onMobileBack?: () => void;
  showMobileBack?: boolean;
}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-blue-500',
  analyzing: 'bg-blue-500',
  approved: 'bg-amber-500',
  in_progress: 'bg-amber-500',
  done: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

const getStatusColor = (value: string) => STATUS_COLORS[value] || 'bg-gray-400';

// Quarter options
const QUARTER_OPTIONS = [
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
];

// Copy Link button component
function CopyLinkButton({ epicKey }: { epicKey: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    const url = `${window.location.origin}${window.location.pathname}?epic=${epicKey}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </Button>
  );
}

// Avatar component
function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
        sizeClasses
      )}
      style={{ backgroundColor: 'hsl(var(--secondary-bronze))' }}
    >
      {initials}
    </div>
  );
}

// Field label component
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)' }}>
      {children}
    </label>
  );
}

export function EpicDetailPanel({
  epic,
  onUpdateField,
  onOpenDrawer,
  onClone,
  onDelete,
  onMobileBack,
  showMobileBack = false,
}: EpicDetailPanelProps) {
  const queryClient = useQueryClient();

  // Fetch epic statuses
  const { data: epicStatuses = [] } = useActiveEpicStatuses();

  // Fetch strategic themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch assignees
  const { data: assignees = [] } = useQuery({
    queryKey: ['profiles-for-assignee'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .not('full_name', 'is', null)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  if (!epic) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-2)' }}>
            <FileText className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-1)' }}>No epic selected</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Select an epic from the list to view details</p>
        </div>
      </div>
    );
  }

  const statusKey = epic.status?.toLowerCase().replace(/\s+/g, '_') || 'proposed';
  const currentStatus = epicStatuses.find(s => s.value === statusKey);
  const statusLabel = currentStatus?.label || epic.status || 'Proposed';
  const statusColor = getStatusColor(statusKey);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-start gap-2">
            {/* Mobile Back Button */}
            {showMobileBack && onMobileBack && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 -ml-2"
                onClick={onMobileBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              {/* Key + Open in Drawer */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span 
                  className="text-sm font-mono font-medium cursor-pointer hover:underline" 
                  style={{ color: 'hsl(var(--secondary-bronze))' }}
                  onClick={onOpenDrawer}
                >
                  {epic.epicKey}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2 gap-1" onClick={onOpenDrawer}>
                  <ExternalLink className="w-3 h-3" />
                  <span className="text-xs">Open</span>
                </Button>
                {epic.mvp && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">
                    MVP
                  </Badge>
                )}
              </div>
              {/* Title */}
              <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                {epic.name}
              </h1>
            </div>
          </div>

          {/* Copy Link Button */}
          <div className="ml-2 md:ml-4 shrink-0">
            <CopyLinkButton epicKey={epic.epicKey} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="space-y-5">
          {/* Row 1: Status | MVP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select 
                value={statusKey} 
                onValueChange={(value) => onUpdateField('status', value)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', statusColor)} />
                      {statusLabel}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {epicStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', getStatusColor(status.value))} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>MVP Epic</FieldLabel>
              <div 
                className="h-10 px-3 rounded-md flex items-center justify-between"
                style={{ backgroundColor: 'hsl(var(--secondary-olive) / 0.08)', border: '1px solid hsl(var(--secondary-olive) / 0.2)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {epic.mvp ? 'Yes' : 'No'}
                </span>
                <Switch 
                  id="mvp"
                  checked={epic.mvp}
                  onCheckedChange={(checked) => onUpdateField('mvp', checked)}
                  className="data-[state=checked]:bg-[hsl(var(--secondary-olive))]"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Theme | Target Quarter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <FieldLabel>Theme</FieldLabel>
              <Select 
                value={epic.themeId || 'none'} 
                onValueChange={(value) => onUpdateField('theme_id', value === 'none' ? null : value)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select theme">
                    {epic.themeName || 'No theme'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No theme</SelectItem>
                  {themes.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Target Quarter</FieldLabel>
              <Select 
                value={epic.quarters?.[0] || 'none'} 
                onValueChange={(value) => onUpdateField('quarters', value === 'none' ? [] : [value])}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select quarter">
                    {epic.quarters?.[0] || 'No quarter'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No quarter</SelectItem>
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Assignee */}
          <div>
            <FieldLabel>Assignee</FieldLabel>
            <Select 
              value={epic.assigneeId || 'none'} 
              onValueChange={(value) => onUpdateField('assignee_id', value === 'none' ? null : value)}
            >
              <SelectTrigger 
                className="w-full h-10"
                style={{ 
                  backgroundColor: 'hsl(var(--secondary-bronze) / 0.08)', 
                  border: '1px solid hsl(var(--secondary-bronze) / 0.2)' 
                }}
              >
                <SelectValue>
                  {epic.assigneeName ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={epic.assigneeName} size="sm" />
                      <span>{epic.assigneeName}</span>
                    </div>
                  ) : (
                    'Unassigned'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={a.full_name || '?'} size="sm" />
                      <span>{a.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          {epic.description && (
            <div>
              <FieldLabel>Description</FieldLabel>
              <div 
                className="p-3 rounded-md text-sm"
                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-1)' }}
              >
                {epic.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 px-4 md:px-6 py-3 flex items-center justify-between gap-2 flex-wrap" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClone}>
            <Copy className="w-3.5 h-3.5" />
            Clone
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
        <Button size="sm" className="gap-1.5 bg-brand-primary hover:bg-brand-primary-hover" onClick={onOpenDrawer}>
          <Edit className="w-3.5 h-3.5" />
          Full Details
        </Button>
      </div>
    </div>
  );
}
