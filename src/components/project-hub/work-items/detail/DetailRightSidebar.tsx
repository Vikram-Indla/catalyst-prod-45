import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusLozenge } from './StatusLozenge';
import {
  ChevronDown, ArrowUp, ArrowRight, ArrowDown, ChevronsUp,
  Flag, Lock, Settings, Sparkles, Eye, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  item: {
    id: string;
    project_id: string;
    status_id: string;
    status_name: string;
    status_category: string;
    priority: string;
    assignee_id: string | null;
    assignee_name: string | null;
    assignee_avatar: string | null;
    reporter_id: string | null;
    reporter_name: string | null;
    due_date: string | null;
    start_date: string | null;
    department?: string | null;
    team?: string | null;
    environment?: string | null;
    security_level?: string | null;
    is_flagged: boolean;
    flag_reason?: string | null;
    resolution: string | null;
    release_id?: string | null;
    created_at: string;
    updated_at: string;
  };
  statuses: { id: string; name: string; category: string }[];
  onUpdate: (field: string, value: any) => Promise<void>;
  onInvalidate: () => void;
}

const PRIORITIES = [
  { value: 'Critical', icon: <ChevronsUp size={14} />, color: '#DC2626' },
  { value: 'High', icon: <ArrowUp size={14} />, color: '#D97706' },
  { value: 'Medium', icon: <ArrowRight size={14} />, color: '#2563EB' },
  { value: 'Low', icon: <ArrowDown size={14} />, color: '#94A3B8' },
];

const STATUS_BG: Record<string, string> = {
  todo: '#44546F', in_progress: '#2563EB', done: '#16A34A', terminal: '#DC2626',
};

export function DetailRightSidebar({ item, statuses, onUpdate, onInvalidate }: SidebarProps) {
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);

  const { data: itemLabels = [] } = useQuery({
    queryKey: ['ph-item-labels', item.id],
    queryFn: async () => {
      const { data } = await supabase.from('ph_work_item_labels').select('label_id, ph_labels(id, name, color)').eq('work_item_id', item.id);
      return (data || []).map((d: any) => ({ id: d.ph_labels?.id, name: d.ph_labels?.name ?? '', color: d.ph_labels?.color ?? '#2563EB' }));
    },
  });

  const { data: itemComponents = [] } = useQuery({
    queryKey: ['ph-item-components', item.id],
    queryFn: async () => {
      const { data } = await supabase.from('ph_work_item_components').select('component_id, ph_components(id, name)').eq('work_item_id', item.id);
      return (data || []).map((d: any) => ({ id: d.ph_components?.id, name: d.ph_components?.name ?? '' }));
    },
  });

  const { data: release } = useQuery({
    queryKey: ['ph-release', item.release_id],
    queryFn: async () => {
      if (!item.release_id) return null;
      const { data } = await supabase.from('ph_releases').select('id, name, title, status').eq('id', item.release_id).single();
      return data;
    },
    enabled: !!item.release_id,
  });

  const { data: watchers = [] } = useQuery({
    queryKey: ['ph-watchers', item.id],
    queryFn: async () => {
      const { data } = await supabase.from('ph_watchers').select('user_id').eq('work_item_id', item.id);
      if (!data || data.length === 0) return [];
      const userIds = data.map(w => w.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      return (profiles || []).map(p => ({ id: p.id, name: p.full_name || 'Unknown' }));
    },
  });

  const handleWatch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isWatching = watchers.some(w => w.id === user.id);
    if (isWatching) {
      await supabase.from('ph_watchers').delete().eq('work_item_id', item.id).eq('user_id', user.id);
    } else {
      await supabase.from('ph_watchers').insert({ work_item_id: item.id, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ['ph-watchers', item.id] });
  };

  const handleAssignToMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await onUpdate('assignee_id', user.id);
  };

  const closeAll = () => { setStatusOpen(false); setPriorityOpen(false); };

  return (
    <div
      className="shrink-0 overflow-y-auto"
      style={{ width: 280, borderLeft: '1px solid #E2E8F0', padding: '14px 16px', background: '#FAFBFC' }}
      onClick={closeAll}
    >
      {/* STATUS BUTTON */}
      <div className="relative mb-3">
        <button
          onClick={e => { e.stopPropagation(); setStatusOpen(!statusOpen); setPriorityOpen(false); }}
          className="w-full py-2 rounded-md text-white text-[11px] font-bold uppercase tracking-wider text-center transition-colors"
          style={{ background: STATUS_BG[item.status_category] || '#44546F' }}
        >
          {item.status_name}
        </button>
        {statusOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-md overflow-hidden" style={{ background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            {statuses.map(s => (
              <button key={s.id} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9]" onClick={() => { onUpdate('status_id', s.id); setStatusOpen(false); }}>
                <StatusLozenge name={s.name} category={s.category} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI BUTTON */}
      <button
        onClick={() => toast('AI analyzing...', { icon: '✨' })}
        className="w-full py-2 rounded-md text-[12px] font-semibold flex items-center justify-center gap-1.5 mb-4 transition-colors hover:bg-[#F5F3FF]"
        style={{ border: '1px solid #E2E8F0', color: '#7C3AED' }}
      >
        <Sparkles size={14} /> Improve Story with AI
      </button>

      {/* PINNED FIELDS */}
      <div className="flex flex-col gap-3 pb-3">
        <SidebarField label="Assignee">
          <div className="flex items-center gap-2">
            {item.assignee_name ? (
              <><MiniAvatar name={item.assignee_name} size={22} /><span className="text-[13px] font-medium" style={{ color: '#1E293B' }}>{item.assignee_name}</span></>
            ) : (
              <span className="text-[13px]" style={{ color: '#94A3B8' }}>Unassigned</span>
            )}
          </div>
          <button onClick={handleAssignToMe} className="text-[11px] font-medium mt-0.5 hover:underline" style={{ color: '#2563EB' }}>Assign to me</button>
        </SidebarField>

        <SidebarField label="Reporter">
          <div className="flex items-center gap-2">
            {item.reporter_name ? (
              <><MiniAvatar name={item.reporter_name} size={22} /><span className="text-[13px] font-medium" style={{ color: '#1E293B' }}>{item.reporter_name}</span></>
            ) : (
              <span className="text-[13px]" style={{ color: '#94A3B8' }}>—</span>
            )}
          </div>
        </SidebarField>

        <SidebarField label="Priority">
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setPriorityOpen(!priorityOpen); setStatusOpen(false); }} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: '#334155' }}>
              <span style={{ color: PRIORITIES.find(p => p.value === item.priority)?.color }}>{PRIORITIES.find(p => p.value === item.priority)?.icon}</span>
              {item.priority}
              <ChevronDown size={12} className="text-[#94A3B8]" />
            </button>
            {priorityOpen && (
              <div className="absolute left-0 top-full mt-1 rounded-md overflow-hidden" style={{ width: 160, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }} onClick={e => e.stopPropagation()}>
                {PRIORITIES.map(p => (
                  <button key={p.value} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9]" onClick={() => { onUpdate('priority', p.value); setPriorityOpen(false); }}>
                    <span style={{ color: p.color }}>{p.icon}</span>{p.value}
                  </button>
                ))}
              </div>
            )}
          </div>
        </SidebarField>

        <SidebarField label="Due Date">
          <div className="flex items-center gap-1">
            <span className="text-[13px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: item.due_date && new Date(item.due_date) < new Date() ? '#DC2626' : '#334155' }}>
              {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span style={{ color: '#94A3B8' }}>None</span>}
            </span>
            {item.due_date && new Date(item.due_date) < new Date() && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: '#FEF2F2', color: '#DC2626' }}>Overdue</span>
            )}
          </div>
        </SidebarField>
      </div>

      {/* CONTEXT FIELDS */}
      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
        <span className="text-[10px] font-bold uppercase tracking-wider block mb-3" style={{ color: '#64748B', letterSpacing: '0.06em' }}>Context</span>
        <div className="flex flex-col gap-3">
          <SidebarField label="Components">
            {itemComponents.length > 0 ? (
              <div className="flex flex-wrap gap-1">{itemComponents.map((c: any) => (<span key={c.id} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#CCFBF1', color: '#0D9488' }}>{c.name}</span>))}</div>
            ) : <span className="text-[12px]" style={{ color: '#94A3B8' }}>None</span>}
          </SidebarField>

          <SidebarField label="Labels">
            {itemLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1">{itemLabels.map((l: any) => (<span key={l.id} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#DBEAFE', color: '#2563EB' }}>{l.name}</span>))}</div>
            ) : <span className="text-[12px]" style={{ color: '#94A3B8' }}>None</span>}
          </SidebarField>

          <SidebarField label="Release">
            {release ? (
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: '#CCFBF1', color: '#0D9488' }}>{release.name || release.title}</span>
            ) : <span className="text-[12px]" style={{ color: '#94A3B8' }}>None</span>}
          </SidebarField>

          <SidebarField label="Environment">
            {item.environment ? (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: '#F1F5F9', color: '#64748B' }}>{item.environment}</span>
            ) : <span className="text-[12px]" style={{ color: '#94A3B8' }}>None</span>}
          </SidebarField>

          <SidebarField label="Department">
            {item.department ? (
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: '#F1F5F9', color: '#334155' }}>{item.department}</span>
            ) : <span className="text-[12px]" style={{ color: '#94A3B8' }}>None</span>}
          </SidebarField>

          <SidebarField label="Team">
            {item.team ? (
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: '#F1F5F9', color: '#334155' }}>{item.team}</span>
            ) : <span className="text-[12px]" style={{ color: '#94A3B8' }}>None</span>}
          </SidebarField>

          <SidebarField label="Security Level">
            <div className="flex items-center gap-1.5">
              <Lock size={12} style={{ color: '#64748B' }} />
              <span className="text-[12px] font-medium" style={{ color: '#334155' }}>{item.security_level || 'Standard'}</span>
            </div>
          </SidebarField>

          <SidebarField label="Flag">
            {item.is_flagged ? (
              <div className="flex items-center gap-1.5">
                <Flag size={12} style={{ color: '#DC2626' }} />
                <span className="text-[12px] font-medium" style={{ color: '#DC2626' }}>{item.flag_reason || 'Flagged'}</span>
                <button onClick={() => onUpdate('is_flagged', false)} className="ml-auto p-0.5 rounded hover:bg-[#FEF2F2]" title="Unflag"><X size={10} style={{ color: '#DC2626' }} /></button>
              </div>
            ) : (
              <button onClick={() => onUpdate('is_flagged', true)} className="text-[12px] font-medium hover:underline" style={{ color: '#94A3B8' }}>None — click to flag</button>
            )}
          </SidebarField>

          <SidebarField label="Resolution">
            <span className="text-[12px] font-medium" style={{ color: item.resolution ? '#334155' : '#94A3B8' }}>{item.resolution || 'Unresolved'}</span>
          </SidebarField>

          <SidebarField label="Watchers">
            <div className="flex items-center gap-1">
              {watchers.slice(0, 5).map((w: any) => (<MiniAvatar key={w.id} name={w.name} size={22} />))}
              {watchers.length > 5 && <span className="text-[10px] font-bold" style={{ color: '#64748B' }}>+{watchers.length - 5}</span>}
            </div>
            <button onClick={handleWatch} className="flex items-center gap-1 text-[11px] font-medium mt-1 hover:underline" style={{ color: '#2563EB' }}>
              <Eye size={11} /> + Watch
            </button>
          </SidebarField>
        </div>
      </div>

      {/* CONFIGURE */}
      <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 12, paddingTop: 10 }}>
        <button onClick={() => setConfigureOpen(!configureOpen)} className="flex items-center gap-1.5 text-[11px] font-medium hover:underline" style={{ color: '#94A3B8' }}>
          <Settings size={12} /> Configure fields
        </button>
        {configureOpen && (
          <div className="mt-2 p-3 rounded-md" style={{ background: '#FFF', border: '1px solid #E2E8F0' }}>
            <span className="text-[10px] font-bold uppercase block mb-2" style={{ color: '#64748B' }}>Visible Context Fields</span>
            {['Components', 'Labels', 'Release', 'Environment', 'Department', 'Team', 'Security Level', 'Flag', 'Resolution', 'Watchers'].map(f => (
              <label key={f} className="flex items-center gap-2 py-1 text-[12px] cursor-pointer" style={{ color: '#334155' }}>
                <input type="checkbox" defaultChecked className="rounded border-[#CBD5E1]" />{f}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* METADATA */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
        <div className="text-[11px]" style={{ color: '#94A3B8', lineHeight: '18px' }}>
          Created {new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="text-[11px]" style={{ color: '#94A3B8', lineHeight: '18px' }}>
          Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] font-semibold block mb-1" style={{ color: '#44546F' }}>{label}</span>
      {children}
    </div>
  );
}

function MiniAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, fontSize: size * 0.38, background: colors[Math.abs(hash) % colors.length] }}>
      {initials}
    </div>
  );
}
