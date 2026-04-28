/**
 * RequestAuditTab — Timeline with date grouping, filter dropdown, action icons.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, ArrowRight, Star, ShieldAlert, Flag, CheckCircle, Wallet, Link2, Paperclip, MessageSquare, History, Filter, ChevronDown } from 'lucide-react';

interface InitiativeAuditTabProps {
  requestId: string;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Activity' },
  { value: 'status', label: 'Status Changes' },
  { value: 'fields', label: 'Field Updates' },
  { value: 'risks', label: 'Risks' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'budget', label: 'Budget' },
  { value: 'links', label: 'Links & Attachments' },
];

function getAuditIcon(entry: any) {
  const map: Record<string, { iconBg: string; iconColor: string; Icon: React.ElementType }> = {
    created: { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', Icon: Plus },
    updated: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', Icon: Pencil },
    deleted: { iconBg: 'bg-red-100', iconColor: 'text-red-600', Icon: Trash2 },
    status_changed: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', Icon: ArrowRight },
    score_updated: { iconBg: 'bg-purple-100', iconColor: 'text-purple-600', Icon: Star },
    risk_added: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', Icon: ShieldAlert },
    milestone_added: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', Icon: Flag },
    milestone_completed: { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', Icon: CheckCircle },
    budget_item_added: { iconBg: 'bg-teal-100', iconColor: 'text-teal-600', Icon: Wallet },
    link_added: { iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', Icon: Link2 },
    attachment_uploaded: { iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', Icon: Paperclip },
    comment_added: { iconBg: 'bg-zinc-100', iconColor: 'text-zinc-600', Icon: MessageSquare },
  };
  return map[entry.action] || { iconBg: 'bg-zinc-100', iconColor: 'text-zinc-500', Icon: Pencil };
}

function getAuditActionText(entry: any): string {
  const map: Record<string, string> = {
    created: 'created this request', deleted: 'deleted this request',
    status_changed: 'changed status', score_updated: 'updated the score',
    risk_added: 'added a risk', milestone_added: 'added a milestone',
    milestone_completed: 'completed a milestone', budget_item_added: 'added a budget item',
    link_added: 'added a link', attachment_uploaded: 'uploaded a file',
    comment_added: 'added a comment',
  };
  if (entry.action === 'updated' && entry.field_name) {
    const fieldLabels: Record<string, string> = {
      title: 'changed the title', description: 'updated the description', progress: 'updated progress',
      assignee_id: 'changed the assignee', department_id: 'changed the department',
      business_owner_id: 'changed the business owner', target_quarter: 'changed the target quarter',
      budget_allocated: 'updated the allocated budget', status: 'updated the status',
    };
    return fieldLabels[entry.field_name] || `updated ${entry.field_name?.replace(/_/g, ' ')}`;
  }
  if (entry.action === 'updated' && entry.entity_type !== 'request') {
    return `updated a ${entry.entity_type?.replace(/_/g, ' ')}`;
  }
  return map[entry.action] || 'made a change';
}

function formatFieldValue(field: string | null, value: string | null): string {
  if (!value) return '—';
  if (field === 'progress') return `${value}%`;
  if (field === 'budget_allocated') return `SAR ${Number(value).toLocaleString()}`;
  if (field === 'status') return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (value.match(/^[0-9a-f]{8}-/)) return value.slice(0, 8) + '...';
  return value;
}

function groupByDate(entries: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  entries.forEach(entry => {
    const d = new Date(entry.created_at).toDateString();
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' :
      new Date(entry.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  });
  return groups;
}

export function RequestAuditTab({ requestId }: InitiativeAuditTabProps) {
  const [auditFilter, setAuditFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['request-audit', requestId, auditFilter],
    queryFn: async () => {
      let query = typedQuery('ph_request_audit_log')
        .select('*, user:profiles!user_id(id, full_name, email)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (auditFilter === 'status') query = query.eq('action', 'status_changed');
      else if (auditFilter === 'fields') query = query.eq('action', 'updated');
      else if (auditFilter === 'risks') query = query.in('entity_type', ['risk']);
      else if (auditFilter === 'milestones') query = query.in('entity_type', ['milestone']);
      else if (auditFilter === 'budget') query = query.in('entity_type', ['budget_item']);
      else if (auditFilter === 'links') query = query.in('entity_type', ['link', 'attachment']);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId,
  });

  const activeLabel = FILTER_OPTIONS.find(o => o.value === auditFilter)?.label || 'All';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Activity Log</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{auditLogs.length} event{auditLogs.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowFilterMenu(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
            <Filter className="w-3.5 h-3.5" /> {activeLabel} <ChevronDown className="w-3 h-3" />
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1">
              {FILTER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setAuditFilter(opt.value); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${auditFilter === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {auditLogs.length === 0 ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600">Audit tracking is active</p>
          <p className="text-xs text-zinc-400 mt-1">Changes made to this request from now on will be logged automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupByDate(auditLogs)).map(([dateLabel, entries]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{dateLabel}</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>
              <div className="relative pl-6">
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-zinc-200" />
                <div className="space-y-4">
                  {entries.map((entry: any) => {
                    const { iconBg, iconColor, Icon } = getAuditIcon(entry);
                    const actionText = getAuditActionText(entry);
                    const time = new Date(entry.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    const metadata = entry.metadata as Record<string, any> | null;
                    return (
                      <div key={entry.id} className="relative flex gap-3">
                        <div className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center ${iconBg} ring-2 ring-white`}>
                          <Icon className={`w-2.5 h-2.5 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-start justify-between">
                            <p className="text-xs text-zinc-700">
                              <span className="font-semibold">{entry.user?.full_name || 'System'}</span>{' '}{actionText}
                            </p>
                            <span className="text-[10px] text-zinc-400 flex-shrink-0 ml-2">{time}</span>
                          </div>
                          {entry.old_value && entry.new_value && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-zinc-400 line-through">{formatFieldValue(entry.field_name, entry.old_value)}</span>
                              <ArrowRight className="w-3 h-3 text-zinc-300" />
                              <span className="text-[11px] text-zinc-700 font-medium">{formatFieldValue(entry.field_name, entry.new_value)}</span>
                            </div>
                          )}
                          {metadata && metadata.title && (
                            <p className="text-[11px] text-zinc-500 mt-1">
                              {metadata.risk_key && `${metadata.risk_key}: `}{metadata.title}
                              {metadata.severity && (
                                <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  metadata.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                  metadata.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-600'
                                }`}>{metadata.severity}</span>
                              )}
                            </p>
                          )}
                          {entry.field_name === 'progress' && entry.new_value && (
                            <div className="w-32 h-1.5 bg-zinc-200 rounded-full mt-1.5 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${entry.new_value}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
