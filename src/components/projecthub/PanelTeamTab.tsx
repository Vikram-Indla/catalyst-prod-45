import { useMemo, useState } from 'react';
import { getRoleCategory, ROLE_CATEGORY_ORDER } from '@/types/projecthub';
import type { ProjectTeamMember } from '@/types/projecthub';
import { Search, Mail, MapPin, UserPlus, Trash2 } from 'lucide-react';
import { AddMemberDialog } from './AddMemberDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#DC2626', '#16A34A', '#0284C7', '#6366F1'];
function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

interface Props {
  members: ProjectTeamMember[];
  isLoading: boolean;
  projectId: string | null;
}

export function PanelTeamTab({ members, isLoading, projectId }: Props) {
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!projectId) throw new Error('No project');
      const { error } = await (supabase as any)
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Member removed');
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove: ${err.message}`);
    },
  });

  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.project_role || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, ProjectTeamMember[]> = {};
    filtered.forEach(m => {
      const cat = getRoleCategory(m.project_role || m.job_role);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return ROLE_CATEGORY_ORDER.filter(c => groups[c]?.length).map(c => ({ category: c, members: groups[c] }));
  }, [filtered]);

  const existingMemberIds = useMemo(() => members.map(m => m.user_id), [members]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="rounded-full bg-slate-200" style={{ width: 36, height: 36 }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-2.5 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search + Add button */}
      <div className="flex items-center gap-2 mx-4 mt-3 mb-2">
        <div className="flex items-center gap-2 flex-1 rounded-md" style={{ height: 32, padding: '0 10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Search size={13} color="#94A3B8" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, or email..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 12, color: '#0F172A' }}
          />
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1 rounded-md transition-colors hover:opacity-90"
          style={{
            height: 32,
            padding: '0 10px',
            background: '#2563EB',
            border: 'none',
            fontSize: 11,
            fontWeight: 600,
            color: '#FFF',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <UserPlus size={13} /> Add
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-8" style={{ fontSize: 13, color: '#94A3B8' }}>
          {search ? `No team members match "${search}"` : 'No team members assigned'}
          {!search && (
            <div className="mt-3">
              <button
                onClick={() => setShowAddDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-md"
                style={{ height: 32, padding: '0 14px', background: '#2563EB', border: 'none', fontSize: 12, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}
              >
                <UserPlus size={14} /> Add Member
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          {grouped.map(g => (
            <div key={g.category} className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.category}</span>
                <span className="rounded-full" style={{ padding: '0 6px', fontSize: 10, fontWeight: 600, background: '#F1F5F9', color: '#64748B' }}>{g.members.length}</span>
                <div className="flex-1" style={{ height: 1, background: '#F1F5F9' }} />
              </div>
              <div className="space-y-1">
                {g.members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 rounded-md transition-colors hover:bg-[#F8FAFC] group" style={{ padding: '6px 8px' }}>
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{ width: 36, height: 36, background: getColor(m.full_name), color: '#FFF', fontSize: 12, fontWeight: 700 }}
                    >
                      {initials(m.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{m.full_name}</div>
                      <div style={{ fontSize: 12, color: '#2563EB', fontWeight: 500 }}>{m.project_role || m.job_role || 'Member'}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{m.department_name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {m.email && (
                        <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-blue-600" style={{ fontSize: 11, color: '#64748B' }}>
                          <Mail size={10} /> {m.email.split('@')[0]}
                        </a>
                      )}
                      {(m.country || m.location) && (
                        <div className="flex items-center gap-1 justify-end" style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                          <MapPin size={9} /> {[m.location, m.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeMember.mutate(m.user_id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                      style={{ width: 26, height: 26, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer', flexShrink: 0 }}
                      title="Remove member"
                    >
                      <Trash2 size={12} color="#DC2626" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      {projectId && (
        <AddMemberDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          projectId={projectId}
          existingMemberIds={existingMemberIds}
        />
      )}
    </div>
  );
}
