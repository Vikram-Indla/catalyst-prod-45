import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingMemberIds: string[]; // user_ids already in project
}

interface ResourceUser {
  id: string;
  name: string;
  profile_id: string | null;
  role_name: string | null;
  department_name: string | null;
  email: string | null;
}

function useResourceUsers() {
  return useQuery({
    queryKey: ['resource-users-for-add'],
    queryFn: async (): Promise<ResourceUser[]> => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, name, profile_id, role_name, department_name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      // Batch fetch emails from profiles for those with profile_id
      const profileIds = (data || []).filter(r => r.profile_id).map(r => r.profile_id!);
      const emailMap = new Map<string, string>();
      if (profileIds.length > 0) {
        for (let i = 0; i < profileIds.length; i += 100) {
          const chunk = profileIds.slice(i, i + 100);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', chunk);
          if (profiles) {
            profiles.forEach(p => emailMap.set(p.id, p.email || ''));
          }
        }
      }

      return (data || []).map(r => ({
        ...r,
        email: r.profile_id ? emailMap.get(r.profile_id) || null : null,
      }));
    },
    staleTime: 5 * 60_000,
  });
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

export function AddMemberDialog({ open, onClose, projectId, existingMemberIds }: Props) {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('contributor');
  const { data: users = [], isLoading } = useResourceUsers();
  const queryClient = useQueryClient();

  const addMember = useMutation({
    mutationFn: async ({ userId, profileId, role }: { userId: string; profileId: string | null; role: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const memberUserId = profileId || userId;

      const { error } = await (supabase as any)
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: memberUserId,
          role: role,
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

  const available = useMemo(() => {
    const existingSet = new Set(existingMemberIds);
    return users.filter(u => {
      // Filter out already-added members
      if (u.profile_id && existingSet.has(u.profile_id)) return false;
      if (existingSet.has(u.id)) return false;
      // Search filter
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        (u.role_name || '').toLowerCase().includes(q) ||
        (u.department_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    });
  }, [users, existingMemberIds, search]);

  const handleAdd = (user: ResourceUser) => {
    addMember.mutate({ userId: user.id, profileId: user.profile_id, role: selectedRole });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px] p-0" style={{ fontFamily: "'Inter', sans-serif" }}>
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle style={{ fontFamily: "'Sora', sans-serif", fontSize: 16 }}>Add Team Member</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-2">
          <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
            Select users from the organization directory to add to this project.
          </p>

          {/* Role selector + Search */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 rounded-md" style={{ height: 34, padding: '0 10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Search size={13} color="#94A3B8" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, role, or department..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 12, color: '#0F172A' }}
                autoFocus
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-[34px] w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* User list */}
        <div className="border-t border-b" style={{ borderColor: '#E2E8F0', maxHeight: 380, overflowY: 'auto' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-10" style={{ fontSize: 13, color: '#94A3B8' }}>
              {search ? `No users match "${search}"` : 'All users are already members'}
            </div>
          ) : (
            <div>
              {available.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-[#F8FAFC] cursor-pointer group"
                  style={{ borderBottom: '1px solid #F8FAFC' }}
                  onClick={() => handleAdd(u)}
                >
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 34, height: 34, background: getColor(u.name), color: '#FFF', fontSize: 11, fontWeight: 700 }}
                  >
                    {getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{u.name}</div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 11, color: '#64748B' }}>{u.role_name || 'No role'}</span>
                      {u.department_name && (
                        <>
                          <span style={{ fontSize: 11, color: '#CBD5E1' }}>·</span>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{u.department_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {u.email && (
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{u.email.split('@')[0]}</span>
                  )}
                  <button
                    className="flex items-center gap-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      height: 26,
                      padding: '0 8px',
                      background: '#2563EB',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#FFF',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={e => { e.stopPropagation(); handleAdd(u); }}
                  >
                    <UserPlus size={11} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between">
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {available.length} user{available.length !== 1 ? 's' : ''} available
          </span>
          <button
            onClick={onClose}
            className="rounded-md"
            style={{ height: 32, padding: '0 16px', background: '#FFF', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 500, color: '#475569', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
