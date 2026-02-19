import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MemberRow } from './MemberRow';

interface MembersTabProps {
  projectId: string;
  currentUserId: string | null;
}

interface MemberData {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
}

export function MembersTab({ projectId, currentUserId }: MembersTabProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);

  // Fetch members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['ph-project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_project_members')
        .select('id, user_id, role')
        .eq('project_id', projectId);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];

      // Fetch profiles for member names/emails
      const userIds = data.map(m => m.user_id);
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return data.map(m => {
        const p = profileMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          name: p?.full_name || p?.email || 'Unknown',
          email: p?.email || '',
        } as MemberData;
      });
    },
    enabled: !!projectId,
  });

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (!error && data) {
        const existingIds = new Set(members.map(m => m.user_id));
        setSearchResults(
          data
            .filter(p => !existingIds.has(p.id))
            .map(p => ({ id: p.id, name: p.full_name || p.email || 'User', email: p.email || '' }))
        );
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, members]);

  const addMember = async (user: { id: string; name: string; email: string }) => {
    try {
      const { error } = await supabase
        .from('ph_project_members')
        .insert({ project_id: projectId, user_id: user.id, role: 'member' } as any);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['ph-project-members', projectId] });
      toast.success(`${user.name} added as Member`);
      setSearchTerm('');
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    }
  };

  const updateRole = async (memberId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('ph_project_members')
        .update({ role } as any)
        .eq('id', memberId);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['ph-project-members', projectId] });
      toast.success('Role updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      const { error } = await supabase
        .from('ph_project_members')
        .delete()
        .eq('id', memberId);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['ph-project-members', projectId] });
      toast.success('Member removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DC2626'];

  return (
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Members ({members.length})
      </h3>

      {/* Add member search */}
      <div className="relative mb-4">
        <div
          className="flex items-center gap-2 rounded-md"
          style={{ height: 40, padding: '0 12px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6 }}
        >
          <Search size={14} color="#94A3B8" strokeWidth={2} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or email to add..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {searchResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-10 max-h-[200px] overflow-y-auto"
            style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,.07)',
            }}
          >
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => addMember(user)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F8FAFC]"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 28, height: 28,
                    background: AVATAR_COLORS[user.name.charCodeAt(0) % AVATAR_COLORS.length],
                    color: '#FFFFFF', fontSize: 11, fontWeight: 600,
                  }}
                >
                  {user.name[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{user.name}</div>
                  <div className="truncate" style={{ fontSize: 11, color: '#64748B' }}>{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Member list */}
      {isLoading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading members...</div>
      ) : members.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No members yet</div>
      ) : (
        <div className="space-y-1">
          {members.map(m => (
            <MemberRow
              key={m.id}
              id={m.id}
              name={m.name}
              email={m.email}
              role={m.role}
              isCurrentUser={m.user_id === currentUserId}
              onRoleChange={updateRole}
              onRemove={removeMember}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
          <strong>Admin</strong> — Full access including settings ·{' '}
          <strong>Member</strong> — Create, edit, and manage work items ·{' '}
          <strong>Viewer</strong> — Read-only access, can add comments
        </p>
      </div>
    </div>
  );
}
