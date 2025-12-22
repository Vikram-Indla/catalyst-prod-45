/**
 * RequestDetailPanel - Right panel for split panel layout
 * Full detail view of selected request with inline editing
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Share2, Bell, Edit, Paperclip, Copy, Link2, MessageSquare, Trash2, 
  UserPlus, AlertTriangle, FileText, Circle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

interface RequestItem {
  id: string;
  _dbId: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter?: string | null;
  assignee?: string | null;
  assigneeId?: string | null;
  department: string | null;
  departmentId?: string | null;
  businessOwner?: string | null;
  businessOwnerId?: string | null;
  businessAsk?: string | null;
  kickoff?: string | null;
  targetComplete?: string | null;
  deliveryTrack?: string | null;
  platform?: string | null;
  quarter: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  description?: string;
}

interface RequestDetailPanelProps {
  request: RequestItem | null;
  onUpdateField: (field: string, value: any) => void;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onOpenDrawer: () => void;
  onAttachment: () => void;
  onLink: () => void;
}

// Status options
const STATUS_OPTIONS = [
  { value: 'new_demand', label: 'New Demand', color: 'bg-blue-500' },
  { value: 'new_request', label: 'New Request', color: 'bg-amber-500' },
  { value: 'analyse', label: 'Analyse', color: 'bg-purple-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'implement', label: 'Implement', color: 'bg-cyan-500' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-400' },
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'unscored', label: 'Unscored', color: 'bg-gray-400' },
];

// Quarter options
const QUARTER_OPTIONS = [
  'Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025',
  'Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026',
  'Q1-2027', 'Q2-2027',
];

// Department options
const DEPARTMENT_OPTIONS = [
  'Standard Incentive',
  'Special Programs',
  'Investment Services',
  'Industrial Development',
  'Regulatory Affairs',
];

export function RequestDetailPanel({
  request,
  onUpdateField,
  onEdit,
  onClone,
  onDelete,
  onOpenDrawer,
  onAttachment,
  onLink,
}: RequestDetailPanelProps) {
  if (!request) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-2)' }}>
            <FileText className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-1)' }}>No request selected</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Select a request from the list to view details</p>
        </div>
      </div>
    );
  }

  const statusKey = request.processStep?.toLowerCase().replace(/\s+/g, '_') || 'new_request';
  const priorityKey = request.autoPriority?.toLowerCase() || 'unscored';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Detail Header */}
      <div className="shrink-0 p-4" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* ID + Priority Badge */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span 
                className="text-sm font-mono font-semibold cursor-pointer hover:underline" 
                style={{ color: 'hsl(var(--secondary-bronze))' }}
                onClick={onOpenDrawer}
              >
                {request.id}
              </span>

              {priorityKey === 'critical' && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  CRITICAL
                </Badge>
              )}
              {priorityKey === 'high' && (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  HIGH PRIORITY
                </Badge>
              )}

              {request.rank && (
                <Badge variant="outline" className="text-xs">
                  #{request.rank}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {request.summary}
            </h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Subscribe
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Status - INLINE EDITABLE */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Status
              </label>
              <Select 
                value={statusKey} 
                onValueChange={(value) => onUpdateField('processStep', value)}
              >
                <SelectTrigger className="w-full mt-1.5 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', opt.color)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority - INLINE EDITABLE */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Priority
              </label>
              <Select 
                value={priorityKey} 
                onValueChange={(value) => onUpdateField('autoPriority', value)}
              >
                <SelectTrigger className="w-full mt-1.5 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', opt.color)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Score */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Score
              </label>
              <div className="mt-1.5 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-2)' }}>
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--secondary-olive))' }}>
                  {request.score || 0}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--surface-3)' }}>
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${Math.min(100, Math.round((request.score || 0) / 500 * 100))}%`,
                        backgroundColor: 'hsl(var(--secondary-olive))'
                      }} 
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {Math.round((request.score || 0) / 500 * 100)}% of target (500)
                  </span>
                </div>
              </div>
            </div>

            {/* Rank */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Rank
              </label>
              <div className="mt-1.5">
                {request.rank ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold" style={{ color: 'hsl(var(--secondary-bronze))' }}>
                      #{request.rank}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {request.rank === 1 ? 'Highest priority in backlog' : `Position ${request.rank} in backlog`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: 'var(--text-3)' }}>Not ranked</span>
                    <button className="text-xs underline" style={{ color: 'hsl(var(--secondary-olive))' }}>
                      Set rank
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Quarter - INLINE EDITABLE */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Target Quarter
              </label>
              <Select 
                value={request.quarter || ''} 
                onValueChange={(value) => onUpdateField('quarter', value)}
              >
                <SelectTrigger className="w-full mt-1.5 h-9">
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department - INLINE EDITABLE */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Department
              </label>
              <Select 
                value={request.department || ''} 
                onValueChange={(value) => onUpdateField('department', value)}
              >
                <SelectTrigger className="w-full mt-1.5 h-9">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Owner */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Business Owner
              </label>
              <div className="mt-1.5">
                {request.businessOwner ? (
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: 'hsl(var(--secondary-olive))' }}
                    >
                      {request.businessOwner.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                        {request.businessOwner}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                        {request.department || 'No department'}
                      </p>
                    </div>
                    <button className="text-xs underline" style={{ color: 'hsl(var(--secondary-olive))' }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <button className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--secondary-olive))' }}>
                    <UserPlus className="w-4 h-4" />
                    Assign Owner
                  </button>
                )}
              </div>
            </div>

            {/* Linked Items */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Linked Items
              </label>
              <button 
                className="mt-1.5 flex items-center gap-2 text-sm"
                style={{ color: 'hsl(var(--secondary-olive))' }}
              >
                <Link2 className="w-4 h-4" />
                Link to Epic or Feature
              </button>
            </div>

            {/* Metadata */}
            <div className="pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Created</span>
                  <p className="font-medium" style={{ color: 'var(--text-2)' }}>{formatDate(request.createdAt)}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Last Updated</span>
                  <p className="font-medium" style={{ color: 'var(--text-2)' }}>{formatDate(request.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Actions (Footer) */}
      <div className="shrink-0 p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--divider)' }}>
        {/* Primary Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenDrawer}>
            <Edit className="w-3.5 h-3.5" />
            Edit Details
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onAttachment}>
            <Paperclip className="w-3.5 h-3.5" />
            Attachment
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClone}>
            <Copy className="w-3.5 h-3.5" />
            Clone
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onLink}>
            <Link2 className="w-3.5 h-3.5" />
            Link
          </Button>
        </div>

        {/* Danger Actions */}
        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
