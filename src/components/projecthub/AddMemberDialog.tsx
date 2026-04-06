import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingMemberIds: string[];
}

interface ResourceUser {
  id: string;
  name: string;
  profile_id: string | null;
  role_name: string | null;
  department_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#DC2626', '#16A34A', '#0284C7', '#6366F1'];
function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function useResourceUsers() {
  return useQuery({
    queryKey: ['resource-users-for-add'],
    queryFn: async (): Promise<ResourceUser[]> => {
      const { data, error } = await supabase.from('resource_inventory').select('id, name, profile_id, role_name, department_name').eq('is_active', true).order('name', { ascending: true });
      if (error) throw error;
      const profileIds = (data || []).filter(r => r.profile_id).map(r => r.profile_id!);
      const emailMap = new Map<string, string>();
      const avatarMap = new Map<string, string>();
      if (profileIds.length > 0) {
        for (let i = 0; i < profileIds.length; i += 100) {
          const chunk = profileIds.slice(i, i + 100);
          const { data: profiles } = await supabase.from('profiles').select('id, email, avatar_url').in('id', chunk);
          if (profiles) profiles.forEach(p => { if (p.email) emailMap.set(p.id, p.email); if (p.avatar_url) avatarMap.set(p.id, p.avatar_url); });
        }
      }
      return (data || []).map(r => ({ ...r, email: r.profile_id ? emailMap.get(r.profile_id) || null : null, avatar_url: r.profile_id ? avatarMap.get(r.profile_id) || null : null }));
    },
    staleTime: 5 * 60_000,
  });
}

export function AddMemberDialog({ open, onClose, projectId, existingMemberIds }: Props) {
  const [search, setSearch] = useState('');
  const { data: users = [], isLoading } = useResourceUsers();
  const queryClient = useQueryClient();

  const addMember = useMutation({
    mutationFn: async ({ userId, profileId, roleName }: { userId: string; profileId: string | null; roleName: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const memberUserId = profileId || userId;
      const { error } = await (supabase as any).from('project_members').insert({ project_id: projectId, user_id: memberUserId, role: roleName || 'viewer', status: 'active', added_by: user?.id || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-team'] }); queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Member added to project'); },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) toast.error('This user is already a member of this project');
      else toast.error(`Failed to add member: ${err.message}`);
    },
  });

  const available = useMemo(() => {
    const existingSet = new Set(existingMemberIds);
    return users.filter(u => {
      if (u.profile_id && existingSet.has(u.profile_id)) return false;
      if (existingSet.has(u.id)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || (u.role_name || '').toLowerCase().includes(q) || (u.department_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [users, existingMemberIds, search]);

  const handleAdd = (user: ResourceUser) => {
    addMember.mutate({ userId: user.id, profileId: user.profile_id, roleName: user.role_name });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px] p-0" style={{ fontFamily: "'Inter', sans-serif" }}>
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle style={{ fontFamily: "'Sora', sans-serif", fontSize: 16 }}>Add Team Member</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-2">
          <p className="text-[#64748B] dark:text-[rgba(255,255,255,0.55)]" style={{ fontSize: 12, marginBottom: 12 }}>
            Select users from the organization directory to add to this project.
          </p>

          <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-transparent border border-[#CBD5E1] dark:border-[rgba(255,255,255,0.10)]" style={{ height: 40, padding: '0 14px' }}>
            <Search size={15} className="text-[#94A3B8] dark:text-[rgba(255,255,255,0.40)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, or email..."
              className="flex-1 bg-transparent outline-none text-[#0F172A] dark:text-[rgba(255,255,255,0.92)] placeholder:text-[#94A3B8] dark:placeholder:text-[rgba(255,255,255,0.40)]"
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        </div>

        <div className="border-t border-[var(--bd-default, #E2E8F0)] dark:border-[rgba(255,255,255,0.08)]" style={{ maxHeight: 380, overflowY: 'auto' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-400 dark:text-[rgba(255,255,255,0.40)]" />
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-10 text-[#94A3B8] dark:text-[rgba(255,255,255,0.40)]" style={{ fontSize: 13 }}>
              {search ? `No users match "${search}"` : 'All users are already members'}
            </div>
          ) : (
            <div>
              {available.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.03)] cursor-pointer group border-b border-[#F1F5F9] dark:border-[rgba(255,255,255,0.08)]"
                  onClick={() => handleAdd(u)}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} className="flex-shrink-0" style={{ width: 36, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 50, borderRadius: '50%', background: getColor(u.name), color: '#FFF', fontSize: 12, fontWeight: 700 }}>
                      {getInitials(u.name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-[#0F172A] dark:text-[rgba(255,255,255,0.92)]" style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px' }}>{u.name}</div>
                    <div className="text-[#64748B] dark:text-[rgba(255,255,255,0.55)]" style={{ fontSize: 11, lineHeight: '16px' }}>
                      {u.role_name || 'No role'}
                      {u.department_name && <span className="text-[#CBD5E1] dark:text-[rgba(255,255,255,0.20)]"> · </span>}
                      {u.department_name && <span className="text-[#94A3B8] dark:text-[rgba(255,255,255,0.40)]">{u.department_name}</span>}
                    </div>
                  </div>

                  {u.email && (
                    <span className="flex-shrink-0 text-[#94A3B8] dark:text-[rgba(255,255,255,0.40)]" style={{ fontSize: 11 }}>{u.email.split('@')[0]}</span>
                  )}

                  <button
                    className="flex items-center gap-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ height: 28, padding: '0 10px', background: 'var(--cp-blue)', border: 'none', fontSize: 11, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); handleAdd(u); }}
                  >
                    <UserPlus size={12} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 flex items-center justify-between border-t border-[var(--bd-default, #E2E8F0)] dark:border-[rgba(255,255,255,0.08)]">
          <span className="text-[#94A3B8] dark:text-[rgba(255,255,255,0.40)]" style={{ fontSize: 11 }}>
            {available.length} user{available.length !== 1 ? 's' : ''} available
          </span>
          <button
            onClick={onClose}
            className="rounded-md bg-white dark:bg-transparent border border-[var(--bd-default, #E2E8F0)] dark:border-[rgba(255,255,255,0.10)] text-[#475569] dark:text-[rgba(255,255,255,0.72)]"
            style={{ height: 32, padding: '0 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}