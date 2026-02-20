import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusLozenge } from './StatusLozenge';
import { Plus, Search, X, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_COLORS: Record<string, string> = {
  Epic: '#7C3AED', Feature: '#2563EB', Story: '#0D9488',
  Bug: '#DC2626', Task: '#D97706', Subtask: '#94A3B8',
};

const LINK_TYPES = [
  { value: 'blocks', label: 'blocks' },
  { value: 'is_blocked_by', label: 'is blocked by' },
  { value: 'relates_to', label: 'relates to' },
  { value: 'duplicates', label: 'duplicates' },
  { value: 'is_duplicated_by', label: 'is duplicated by' },
  { value: 'implements', label: 'implements' },
  { value: 'is_implemented_by', label: 'is implemented by' },
];

interface LinkedItem {
  id: string;
  item_key: string;
  title: string;
  summary: string;
  link_type: string;
  type_name: string;
  type_color: string;
  status_name: string;
  status_category: string;
}

interface Props {
  workItemId: string;
  projectId: string;
  linkedItems: LinkedItem[];
  onNavigate?: (id: string) => void;
  onInvalidate: () => void;
}

export function LinkedItemsSection({ workItemId, projectId, linkedItems, onNavigate, onInvalidate }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <CollapsibleSection title="Linked Work Items" count={linkedItems.length} defaultOpen={linkedItems.length > 0}>
      {/* Grouped links */}
      {linkedItems.length > 0 && groupLinks(linkedItems).map(([type, links]) => (
        <div key={type} className="mb-2">
          <span className="text-[12px] font-semibold mb-1 block" style={{ color: '#626F86' }}>
            {formatLinkType(type)}
          </span>
          {links.map(link => (
            <button
              key={link.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#F8FAFC] w-full text-left transition-colors"
              onClick={() => onNavigate?.(link.id)}
            >
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: TYPE_COLORS[link.type_name] || link.type_color }} />
              <span className="text-[10px] shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>{link.item_key}</span>
              <span className="text-[13px] font-medium truncate" style={{ color: '#0F172A' }}>{link.title}</span>
              <StatusLozenge name={link.status_name} category={link.status_category} />
            </button>
          ))}
        </div>
      ))}

      {/* Add link button */}
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 mt-2 text-[11px] font-medium hover:bg-[#F8FAFC] px-2 py-1.5 rounded transition-colors"
        style={{ color: '#94A3B8' }}
      >
        <Plus size={13} /> Link work item
      </button>

      {/* Add link modal */}
      {modalOpen && (
        <AddLinkModal
          workItemId={workItemId}
          projectId={projectId}
          onClose={() => setModalOpen(false)}
          onCreated={() => { setModalOpen(false); onInvalidate(); }}
        />
      )}
    </CollapsibleSection>
  );
}

// ─── Add Link Modal ─────────────────────────────────────────
function AddLinkModal({ workItemId, projectId, onClose, onCreated }: {
  workItemId: string;
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [linkType, setLinkType] = useState('relates_to');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search work items
  const { data: searchResults = [] } = useQuery({
    queryKey: ['ph-link-search', projectId, search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const q = search.trim().toLowerCase();
      const { data } = await supabase
        .from('ph_work_items')
        .select(`
          id, item_key, title, summary,
          ph_work_types!ph_work_items_type_id_fkey (name, color),
          ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)
        `)
        .eq('project_id', projectId)
        .neq('id', workItemId)
        .or(`item_key.ilike.%${q}%,title.ilike.%${q}%,summary.ilike.%${q}%`)
        .limit(10);
      return (data || []).map((d: any) => ({
        id: d.id,
        item_key: d.item_key,
        title: d.title || d.summary,
        type_name: d.ph_work_types?.name ?? 'Task',
        type_color: d.ph_work_types?.color ?? '#94A3B8',
        status_name: d.ph_workflow_statuses?.name ?? 'Backlog',
        status_category: d.ph_workflow_statuses?.category ?? 'todo',
      }));
    },
    enabled: search.length >= 2,
  });

  const handleCreate = async () => {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('ph_issue_links').insert({
        source_id: workItemId,
        target_id: selectedId,
        link_type: linkType,
        created_by: user.id,
      });
      if (error) throw new Error(error.message);
      toast.success('Link created');
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 300 }} onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
      <div
        className="relative rounded-lg flex flex-col"
        style={{ width: 440, background: '#FFF', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-2">
            <LinkIcon size={16} className="text-[#94A3B8]" />
            <span className="text-[14px] font-semibold" style={{ color: '#0F172A' }}>Link Work Item</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F1F5F9]">
            <X size={14} className="text-[#94A3B8]" />
          </button>
        </div>

        <div className="px-5 py-4 flex-1 overflow-y-auto">
          {/* Link type */}
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: '#44546F' }}>Link type</label>
          <select
            value={linkType}
            onChange={e => setLinkType(e.target.value)}
            className="w-full text-[13px] px-3 py-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            style={{ border: '1px solid #E2E8F0', background: '#FFF' }}
          >
            {LINK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Search */}
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: '#44546F' }}>Search work item</label>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded mb-2" style={{ border: '1px solid #E2E8F0' }}>
            <Search size={13} className="text-[#94A3B8]" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-[13px] outline-none bg-transparent"
              placeholder="Search by key or title..."
            />
          </div>

          {/* Results */}
          <div className="max-h-[200px] overflow-y-auto">
            {searchResults.map((item: any) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-[#F8FAFC] text-left transition-colors"
                style={{ background: selectedId === item.id ? '#E9F2FF' : undefined }}
              >
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: TYPE_COLORS[item.type_name] || item.type_color }} />
                <span className="text-[10px] shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>{item.item_key}</span>
                <span className="text-[13px] font-medium truncate" style={{ color: '#0F172A' }}>{item.title}</span>
                <StatusLozenge name={item.status_name} category={item.status_category} />
                {selectedId === item.id && <Check size={13} className="ml-auto text-[#2563EB]" />}
              </button>
            ))}
            {search.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-[12px]" style={{ color: '#94A3B8' }}>No items found</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #F1F5F9' }}>
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] font-medium rounded hover:bg-[#F1F5F9]" style={{ color: '#44546F' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedId || submitting}
            className="px-4 py-1.5 text-[12px] font-semibold rounded text-white disabled:opacity-50"
            style={{ background: '#2563EB' }}
          >
            {submitting ? '…' : 'Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────
function groupLinks(links: { link_type: string; [k: string]: any }[]) {
  const map = new Map<string, typeof links>();
  for (const l of links) {
    const arr = map.get(l.link_type) || [];
    arr.push(l);
    map.set(l.link_type, arr);
  }
  return [...map.entries()];
}

function formatLinkType(t: string): string {
  return t.replace(/_/g, ' ');
}
