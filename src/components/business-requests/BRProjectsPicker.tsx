/**
 * BRProjectsPicker — Multi-select picker for ProjectHub projects.
 * Persists associations via business_request_links (linked_item_type='project').
 * Visual style mirrors the Story EditableAssignee dropdown (Atlassian parity).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FolderKanban } from 'lucide-react';

const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background: 'var(--ds-surface, #FFFFFF)', borderRadius: 4, border: 'none',
  boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
  padding: '4px 0', zIndex: 9999,
};

const CheckmarkSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface Props {
  businessRequestId: string;
}

export function BRProjectsPicker({ businessRequestId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // All ProjectHub projects (excluding archived)
  const { data: projects = [] } = useQuery({
    queryKey: ['br-projects-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key, avatar_url')
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Currently linked projects for this BR
  const { data: links = [] } = useQuery({
    queryKey: ['br-project-links', businessRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_links')
        .select('id, linked_item_id')
        .eq('business_request_id', businessRequestId)
        .eq('linked_item_type', 'project');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessRequestId,
  });

  const linkedIds = new Set(links.map(l => l.linked_item_id));
  const linkedProjects = projects.filter(p => linkedIds.has(p.id));

  const toggle = useMutation({
    mutationFn: async (projectId: string) => {
      if (linkedIds.has(projectId)) {
        const link = links.find(l => l.linked_item_id === projectId);
        if (link) {
          const { error } = await supabase.from('business_request_links').delete().eq('id', link.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('business_request_links').insert({
          business_request_id: businessRequestId,
          linked_item_id: projectId,
          linked_item_type: 'project',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['br-project-links', businessRequestId] }),
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.key ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
          borderRadius: 4, cursor: 'pointer', transition: 'background .12s', flexWrap: 'wrap', minHeight: 32,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {linkedProjects.length === 0 ? (
          <span style={{ fontSize: 14, color: '#97A0AF' }}>None</span>
        ) : (
          linkedProjects.map(p => (
            <span key={p.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#DEEBFF', color: '#0747A6', fontSize: 12, fontWeight: 600,
              padding: '2px 8px', borderRadius: 3,
            }}>
              <FolderKanban size={11} />
              {p.key ?? p.name}
            </span>
          ))
        )}
      </div>
      {open && (() => {
        const rect = ref.current?.getBoundingClientRect();
        const dropTop = (rect?.bottom ?? 0) + 4;
        const dropWidth = 300;
        const dropLeft = Math.min(rect?.left ?? 0, window.innerWidth - dropWidth - 16);
        return (
          <div style={{ ...ATLASSIAN_DROPDOWN, position: 'fixed', top: dropTop, left: dropLeft, width: dropWidth, overflow: 'hidden' }}>
            <div style={{ padding: '8px 8px 4px' }}>
              <input
                autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
                style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => (e.target.style.border = '2px solid #2563EB')}
                onBlur={e => (e.target.style.border = '1px solid rgba(9,30,66,0.14)')}
              />
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {filtered.map(p => {
                const isActive = linkedIds.has(p.id);
                return (
                  <div key={p.id} onClick={() => toggle.mutate(p.id)}
                    style={{
                      minHeight: 36, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: '#E9F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FolderKanban size={14} color="#0747A6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.key && <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>{p.key}</div>}
                    </div>
                    {isActive && <CheckmarkSVG />}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '12px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', textAlign: 'center' }}>No projects found</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
