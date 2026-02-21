import { useMemo, useState } from 'react';
import { getRoleCategory, ROLE_CATEGORY_ORDER } from '@/types/projecthub';
import type { ProjectTeamMember } from '@/types/projecthub';
import { Search, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { AddMemberDialog } from './AddMemberDialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const ROLE_COLOR: Record<string, string> = {
  admin: '#2563EB',
  contributor: '#16A34A',
  viewer: '#7C3AED',
};

interface ResourceUser {
  id: string;
  name: string;
  profile_id: string | null;
  role_name: string | null;
  department_name: string | null;
  email: string | null;
  avatar_url: string | null;
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

  // Fetch all resource_inventory users for inline search-to-add
  const { data: resourceUsers = [], isLoading: resourceLoading } = useQuery({
    queryKey: ['resource-users-panel'],
    queryFn: async (): Promise<ResourceUser[]> => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, name, profile_id, role_name, department_name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;

      const profileIds = (data || []).filter(r => r.profile_id).map(r => r.profile_id!);
      const emailMap = new Map<string, string>();
      const avatarMap = new Map<string, string>();
      if (profileIds.length > 0) {
        for (let i = 0; i < profileIds.length; i += 100) {
          const chunk = profileIds.slice(i, i + 100);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, avatar_url')
            .in('id', chunk);
          if (profiles) {
            profiles.forEach(p => {
              if (p.email) emailMap.set(p.id, p.email);
              if (p.avatar_url) avatarMap.set(p.id, p.avatar_url);
            });
          }
        }
      }

      return (data || []).map(r => ({
        ...r,
        email: r.profile_id ? emailMap.get(r.profile_id) || null : null,
        avatar_url: r.profile_id ? avatarMap.get(r.profile_id) || null : null,
      }));
    },
    staleTime: 5 * 60_000,
  });

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

  const addMember = useMutation({
    mutationFn: async ({ userId, profileId, roleName }: { userId: string; profileId: string | null; roleName: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const memberUserId = profileId || userId;
      const { error } = await (supabase as any)
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: memberUserId,
          role: roleName || 'viewer',
          status: 'active',
          added_by: user?.id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Member added to project');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        toast.error('This user is already a member of this project');
      } else {
        toast.error(`Failed to add member: ${err.message}`);
      }
    },
  });

  // Filter existing members
  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.project_role || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  // When searching, also show matching resource_inventory users not yet on the team
  const searchSuggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    const existingSet = new Set(members.map(m => m.user_id));
    return resourceUsers.filter(u => {
      if (u.profile_id && existingSet.has(u.profile_id)) return false;
      if (existingSet.has(u.id)) return false;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.role_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [search, resourceUsers, members]);

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

  // Map member user_id to resource_inventory role_name
  const resourceRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    resourceUsers.forEach(u => {
      if (u.profile_id && u.role_name) map.set(u.profile_id, u.role_name);
      if (u.role_name) map.set(u.id, u.role_name);
    });
    return map;
  }, [resourceUsers]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="bg-slate-200" style={{ width: 40, height: 40, borderRadius: '50%' }} />
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
        <div className="flex items-center gap-2 flex-1 rounded-lg" style={{ height: 38, padding: '0 12px', background: '#FFF', border: '1px solid #CBD5E1' }}>
          <Search size={14} color="#94A3B8" className="shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, or email..."
            className="flex-1 bg-transparent p-0 m-0 appearance-none"
            style={{ fontSize: 13, color: '#0F172A', border: 'none', boxShadow: 'none', outline: 'none', WebkitAppearance: 'none', MozAppearance: 'none', background: 'transparent', borderRadius: 0 }}
          />
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 rounded-lg transition-colors hover:opacity-90"
          style={{
            height: 38,
            padding: '0 14px',
            background: '#2563EB',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            color: '#FFF',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <UserPlus size={14} /> Add
        </button>
      </div>

      {/* Search suggestions from resource_inventory */}
      {searchSuggestions.length > 0 && (
        <div className="mx-4 mb-3 rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0', background: '#FFF' }}>
          <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
            Add from directory
          </div>
          {searchSuggestions.map(u => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-slate-50 cursor-pointer group"
              style={{ borderBottom: '1px solid #F8FAFC' }}
              onClick={() => addMember.mutate({ userId: u.id, profileId: u.profile_id, roleName: u.role_name })}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt={u.name} className="flex-shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', background: getColor(u.name), color: '#FFF', fontSize: 11, fontWeight: 700 }}>
                  {initials(u.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  {u.role_name || 'No role'}
                  {u.department_name && <span style={{ color: '#CBD5E1' }}> · </span>}
                  {u.department_name && <span style={{ color: '#94A3B8' }}>{u.department_name}</span>}
                </div>
              </div>
              <button
                className="flex items-center gap-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ height: 26, padding: '0 10px', background: '#2563EB', border: 'none', fontSize: 11, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); addMember.mutate({ userId: u.id, profileId: u.profile_id, roleName: u.role_name }); }}
              >
                <UserPlus size={11} /> Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Existing team members */}
      {grouped.length === 0 && searchSuggestions.length === 0 ? (
        <div className="text-center py-8" style={{ fontSize: 13, color: '#94A3B8' }}>
          {search ? `No team members match "${search}"` : 'No team members assigned'}
          {!search && (
            <div className="mt-3">
              <button
                onClick={() => setShowAddDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-lg"
                style={{ height: 36, padding: '0 16px', background: '#2563EB', border: 'none', fontSize: 12, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}
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
              {/* Category header */}
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.category}</span>
                <span className="rounded-full" style={{ padding: '1px 7px', fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#2563EB' }}>{g.members.length}</span>
                <div className="flex-1" style={{ height: 1, background: '#E2E8F0' }} />
              </div>

              {/* Members */}
              <div className="space-y-0.5">
                {g.members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 rounded-lg transition-colors hover:bg-slate-50 group" style={{ padding: '10px 10px' }}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.full_name} className="flex-shrink-0" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: '50%', background: getColor(m.full_name), color: '#FFF', fontSize: 13, fontWeight: 700 }}>
                        {initials(m.full_name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: '20px' }}>{m.full_name}</div>
                      <div style={{ fontSize: 12, color: ROLE_COLOR[m.project_role] || '#2563EB', fontWeight: 500, lineHeight: '18px' }}>
                        {m.project_role || 'member'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: '16px' }}>
                        {resourceRoleMap.get(m.user_id) || m.job_role || 'Unassigned'}
                      </div>
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); removeMember.mutate(m.user_id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md flex-shrink-0"
                      style={{ width: 28, height: 28, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer' }}
                      title="Remove member"
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
