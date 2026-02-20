import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectWorkItems } from '@/hooks/useProjectWorkItems';
import { WorkItemsToolbar } from '@/components/project-hub/work-items/WorkItemsToolbar';
import { WorkItemsTable } from '@/components/project-hub/work-items/WorkItemsTable';
import { CreateWorkItemModal } from '@/components/project-hub/work-items/CreateWorkItemModal';
import { Loader2 } from 'lucide-react';

export default function WorkItemsListPage() {
  const { key } = useParams<{ key: string }>();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Resolve project by key
  const { data: project } = useQuery({
    queryKey: ['ph-project-by-key', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  const { data: items = [], isLoading } = useProjectWorkItems(project?.id);

  // Filtered items
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      i =>
        i.title?.toLowerCase().includes(q) ||
        i.summary?.toLowerCase().includes(q) ||
        i.item_key?.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Unique assignees for avatar stack
  const assignees = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; color: string }[] = [];
    const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
    for (const item of items) {
      if (item.assignee_name && !seen.has(item.assignee_name)) {
        seen.add(item.assignee_name);
        let hash = 0;
        for (let i = 0; i < item.assignee_name.length; i++) hash = item.assignee_name.charCodeAt(i) + ((hash << 5) - hash);
        result.push({ name: item.assignee_name, color: colors[Math.abs(hash) % colors.length] });
      }
    }
    return result;
  }, [items]);

  const handleRowClick = (id: string) => {
    console.log('Work item clicked:', id);
  };

  return (
    <div className="px-6 py-4 max-w-[1400px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
          ProjectHub
        </span>
        <span className="text-[10px] text-[#CBD5E1]">/</span>
        <span className="text-[10px] text-[#94A3B8]">
          {project?.key ?? key?.toUpperCase()} — {project?.name ?? 'Loading…'}
        </span>
        <span className="text-[10px] text-[#CBD5E1]">/</span>
        <span className="text-[10px] font-bold text-[#475569]">List</span>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-2.5 mb-1">
        <h1
          className="text-[18px] font-bold tracking-tight"
          style={{ fontFamily: 'Sora, sans-serif', color: '#0F172A' }}
        >
          Work Items
        </h1>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: '#F1F5F9', color: '#64748B' }}
        >
          {filtered.length}
        </span>
      </div>

      {/* Toolbar */}
      <WorkItemsToolbar
        search={search}
        onSearchChange={setSearch}
        totalCount={filtered.length}
        assignees={assignees}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#2563EB]" />
        </div>
      ) : (
        <WorkItemsTable items={filtered} onRowClick={handleRowClick} onCreateClick={() => setCreateOpen(true)} />
      )}

      {/* Create Work Item Modal */}
      {project && (
        <CreateWorkItemModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={project.id}
          projectKey={project.key}
        />
      )}
    </div>
  );
}
