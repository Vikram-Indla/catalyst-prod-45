import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateWorkItem } from '@/services/workItemService';
import { StatusLozenge } from './StatusLozenge';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Flag, ChevronDown, Check, Search, Sparkles,
  ArrowUp, ArrowRight, ArrowDown, ChevronsUp, Settings,
  Calendar as CalendarIcon, CheckSquare, Bookmark, Zap, Layers, Bug, CornerDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WorkItemDetail } from '@/hooks/useWorkItemDetail';

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748B', in_progress: '#2563EB', in_review: '#D97706', done: '#16A34A', terminal: '#DC2626',
};

const PRIORITIES = [
  { value: 'Critical', icon: <ChevronsUp size={14} />, color: '#DC2626' },
  { value: 'High', icon: <ArrowUp size={14} />, color: '#D97706' },
  { value: 'Medium', icon: <ArrowRight size={14} />, color: '#2563EB' },
  { value: 'Low', icon: <ArrowDown size={14} />, color: '#94A3B8' },
];

const TYPE_COLORS: Record<string, string> = {
  Epic: '#7C3AED', Feature: '#2563EB', Story: '#0D9488',
  Bug: '#DC2626', Task: '#D97706', Subtask: '#94A3B8',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Epic: <Zap size={14} />, Feature: <Layers size={14} />,
  Story: <Bookmark size={14} />, Bug: <Bug size={14} />,
  Task: <CheckSquare size={14} />, Subtask: <CornerDownRight size={14} />,
};

interface Props {
  item: WorkItemDetail;
  projectId: string;
  statuses: { id: string; name: string; category: string }[];
  onInvalidate: () => void;
}

export function DetailRightSidebar({ item, projectId, statuses, onInvalidate }: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [itemLabelIds, setItemLabelIds] = useState<string[]>([]);

  // Fetch profiles for assignee dropdown
  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').eq('approval_status', 'APPROVED').order('full_name')
      .then(({ data }) => setProfiles(data || []));
  }, []);

  // Fetch labels
  useEffect(() => {
    if (!projectId) return;
    supabase.from('ph_labels').select('id, name, color').eq('project_id', projectId)
      .then(({ data }) => setAllLabels(data || []));
  }, [projectId]);

  // Fetch item labels
  useEffect(() => {
    if (!item.id) return;
    supabase.from('ph_work_item_labels').select('label_id').eq('work_item_id', item.id)
      .then(({ data }) => setItemLabelIds((data || []).map(d => d.label_id)));
  }, [item.id]);

  const closeAll = () => { setStatusOpen(false); setAssigneeOpen(false); setLabelsOpen(false); };

  const handleUpdate = async (field: string, value: any) => {
    try {
      await updateWorkItem(item.id, { [field]: value });
      onInvalidate();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleLabel = async (labelId: string) => {
    const has = itemLabelIds.includes(labelId);
    if (has) {
      await supabase.from('ph_work_item_labels').delete().eq('work_item_id', item.id).eq('label_id', labelId);
      setItemLabelIds(prev => prev.filter(id => id !== labelId));
    } else {
      await supabase.from('ph_work_item_labels').insert({ work_item_id: item.id, label_id: labelId });
      setItemLabelIds(prev => [...prev, labelId]);
    }
  };

  const assignToMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { handleUpdate('assignee_id', user.id); setAssigneeOpen(false); }
  };

  const filteredProfiles = profiles.filter(p =>
    (p.full_name || p.email || '').toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const typeColor = TYPE_COLORS[item.type_name] || item.type_color;
  const statusCat = item.status_category;
  const statusBg = STATUS_COLORS[statusCat] || '#64748B';

  const currentLabels = allLabels.filter(l => itemLabelIds.includes(l.id));
  const isOverdue = item.due_date && new Date(item.due_date) < new Date();

  return (
    <div
      className="shrink-0 overflow-y-auto"
      style={{ width: 260, borderLeft: '1px solid #DFE1E6', padding: '12px 16px' }}
      onClick={closeAll}
    >
      {/* Status Button */}
      <div className="relative mb-2">
        <button
          className="w-full rounded text-[11px] font-bold uppercase tracking-wide text-white py-1.5"
          style={{ background: statusBg }}
          onClick={e => { e.stopPropagation(); setStatusOpen(!statusOpen); setAssigneeOpen(false); setLabelsOpen(false); }}
        >
          {item.status_name}
          <ChevronDown size={12} className="inline ml-1 opacity-80" />
        </button>
        {statusOpen && (
          <div
            className="fixed rounded-md overflow-hidden"
            style={{ width: 200, background: '#FFF', border: '1px solid #DFE1E6', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999, marginTop: 4 }}
            onClick={e => e.stopPropagation()}
          >
            {statuses.map(s => (
              <button
                key={s.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9]"
                onClick={() => { handleUpdate('status_id', s.id); setStatusOpen(false); }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.category] || '#94A3B8' }} />
                {s.name}
                {s.id === item.status_id && <Check size={13} className="ml-auto text-[#2563EB]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Improve Story */}
      <button
        className="w-full rounded text-[13px] font-medium py-1.5 mb-4 hover:bg-[#F8FAFC] transition-colors"
        style={{ border: '1px solid #DFE1E6' }}
        onClick={() => toast('Coming soon', { icon: '✨' })}
      >
        ✨ Improve Story
      </button>

      {/* Fields */}
      <div className="flex flex-col gap-3.5" style={{ fontSize: 13 }}>
        {/* Assignee */}
        <div className="relative">
          <label className="text-[13px] font-medium block mb-1" style={{ color: '#44546F' }}>Assignee</label>
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={e => { e.stopPropagation(); setAssigneeOpen(!assigneeOpen); setStatusOpen(false); setLabelsOpen(false); }}
          >
            {item.assignee_name ? (
              <>
                <MiniAvatar name={item.assignee_name} size={24} />
                <span className="text-[14px]" style={{ color: '#0F172A' }}>{item.assignee_name}</span>
              </>
            ) : (
              <span className="text-[14px]" style={{ color: '#94A3B8' }}>Unassigned</span>
            )}
          </button>
          <button className="text-[12px] mt-0.5" style={{ color: '#0C66E4' }} onClick={assignToMe}>Assign to me</button>

          {assigneeOpen && (
            <div
              className="fixed rounded-md overflow-hidden"
              style={{ width: 220, background: '#FFF', border: '1px solid #DFE1E6', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999, marginTop: 4 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2 border-b" style={{ borderColor: '#F1F5F9' }}>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ border: '1px solid #E2E8F0' }}>
                  <Search size={12} className="text-[#94A3B8]" />
                  <input
                    autoFocus
                    value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                    className="flex-1 text-[12px] outline-none bg-transparent"
                    placeholder="Search..."
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#F1F5F9]"
                  onClick={() => { handleUpdate('assignee_id', null); setAssigneeOpen(false); }}
                >
                  <span className="text-[#94A3B8]">Unassigned</span>
                </button>
                {filteredProfiles.map(p => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#F1F5F9]"
                    onClick={() => { handleUpdate('assignee_id', p.id); setAssigneeOpen(false); }}
                  >
                    <MiniAvatar name={p.full_name || p.email} size={20} />
                    <span className="truncate">{p.full_name || p.email}</span>
                    {p.id === item.assignee_id && <Check size={12} className="ml-auto text-[#2563EB]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reporter */}
        <div>
          <label className="text-[13px] font-medium block mb-1" style={{ color: '#44546F' }}>Reporter</label>
          {item.reporter_name ? (
            <div className="flex items-center gap-2">
              <MiniAvatar name={item.reporter_name} size={24} />
              <span className="text-[14px]" style={{ color: '#0F172A' }}>{item.reporter_name}</span>
            </div>
          ) : (
            <span className="text-[14px]" style={{ color: '#94A3B8' }}>—</span>
          )}
        </div>

        {/* Labels */}
        <div className="relative">
          <label className="text-[13px] font-medium block mb-1" style={{ color: '#44546F' }}>Labels</label>
          <div
            className="flex flex-wrap gap-1 cursor-pointer min-h-[24px]"
            onClick={e => { e.stopPropagation(); setLabelsOpen(!labelsOpen); setStatusOpen(false); setAssigneeOpen(false); }}
          >
            {currentLabels.length > 0 ? currentLabels.map(l => (
              <span
                key={l.id}
                className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                style={{ background: l.color + '22', color: l.color, border: `1px solid ${l.color}44` }}
              >
                {l.name}
              </span>
            )) : (
              <span className="text-[13px]" style={{ color: '#94A3B8' }}>None</span>
            )}
          </div>
          {labelsOpen && (
            <div
              className="fixed rounded-md overflow-hidden"
              style={{ width: 200, background: '#FFF', border: '1px solid #DFE1E6', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999, marginTop: 4 }}
              onClick={e => e.stopPropagation()}
            >
              {allLabels.map(l => (
                <button
                  key={l.id}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#F1F5F9]"
                  onClick={() => toggleLabel(l.id)}
                >
                  <span className="w-3 h-3 rounded" style={{ background: l.color }} />
                  <span className="truncate">{l.name}</span>
                  {itemLabelIds.includes(l.id) && <Check size={12} className="ml-auto text-[#2563EB]" />}
                </button>
              ))}
              {allLabels.length === 0 && <div className="px-3 py-2 text-[12px]" style={{ color: '#94A3B8' }}>No labels</div>}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="text-[13px] font-medium block mb-1" style={{ color: '#44546F' }}>Due date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-[14px]" style={{ color: isOverdue ? '#DC2626' : '#0F172A' }}>
                <CalendarIcon size={13} style={{ color: '#94A3B8' }} />
                {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : <span style={{ color: '#94A3B8' }}>None</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
              <Calendar
                mode="single"
                selected={item.due_date ? new Date(item.due_date) : undefined}
                onSelect={(d) => { if (d) handleUpdate('due_date', d.toISOString().split('T')[0]); }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Flag */}
        <div>
          <label className="text-[13px] font-medium block mb-1" style={{ color: '#44546F' }}>Flag</label>
          <button
            onClick={() => handleUpdate('is_flagged', !item.is_flagged)}
            className="flex items-center gap-1.5 text-[13px] font-medium"
            style={{ color: item.is_flagged ? '#DC2626' : '#94A3B8' }}
          >
            <Flag size={13} />
            {item.is_flagged ? '🚩 Flagged' : 'None — click to flag'}
          </button>
        </div>

        {/* Story Points */}
        <div>
          <label className="text-[13px] font-medium block mb-1" style={{ color: '#44546F' }}>Story Points</label>
          <span className="text-[14px]" style={{ color: '#0F172A' }}>{item.story_points ?? '—'}</span>
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="mt-3.5 pt-2.5" style={{ borderTop: '1px solid #DFE1E6' }}>
        <div className="text-[11px] mb-0.5" style={{ color: '#626F86', lineHeight: '18px' }}>
          Created {format(new Date(item.created_at), "MMMM d, yyyy 'at' h:mm a")}
        </div>
        <div className="text-[11px] mb-2" style={{ color: '#626F86', lineHeight: '18px' }}>
          Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
        </div>
        <button className="text-[12px] flex items-center gap-1" style={{ color: '#44546F' }}>
          <Settings size={12} /> Configure
        </button>
      </div>
    </div>
  );
}

// ─── Mini Avatar ─────────────────────────────────────────
function MiniAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: colors[Math.abs(hash) % colors.length] }}
    >
      {initials}
    </div>
  );
}
