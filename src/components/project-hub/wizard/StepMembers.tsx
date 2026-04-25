import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface MemberEntry {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

interface StepMembersProps {
  members: MemberEntry[];
  onChange: (members: MemberEntry[]) => void;
}

export function StepMembers({ members, onChange }: StepMembersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      // Search profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (!error && data) {
        const existing = new Set(members.map(m => m.userId));
        setSearchResults(
          data
            .filter(p => !existing.has(p.id))
            .map(p => ({ id: p.id, name: p.full_name || p.email || 'User', email: p.email || '' }))
        );
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, members]);

  const addMember = (user: { id: string; name: string; email: string }) => {
    onChange([...members, { userId: user.id, name: user.name, email: user.email, role: 'member' }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeMember = (userId: string) => {
    onChange(members.filter(m => m.userId !== userId));
  };

  const updateRole = (userId: string, role: MemberEntry['role']) => {
    onChange(members.map(m => m.userId === userId ? { ...m, role } : m));
  };

  const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DC2626'];

  return (
    <div className="space-y-4">
      {/* Info note */}
      <div
        className="flex items-center gap-2 rounded-lg bg-[var(--cp-blue-wash)]"
        style={{ padding: '8px 12px', fontSize: 12, color: 'var(--cp-blue)' }}
      >
        <span style={{ fontWeight: 500 }}>ℹ</span>
        You will be added as Admin automatically.
      </div>

      {/* Search */}
      <div className="relative">
        <div
          className="flex items-center gap-2 rounded-md bg-[var(--bg-app)]"
          style={{
            height: 40,
            padding: '8px 12px',
            border: '1px solid var(--divider)',
            borderRadius: 6,
          }}
        >
          <Search size={14} color="var(--fg-4)" strokeWidth={2} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
          />
        </div>

        {/* Results dropdown */}
        {searchResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-10 max-h-[200px] overflow-y-auto bg-[var(--cp-float)]"
            style={{
              border: '1px solid var(--divider)',
              borderRadius: 8,
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
                    width: 28,
                    height: 28,
                    background: AVATAR_COLORS[user.name.charCodeAt(0) % AVATAR_COLORS.length],
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {user.name[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{user.name}</div>
                  <div className="truncate" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Members list */}
      {members.length > 0 && (
        <div className="space-y-1">
          {members.map(member => (
            <div
              key={member.userId}
              className="flex items-center gap-3 rounded-md px-3 bg-[var(--bg-1)]"
              style={{ height: 44 }}
            >
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  background: AVATAR_COLORS[member.name.charCodeAt(0) % AVATAR_COLORS.length],
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {member.name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{member.name}</div>
                <div className="truncate" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{member.email}</div>
              </div>
              <select
                value={member.role}
                onChange={e => updateRole(member.userId, e.target.value as MemberEntry['role'])}
                style={{
                  height: 28,
                  padding: '0 6px',
                  fontSize: 11,
                  fontWeight: 500,
                  border: '1px solid var(--divider)',
                  borderRadius: 4,
                  color: 'var(--fg-2)',
                  cursor: 'pointer',
                }}
                className="bg-[var(--bg-app)]"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={() => removeMember(member.userId)}
                className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bd-default, #E2E8F0)]"
                style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={14} color="var(--fg-4)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--fg-4)', textAlign: 'center', padding: '20px 0' }}>
          No additional members added. You can add them later from project settings.
        </div>
      )}
    </div>
  );
}
